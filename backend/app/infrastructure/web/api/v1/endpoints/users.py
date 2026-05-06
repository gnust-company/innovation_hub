"""User endpoints."""
import logging
import secrets
import string
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.dto.user_dto import (
    AdminUpdateUserDTO,
    UpdateUserDTO,
    UserResponseDTO,
    UserListResponseDTO,
    UserStatsDTO,
)
from app.domain.value_objects.role import UserRole
from app.infrastructure.database.models.problem_model import ProblemModel
from app.infrastructure.database.models.idea_model import IdeaModel
from app.infrastructure.database.models.comment_model import CommentModel
from app.infrastructure.database.models.room_model import RoomModel
from app.infrastructure.database.repositories.user_repository_impl import SQLUserRepository
from app.infrastructure.security.jwt import get_current_active_user, require_admin, UserResponseDTO as AuthUser
from app.infrastructure.security.password import PasswordHasher
from app.infrastructure.web.api import deps
from app.application.services.agent_proxy_service import AgentProxyService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/me", response_model=UserResponseDTO)
async def get_current_user_info(
    current_user: AuthUser = Depends(get_current_active_user)
):
    """Get current user info."""
    return current_user


@router.get("", response_model=UserListResponseDTO)
async def list_users(
    page: int = 1,
    limit: int = 20,
    role: str = None,
    team: str = None,
    search: str = None,
    is_active: bool = None,
    user_repo: SQLUserRepository = Depends(deps.get_user_repo)
):
    """List users with pagination and filters."""
    filters = {}
    if role:
        filters["role"] = role
    if team:
        filters["team"] = team
    if search:
        filters["search"] = search
    if is_active is not None:
        filters["is_active"] = is_active

    users, total = await user_repo.list(filters=filters or None, page=page, limit=limit)
    return UserListResponseDTO(
        items=[UserResponseDTO.model_validate(u) for u in users],
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{user_id}", response_model=UserResponseDTO)
async def get_user(
    user_id: UUID,
    user_repo: SQLUserRepository = Depends(deps.get_user_repo)
):
    """Get a user by ID."""
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponseDTO.model_validate(user)


@router.get("/{user_id}/stats", response_model=UserStatsDTO)
async def get_user_stats(
    user_id: UUID,
    session: AsyncSession = Depends(deps.get_db_session),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
):
    """Get user activity statistics."""
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    uid = str(user_id)
    problems_count = await session.scalar(
        select(func.count()).select_from(ProblemModel).where(ProblemModel.author_id == uid)
    )
    ideas_count = await session.scalar(
        select(func.count()).select_from(IdeaModel).where(IdeaModel.author_id == uid)
    )
    comments_count = await session.scalar(
        select(func.count()).select_from(CommentModel).where(CommentModel.author_id == uid)
    )
    rooms_count = await session.scalar(
        select(func.count()).select_from(RoomModel).where(RoomModel.created_by == uid)
    )

    return UserStatsDTO(
        problems_count=problems_count or 0,
        ideas_count=ideas_count or 0,
        comments_count=comments_count or 0,
        rooms_count=rooms_count or 0,
    )


@router.patch("/me", response_model=UserResponseDTO)
async def update_current_user(
    data: UpdateUserDTO,
    current_user: AuthUser = Depends(get_current_active_user),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo)
):
    """Update current user profile."""
    user = await user_repo.get_by_id(current_user.id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.team is not None:
        user.team = data.team
    if data.avatar_url is not None:
        user.avatar_url = data.avatar_url

    updated = await user_repo.update(user)
    return UserResponseDTO.model_validate(updated)


@router.patch("/{user_id}", response_model=UserResponseDTO)
async def admin_update_user(
    user_id: UUID,
    data: AdminUpdateUserDTO,
    current_user: AuthUser = Depends(require_admin),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo)
):
    """Admin: update any user's info, role, or active status."""
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.team is not None:
        user.team = data.team
    if data.role is not None:
        user.role = UserRole(data.role)
    if data.is_active is not None:
        user.is_active = data.is_active

    updated = await user_repo.update(user)
    return UserResponseDTO.model_validate(updated)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_user(
    user_id: UUID,
    current_user: AuthUser = Depends(require_admin),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo)
):
    """Admin: delete a user."""
    if str(current_user.id) == str(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )

    deleted = await user_repo.delete(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )


@router.post("/{user_id}/reset-password")
async def admin_reset_password(
    user_id: UUID,
    current_user: AuthUser = Depends(require_admin),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    password_hasher: PasswordHasher = Depends(deps.get_password_hasher),
):
    """Admin: reset a user's password to a random one."""
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    user.password_hash = password_hasher.hash(new_password)

    await user_repo.update(user)
    return {"new_password": new_password}


# ── LLM API Key management ──────────────────────────────────────────────────

class LlmApiKeyInput(BaseModel):
    llm_api_key: str = Field(min_length=8, max_length=255)


@router.put("/me/llm-api-key")
async def save_llm_api_key(
    data: LlmApiKeyInput,
    current_user: AuthUser = Depends(get_current_active_user),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    agent_proxy: AgentProxyService = Depends(deps.get_agent_proxy_service),
):
    """Save and validate the current user's LLM API key."""
    user = await user_repo.get_by_id(current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.llm_api_key = data.llm_api_key
    user.updated_at = datetime.utcnow()
    await user_repo.update(user)

    # Validate with 30s timeout
    try:
        result = await agent_proxy.validate_key(data.llm_api_key, timeout=30)
    except Exception as e:
        logger.warning("Key validation timed out or failed: %s", e)
        return {"saved": True, "valid": False, "reason": "timeout"}

    if result.get("valid"):
        return {"saved": True, "valid": True}

    return {"saved": True, "valid": False, "reason": result.get("reason", "error"), "detail": result.get("detail")}


@router.delete("/me/llm-api-key", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_api_key(
    current_user: AuthUser = Depends(get_current_active_user),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
):
    """Delete the current user's LLM API key."""
    user = await user_repo.get_by_id(current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.llm_api_key = None
    user.updated_at = datetime.utcnow()
    await user_repo.update(user)


@router.get("/me/llm-api-key")
async def check_llm_api_key(
    current_user: AuthUser = Depends(get_current_active_user),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
):
    """Check if the current user has an LLM API key configured."""
    user = await user_repo.get_by_id(current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"has_key": bool(user.llm_api_key)}


@router.post("/me/validate-llm-key")
async def validate_llm_api_key(
    current_user: AuthUser = Depends(get_current_active_user),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    agent_proxy: AgentProxyService = Depends(deps.get_agent_proxy_service),
):
    """Validate the current user's LLM API key via Agent BE."""
    user = await user_repo.get_by_id(current_user.id)
    if not user or not user.llm_api_key:
        return {"valid": False, "error": "No API key configured"}
    try:
        result = await agent_proxy.validate_key(user.llm_api_key)
        return result
    except Exception as e:
        logger.error("Key validation failed: %s", e)
        return {"valid": False, "error": str(e)}
