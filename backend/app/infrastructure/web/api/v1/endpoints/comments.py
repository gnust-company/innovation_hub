"""Comment endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.dto.comment_dto import (
    CommentListResponseDTO,
    CommentResponseDTO,
    CreateCommentDTO,
    UpdateCommentDTO,
)
from app.application.services.notification_service import NotificationService
from app.application.use_cases.comment.add_comment import AddCommentUseCase
from app.application.use_cases.comment.delete_comment import DeleteCommentUseCase
from app.infrastructure.database.repositories.comment_repository_impl import SQLCommentRepository
from app.infrastructure.database.repositories.idea_repository_impl import SQLIdeaRepository
from app.infrastructure.database.repositories.event_idea_repository_impl import SQLEventIdeaRepository
from app.infrastructure.database.repositories.event_repository_impl import SQLEventRepository
from app.infrastructure.database.repositories.notification_repository_impl import (
    SQLNotificationRepository,
)
from app.infrastructure.database.repositories.problem_repository_impl import SQLProblemRepository
from app.infrastructure.database.repositories.reaction_repository_impl import SQLReactionRepository
from app.infrastructure.database.repositories.user_repository_impl import SQLUserRepository
from app.infrastructure.database.repositories.vote_repository_impl import SQLVoteRepository
from app.infrastructure.security.jwt import get_current_active_user, UserResponseDTO
from app.infrastructure.web.api import deps

router = APIRouter()

EVENT_TITLE_SEPARATOR = " · Event: "


async def enrich_comment(comment, user_repo: SQLUserRepository) -> CommentResponseDTO:
    """Enrich a comment entity with author info."""
    author = await user_repo.get_by_id(comment.author_id)
    return CommentResponseDTO(
        id=comment.id,
        target_id=comment.target_id,
        target_type=comment.target_type,
        content=comment.content,
        author_id=comment.author_id,
        author={
            "id": str(author.id),
            "username": author.username,
            "full_name": author.full_name,
            "avatar_url": author.avatar_url,
        } if author else None,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


async def enrich_comments(
    comments: list, user_repo: SQLUserRepository
) -> list[CommentResponseDTO]:
    """Enrich multiple comments with author info."""
    enriched = []
    for comment in comments:
        enriched.append(await enrich_comment(comment, user_repo))
    return enriched


@router.get("", response_model=CommentListResponseDTO)
async def list_comments(
    target_id: UUID,
    target_type: str,
    page: int = 1,
    limit: int = 20,
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
):
    """List comments for a target (problem or idea)."""
    comments, total = await comment_repo.list_by_target(target_id, target_type, page, limit)
    items = await enrich_comments(comments, user_repo)
    return CommentListResponseDTO(items=items, total=total, page=page, limit=limit)


@router.post("", response_model=CommentResponseDTO, status_code=status.HTTP_201_CREATED)
async def create_comment(
    data: CreateCommentDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    event_idea_repo: SQLEventIdeaRepository = Depends(deps.get_event_idea_repo),
    event_repo: SQLEventRepository = Depends(deps.get_event_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """Create a new comment."""
    use_case = AddCommentUseCase(comment_repo)
    comment = await use_case.execute(data, current_user.id)

    # Auto-transition: open → discussing when non-author comments on a problem
    target_title = ""
    owner_id = None
    event_idea = None
    if data.target_type == "problem":
        from app.domain.value_objects.status import ProblemStatus

        problem = await problem_repo.get_by_id(data.target_id)
        if problem:
            target_title = problem.title
            owner_id = problem.author_id
            if (
                problem.status == ProblemStatus.OPEN
                and problem.author_id != current_user.id
            ):
                problem.transition_to(ProblemStatus.DISCUSSING)
                await problem_repo.update(problem)
    elif data.target_type == "idea":
        idea = await idea_repo.get_by_id(data.target_id)
        if idea:
            target_title = idea.title
            owner_id = idea.author_id
    elif data.target_type == "event_idea":
        event_idea = await event_idea_repo.get_by_id(data.target_id)
        if event_idea:
            target_title = event_idea.title
            event = await event_repo.get_by_id(event_idea.event_id)
            if event:
                target_title = (
                    f"{event_idea.title}{EVENT_TITLE_SEPARATOR}{event.title}"
                )
            owner_id = event_idea.author_id

    # Create notification with truncated comment content
    if owner_id:
        svc = NotificationService(
            notification_repo, user_repo, comment_repo, reaction_repo, vote_repo
        )
        action_detail = svc.truncate_comment(data.content)
        await svc.notify(
            actor_id=current_user.id,
            target_id=data.target_id,
            target_type=data.target_type,
            target_title=target_title,
            notification_type="comment_added",
            owner_id=owner_id,
            action_detail=action_detail,
            reference_id=event_idea.event_id if data.target_type == "event_idea" and event_idea else None,
        )

    return await enrich_comment(comment, user_repo)


@router.patch("/{comment_id}", response_model=CommentResponseDTO)
async def update_comment(
    comment_id: UUID,
    data: UpdateCommentDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
):
    """Update a comment."""
    comment = await comment_repo.get_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own comments",
        )

    comment.update_content(data.content)
    updated = await comment_repo.update(comment)
    return await enrich_comment(updated, user_repo)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
):
    """Delete a comment."""
    use_case = DeleteCommentUseCase(comment_repo)
    success = await use_case.execute(
        comment_id, current_user.id, current_user.role == "admin"
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return None
