"""Reaction endpoints for problems and ideas."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.domain.entities.reaction import Reaction, ReactionType
from app.application.dto.reaction_dto import ReactionResponseDTO
from app.application.services.notification_service import NotificationService
from app.infrastructure.database.repositories.reaction_repository_impl import SQLReactionRepository
from app.infrastructure.database.repositories.problem_repository_impl import SQLProblemRepository
from app.infrastructure.database.repositories.idea_repository_impl import SQLIdeaRepository
from app.infrastructure.database.repositories.comment_repository_impl import SQLCommentRepository
from app.infrastructure.database.repositories.notification_repository_impl import SQLNotificationRepository
from app.infrastructure.database.repositories.user_repository_impl import SQLUserRepository
from app.infrastructure.database.repositories.vote_repository_impl import SQLVoteRepository
from app.infrastructure.security.jwt import get_current_active_user, UserResponseDTO
from app.infrastructure.web.api import deps

problem_reactions_router = APIRouter()
idea_reactions_router = APIRouter()


class ReactionRequest(BaseModel):
    type: ReactionType


# --- Problem Reactions ---

@problem_reactions_router.post(
    "/{problem_id}/reactions",
    response_model=ReactionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def toggle_problem_reaction(
    problem_id: UUID,
    data: ReactionRequest,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    problem_repo: SQLProblemRepository = Depends(deps.get_problem_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """Add or toggle a reaction on a problem.

    - Same type again → remove (toggle off), returns 204.
    - Different type → update to new type.
    - No existing → create new.
    """
    existing = await reaction_repo.get_by_user_and_target(
        current_user.id, problem_id, "problem"
    )

    if existing:
        if existing.type == data.type:
            # Toggle off
            await reaction_repo.delete(existing.id)
            raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)
        # Change type
        existing.change_type(data.type)
        updated = await reaction_repo.update(existing)
        result = ReactionResponseDTO.model_validate(updated)
    else:
        # Create new
        reaction = Reaction(
            target_id=problem_id,
            target_type="problem",
            type=data.type,
            user_id=current_user.id,
        )
        created = await reaction_repo.create(reaction)
        result = ReactionResponseDTO.model_validate(created)

    # Notify (for both new and changed reactions)
    problem = await problem_repo.get_by_id(problem_id)
    if problem:
        svc = NotificationService(
            notification_repo, user_repo, comment_repo, reaction_repo, vote_repo
        )
        await svc.notify(
            actor_id=current_user.id,
            target_id=problem_id,
            target_type="problem",
            target_title=problem.title,
            notification_type="reaction_added",
            owner_id=problem.author_id,
            action_detail=data.type.value,  # "like", "dislike", or "insight"
        )

    return result


@problem_reactions_router.delete(
    "/{problem_id}/reactions",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_problem_reaction(
    problem_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
):
    """Remove current user's reaction from a problem."""
    existing = await reaction_repo.get_by_user_and_target(
        current_user.id, problem_id, "problem"
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reaction found",
        )
    await reaction_repo.delete(existing.id)
    return None


# --- Idea Reactions ---

@idea_reactions_router.post(
    "/{idea_id}/reactions",
    response_model=ReactionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
async def toggle_idea_reaction(
    idea_id: UUID,
    data: ReactionRequest,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
    idea_repo: SQLIdeaRepository = Depends(deps.get_idea_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    comment_repo: SQLCommentRepository = Depends(deps.get_comment_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
    vote_repo: SQLVoteRepository = Depends(deps.get_vote_repo),
):
    """Add or toggle a reaction on an idea."""
    existing = await reaction_repo.get_by_user_and_target(
        current_user.id, idea_id, "idea"
    )

    if existing:
        if existing.type == data.type:
            await reaction_repo.delete(existing.id)
            raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)
        existing.change_type(data.type)
        updated = await reaction_repo.update(existing)
        result = ReactionResponseDTO.model_validate(updated)
    else:
        reaction = Reaction(
            target_id=idea_id,
            target_type="idea",
            type=data.type,
            user_id=current_user.id,
        )
        created = await reaction_repo.create(reaction)
        result = ReactionResponseDTO.model_validate(created)

    # Notify (for both new and changed reactions)
    idea = await idea_repo.get_by_id(idea_id)
    if idea:
        svc = NotificationService(
            notification_repo, user_repo, comment_repo, reaction_repo, vote_repo
        )
        await svc.notify(
            actor_id=current_user.id,
            target_id=idea_id,
            target_type="idea",
            target_title=idea.title,
            notification_type="reaction_added",
            owner_id=idea.author_id,
            action_detail=data.type.value,  # "like", "dislike", or "insight"
        )

    return result


@idea_reactions_router.delete(
    "/{idea_id}/reactions",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_idea_reaction(
    idea_id: UUID,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    reaction_repo: SQLReactionRepository = Depends(deps.get_reaction_repo),
):
    """Remove current user's reaction from an idea."""
    existing = await reaction_repo.get_by_user_and_target(
        current_user.id, idea_id, "idea"
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reaction found",
        )
    await reaction_repo.delete(existing.id)
    return None
