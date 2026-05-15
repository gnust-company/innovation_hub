"""Idea endpoints."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status, Body

from app.application.dto.idea_dto import (
    CreateIdeaDTO,
    UpdateIdeaDTO,
    IdeaListFiltersDTO,
    IdeaResponseDTO,
    IdeaListResponseDTO,
)
from app.application.dto.vote_dto import CreateVoteDTO, VoteResponseDTO
from app.application.services.response_enrichment import enrich_idea, enrich_ideas
from app.application.services.notification_delivery_service import (
    NotificationDeliveryService,
)
from app.application.use_cases.idea.create_idea import CreateIdeaUseCase
from app.application.use_cases.idea.update_idea import UpdateIdeaUseCase
from app.application.use_cases.idea.vote_idea import VoteIdeaUseCase
from app.application.services.notification_service import NotificationService
from app.domain.entities.notification import Notification
from app.infrastructure.database.repositories.idea_repository_impl import SQLIdeaRepository
from app.infrastructure.database.repositories.room_repository_impl import SQLRoomRepository
from app.infrastructure.database.repositories.problem_repository_impl import SQLProblemRepository
from app.infrastructure.database.repositories.vote_repository_impl import SQLVoteRepository
from app.infrastructure.database.repositories.user_repository_impl import SQLUserRepository
from app.infrastructure.database.repositories.reaction_repository_impl import SQLReactionRepository
from app.infrastructure.database.repositories.comment_repository_impl import SQLCommentRepository
from app.infrastructure.database.repositories.notification_repository_impl import SQLNotificationRepository
from app.infrastructure.security.jwt import get_current_active_user, UserResponseDTO
from app.infrastructure.web.api import deps

router = APIRouter()


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


async def _check_room_visibility(
    room_repo: SQLRoomRepository,
    room_id: UUID,
    user_id: Optional[UUID],
    is_admin: bool,
) -> None:
    """Check if user can access a room. Raises 403 if not."""
    room = await room_repo.get_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if not room.is_visible_to(user_id or UUID(int=0), is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this room",
        )


@router.get("", response_model=IdeaListResponseDTO)
async def list_ideas(
    request: Request,
    filters: IdeaListFiltersDTO = Depends(),
    page: int = 1,
    limit: int = 20,
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """List ideas with filtering and enrichment."""
    current_user_id, is_admin = await _get_optional_user_info(request)
    filter_dict = filters.model_dump(exclude_none=True)
    if current_user_id:
        filter_dict["current_user_id"] = current_user_id
        filter_dict["is_admin"] = is_admin
    ideas, total = await idea_repo.list(filter_dict, page, limit)
    items = await enrich_ideas(ideas, user_repo, reaction_repo, comment_repo, vote_repo, current_user_id)
    return IdeaListResponseDTO(items=items, total=total, page=page, limit=limit)


@router.post("", response_model=IdeaResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_idea(
    data: CreateIdeaDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
):
    """Create a new idea in a room."""
    is_admin = current_user.role == "admin"
    await _check_room_visibility(room_repo, data.room_id, current_user.id, is_admin)

    use_case = CreateIdeaUseCase(idea_repo, room_repo)
    idea = await use_case.execute(data, current_user.id)

    # Notify room creator + problem owner (if linked)
    try:
        room = await room_repo.get_by_id(data.room_id)
        recipients = set()
        if room and room.created_by != current_user.id:
            recipients.add(room.created_by)
        if room and room.problem_id:
            problem = await problem_repo.get_by_id(room.problem_id)
            if problem and problem.author_id != current_user.id:
                recipients.add(problem.author_id)
        if recipients:
            await NotificationDeliveryService(notification_repo, user_repo).deliver([
                Notification(
                    user_id=uid,
                    actor_id=current_user.id,
                    type="room_idea_created",
                    target_id=idea.id,
                    target_type="idea",
                    target_title=idea.title,
                    action_detail=idea.title,
                )
                for uid in recipients
            ])
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to send room_idea_created notification")

    return await enrich_idea(
        idea, user_repo, reaction_repo, comment_repo, vote_repo, current_user.id
    )


@router.get("/{idea_id}", response_model=IdeaResponseDTO)
async def get_idea(
    idea_id: UUID,
    request: Request,
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """Get an idea by ID with enriched data."""
    current_user_id, is_admin = await _get_optional_user_info(request)
    idea = await idea_repo.get_by_id(idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    # Check room visibility
    await _check_room_visibility(room_repo, idea.room_id, current_user_id, is_admin)
    return await enrich_idea(
        idea, user_repo, reaction_repo, comment_repo, vote_repo, current_user_id
    )


@router.patch("/{idea_id}", response_model=IdeaResponseDTO)
async def update_idea(
    idea_id: UUID,
    data: UpdateIdeaDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
):
    """Update an idea."""
    old_idea = await idea_repo.get_by_id(idea_id)
    old_status = old_idea.status if old_idea else None

    # Check room visibility
    if old_idea:
        is_admin = current_user.role == "admin"
        await _check_room_visibility(room_repo, old_idea.room_id, current_user.id, is_admin)

    use_case = UpdateIdeaUseCase(idea_repo)
    idea = await use_case.execute(
        idea_id, data, current_user.id, current_user.role == "admin"
    )

    # Notify on status change
    if data.status and old_status and str(data.status) != str(old_status):
        svc = NotificationService(
            notification_repo, user_repo, comment_repo, reaction_repo, vote_repo
        )
        action_detail = f"{old_status.value} → {data.status.value}"
        await svc.notify(
            actor_id=current_user.id,
            target_id=idea_id,
            target_type="idea",
            target_title=idea.title,
            notification_type="status_changed",
            owner_id=idea.author_id,
            action_detail=action_detail,
        )

    return await enrich_idea(
        idea, user_repo, reaction_repo, comment_repo, vote_repo, current_user.id
    )


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
):
    """Delete an idea (author or admin only)."""
    idea = await idea_repo.get_by_id(idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    # Check room visibility
    is_admin = current_user.role == "admin"
    await _check_room_visibility(room_repo, idea.room_id, current_user.id, is_admin)
    if idea.author_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    await idea_repo.delete(idea_id)
    return None


@router.post("/{idea_id}/votes", response_model=VoteResponseDTO, status_code=status.HTTP_201_CREATED)
async def vote_idea(
    idea_id: UUID,
    stars: int = Body(..., embed=True, ge=1, le=5),
    current_user: UserResponseDTO = Depends(get_current_active_user),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    room_repo: SQLRoomRepository = Depends(deps.get_room_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
):
    """Vote on an idea (1-5 stars). Creates or updates existing vote."""
    idea = await idea_repo.get_by_id(idea_id)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found")
    # Check room visibility
    is_admin = current_user.role == "admin"
    await _check_room_visibility(room_repo, idea.room_id, current_user.id, is_admin)

    data = CreateVoteDTO(idea_id=idea_id, stars=stars)
    use_case = VoteIdeaUseCase(vote_repo, idea_repo)
    result = await use_case.execute(data, current_user.id)

    # Notify with stars detail
    svc = NotificationService(
        notification_repo, user_repo, comment_repo, reaction_repo, vote_repo
    )
    await svc.notify(
        actor_id=current_user.id,
        target_id=idea_id,
        target_type="idea",
        target_title=idea.title,
        notification_type="vote_added",
        owner_id=idea.author_id,
        action_detail=str(stars),
    )

    return result


@router.delete("/{idea_id}/votes", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vote(
    idea_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """Remove current user's vote from an idea."""
    existing = await vote_repo.get_by_user_and_idea(current_user.id, idea_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No vote found")
    await vote_repo.delete(existing.id)
    return None
