"""Problem endpoints."""
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.application.dto.problem_dto import (
    CreateProblemDTO,
    UpdateProblemDTO,
    ProblemListFiltersDTO,
    ProblemResponseDTO,
    ProblemListResponseDTO,
)
from app.application.dto.room_dto import RoomResponseDTO
from app.application.services.response_enrichment import enrich_problem, enrich_problems, enrich_room
from app.application.use_cases.problem.create_problem import CreateProblemUseCase
from app.application.use_cases.problem.update_problem import UpdateProblemUseCase
from app.application.use_cases.problem.delete_problem import DeleteProblemUseCase
from app.application.use_cases.room.create_room import CreateRoomUseCase
from app.application.services.notification_service import NotificationService
from app.infrastructure.database.repositories.problem_repository_impl import SQLProblemRepository
from app.infrastructure.database.repositories.user_repository_impl import SQLUserRepository
from app.infrastructure.database.repositories.reaction_repository_impl import SQLReactionRepository
from app.infrastructure.database.repositories.comment_repository_impl import SQLCommentRepository
from app.infrastructure.database.repositories.room_repository_impl import SQLRoomRepository
from app.infrastructure.database.repositories.idea_repository_impl import SQLIdeaRepository
from app.infrastructure.database.repositories.notification_repository_impl import SQLNotificationRepository
from app.infrastructure.database.repositories.vote_repository_impl import SQLVoteRepository
from app.infrastructure.security.jwt import get_current_active_user, UserResponseDTO
from app.infrastructure.web.api import deps

router = APIRouter()


async def _get_optional_user_id(request: Request) -> Optional[UUID]:
    """Extract user ID from token if present, without raising on missing auth."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.replace("Bearer ", "")
    try:
        from app.application.services.jwt_service import JWTService
        jwt_service = JWTService()
        payload = jwt_service.verify_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        return UUID(user_id) if user_id else None
    except Exception:
        return None


async def _get_optional_user_info(request: Request) -> tuple[Optional[UUID], bool]:
    """Extract user ID and is_admin from token if present."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, False
    token = auth_header.replace("Bearer ", "")
    try:
        from app.application.services.jwt_service import JWTService
        jwt_service = JWTService()
        payload = jwt_service.verify_token(token)
        if payload.get("type") != "access":
            return None, False
        user_id = payload.get("sub")
        role = payload.get("role", "member")
        return (UUID(user_id) if user_id else None), role == "admin"
    except Exception:
        return None, False


@router.get("", response_model=ProblemListResponseDTO)
async def list_problems(
    request: Request,
    filters: ProblemListFiltersDTO = Depends(),
    page: int = 1,
    limit: int = 20,
    date_from: Optional[date] = Query(None, description="Start date (inclusive), e.g. 2026-01-01"),
    date_to: Optional[date] = Query(None, description="End date (inclusive), e.g. 2026-03-31"),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
):
    """List problems with pagination, filters, and enriched data."""
    current_user_id, is_admin = await _get_optional_user_info(request)
    filter_dict = filters.model_dump(exclude_none=True)
    if date_from:
        filter_dict["created_after"] = datetime.combine(date_from, datetime.min.time())
    if date_to:
        filter_dict["created_before"] = datetime.combine(date_to + timedelta(days=1), datetime.min.time())
    # Add privacy filter info
    if current_user_id:
        filter_dict["current_user_id"] = current_user_id
        filter_dict["is_admin"] = is_admin
    problems, total = await problem_repo.list(filter_dict, page, limit)
    items = await enrich_problems(
        problems, user_repo, reaction_repo, comment_repo, current_user_id, room_repo
    )
    return ProblemListResponseDTO(items=items, total=total, page=page, limit=limit)


@router.post("", response_model=ProblemResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_problem(
    data: CreateProblemDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
):
    """Create a new problem."""
    use_case = CreateProblemUseCase(problem_repo)
    problem = await use_case.execute(data, current_user.id)
    return await enrich_problem(
        problem, user_repo, reaction_repo, comment_repo, current_user.id, room_repo
    )


@router.get("/{problem_id}", response_model=ProblemResponseDTO)
async def get_problem(
    problem_id: UUID,
    request: Request,
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
):
    """Get a problem by ID with enriched data."""
    current_user_id, is_admin = await _get_optional_user_info(request)
    problem = await problem_repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )
    # Privacy check: only author, shared users, and admins can see private problems
    if not problem.is_visible_to(current_user_id or UUID(int=0), is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this problem",
        )
    return await enrich_problem(
        problem, user_repo, reaction_repo, comment_repo, current_user_id, room_repo
    )


@router.patch("/{problem_id}", response_model=ProblemResponseDTO)
async def update_problem(
    problem_id: UUID,
    data: UpdateProblemDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """Update a problem."""
    # Get old status before update
    old_problem = await problem_repo.get_by_id(problem_id)
    old_status = old_problem.status if old_problem else None

    use_case = UpdateProblemUseCase(problem_repo)
    problem = await use_case.execute(
        problem_id, data, current_user.id, current_user.role == "admin"
    )

    # Notify on status change
    if data.status and old_status and str(data.status) != str(old_status):
        svc = NotificationService(
            notification_repo, user_repo, comment_repo, reaction_repo, vote_repo
        )
        action_detail = f"{old_status.value} → {data.status.value}"
        await svc.notify(
            actor_id=current_user.id,
            target_id=problem_id,
            target_type="problem",
            target_title=problem.title,
            notification_type="status_changed",
            owner_id=problem.author_id,
            action_detail=action_detail,
        )

    return await enrich_problem(
        problem, user_repo, reaction_repo, comment_repo, current_user.id, room_repo
    )


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    problem_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
):
    """Delete a problem."""
    use_case = DeleteProblemUseCase(problem_repo)
    success = await use_case.execute(
        problem_id, current_user.id, current_user.role == "admin"
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Problem not found",
        )
    return None


# --- Sub-resource: create room from problem (1-click brainstorm) ---

class CreateRoomFromProblemRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    visibility: Optional[str] = "public"
    shared_user_ids: Optional[list[UUID]] = None


@router.post(
    "/{problem_id}/rooms",
    response_model=RoomResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_room_from_problem(
    problem_id: UUID,
    data: CreateRoomFromProblemRequest,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
):
    """Create a brainstorm room linked to a problem (1-click flow).

    Automatically transitions the problem status to 'brainstorming'.
    """
    problem = await problem_repo.get_by_id(problem_id)
    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found"
        )
    # Privacy check: only author, shared users, and admins can create room from private problem
    if not problem.is_visible_to(current_user.id, current_user.role == "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create a room for this problem",
        )

    # Block room creation for terminal statuses
    from app.domain.value_objects.status import ProblemStatus
    if problem.status in (ProblemStatus.SOLVED, ProblemStatus.CLOSED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create room for a problem with status '{problem.status.value}'",
        )

    # Check duplicate room name within same problem
    existing_rooms = await room_repo.list_by_problem_id(problem_id)
    if any(r.name == data.name for r in existing_rooms):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A room named '{data.name}' already exists for this problem",
        )

    # Transition problem status to brainstorming
    try:
        problem.transition_to(ProblemStatus.BRAINSTORMING)
        await problem_repo.update(problem)
    except ValueError:
        pass  # Already in brainstorming or later status

    # Create the room
    from app.application.dto.room_dto import CreateRoomDTO
    room_dto = CreateRoomDTO(
        name=data.name,
        description=data.description,
        problem_id=problem_id,
        visibility=data.visibility,
        shared_user_ids=data.shared_user_ids,
    )
    use_case = CreateRoomUseCase(room_repo)
    room = await use_case.execute(room_dto, current_user.id)

    return await enrich_room(room, user_repo, idea_repo)
