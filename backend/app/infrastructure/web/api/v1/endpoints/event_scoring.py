"""Event scoring endpoints."""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.application.dto.event_scoring_dto import (
    CreateCriteriaDTO,
    CriteriaResponseDTO,
    ScoreInputDTO,
    ScoreResponseDTO,
    ScoreListResponseDTO,
)
from app.application.services.notification_delivery_service import (
    NotificationDeliveryService,
)
from app.application.use_cases.event_scoring.create_criteria import CreateCriteriaUseCase
from app.application.use_cases.event_scoring.list_criteria import ListCriteriaUseCase
from app.application.use_cases.event_scoring.submit_score import SubmitScoreUseCase
from app.application.use_cases.event_scoring.update_score import UpdateScoreUseCase
from app.application.use_cases.event_scoring.list_scores import ListScoresUseCase
from app.core.exceptions import (
    NotFoundException,
    ForbiddenException,
    ConflictException,
    ValidationException,
)
from app.domain.entities.notification import Notification
from app.infrastructure.database.repositories.event_repository_impl import SQLEventRepository
from app.infrastructure.database.repositories.event_idea_repository_impl import SQLEventIdeaRepository
from app.infrastructure.database.repositories.event_team_repository_impl import SQLEventTeamRepository
from app.infrastructure.database.repositories.event_scoring_criteria_repository_impl import SQLEventScoringCriteriaRepository
from app.infrastructure.database.repositories.event_score_repository_impl import SQLEventScoreRepository
from app.infrastructure.database.repositories.notification_repository_impl import SQLNotificationRepository
from app.infrastructure.database.repositories.user_repository_impl import SQLUserRepository
from app.infrastructure.security.jwt import get_current_active_user, UserResponseDTO
from app.infrastructure.web.api import deps

logger = logging.getLogger(__name__)

router = APIRouter()
EVENT_TITLE_SEPARATOR = " · Event: "


def _handle_exceptions(exc):
    """Map domain exceptions to HTTP exceptions."""
    if isinstance(exc, (NotFoundException, ForbiddenException)):
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    if isinstance(exc, ConflictException):
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    if isinstance(exc, ValidationException):
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    raise exc


# --- Criteria endpoints ---


@router.get("/criteria", response_model=list[CriteriaResponseDTO])
async def list_criteria(
    event_id: UUID,
    event_repo: SQLEventRepository = Depends(deps.get_event_repo),
    criteria_repo: SQLEventScoringCriteriaRepository = Depends(deps.get_event_scoring_criteria_repo),
):
    """View scoring criteria for an event. Auto-seeds defaults if none exist."""
    use_case = ListCriteriaUseCase(event_repo, criteria_repo)
    try:
        criteria = await use_case.execute(event_id)
    except NotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

    if not criteria:
        create_uc = CreateCriteriaUseCase(event_repo, criteria_repo)
        try:
            criteria = await create_uc.execute(event_id, None, is_admin=True)
        except ConflictException:
            criteria = await use_case.execute(event_id)

    return criteria


# --- Score endpoints ---


@router.post("/ideas/{idea_id}/scores", response_model=ScoreResponseDTO, status_code=status.HTTP_201_CREATED)
async def submit_score(
    event_id: UUID,
    idea_id: UUID,
    data: ScoreInputDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    event_repo: SQLEventRepository = Depends(deps.get_event_repo),
    idea_repo: SQLEventIdeaRepository = Depends(deps.get_event_idea_repo),
    team_repo: SQLEventTeamRepository = Depends(deps.get_event_team_repo),
    criteria_repo: SQLEventScoringCriteriaRepository = Depends(deps.get_event_scoring_criteria_repo),
    score_repo: SQLEventScoreRepository = Depends(deps.get_event_score_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
):
    """Submit scores for an idea. Team Lead only (can_score = true)."""
    use_case = SubmitScoreUseCase(event_repo, idea_repo, team_repo, criteria_repo, score_repo)
    try:
        score = await use_case.execute(event_id, idea_id, data.criteria_scores, data.criteria_notes, current_user.id)
    except (NotFoundException, ForbiddenException, ValidationException) as e:
        _handle_exceptions(e)

    # Enrich with team info
    team = await team_repo.get_team_by_id(score.scorer_team_id)

    # Notify idea team's leader + idea author
    try:
        idea = await idea_repo.get_by_id(idea_id)
        event = await event_repo.get_by_id(event_id)
        all_criteria = await criteria_repo.list_by_event(event_id)
        max_total = sum(c.max_score * c.weight for c in all_criteria)
        scorer_team = team

        recipients = set()
        if idea:
            if idea.author_id != current_user.id:
                recipients.add(idea.author_id)
            idea_team = await team_repo.get_team_by_id(idea.team_id)
            if idea_team and idea_team.leader_id != current_user.id:
                recipients.add(idea_team.leader_id)

        target_title = idea.title if idea else ""
        if idea and event:
            target_title = f"{idea.title}{EVENT_TITLE_SEPARATOR}{event.title}"

        score_detail = (
            f"{score.total_score}/{max_total} từ {scorer_team.name}"
            if scorer_team
            else f"{score.total_score}/{max_total}"
        )

        notifications = [
            Notification(
                user_id=uid,
                actor_id=current_user.id,
                type="event_scored",
                target_id=idea_id,
                target_type="event_idea",
                target_title=target_title,
                action_detail=score_detail,
                reference_id=event_id,
            )
            for uid in recipients
        ]
        if notifications:
            await NotificationDeliveryService(notification_repo, user_repo).deliver(
                notifications
            )
    except Exception:
        logger.exception("Failed to send event_scored notification")

    return ScoreResponseDTO(
        id=score.id,
        event_idea_id=score.event_idea_id,
        scorer_team_id=score.scorer_team_id,
        scorer_team={"id": team.id, "name": team.name} if team else None,
        criteria_scores=score.criteria_scores,
        criteria_notes=score.criteria_notes,
        total_score=score.total_score,
        created_at=score.created_at,
        updated_at=score.updated_at,
    )


@router.put("/ideas/{idea_id}/scores", response_model=ScoreResponseDTO)
async def update_score(
    event_id: UUID,
    idea_id: UUID,
    data: ScoreInputDTO,
    current_user: UserResponseDTO = Depends(get_current_active_user),
    event_repo: SQLEventRepository = Depends(deps.get_event_repo),
    idea_repo: SQLEventIdeaRepository = Depends(deps.get_event_idea_repo),
    team_repo: SQLEventTeamRepository = Depends(deps.get_event_team_repo),
    criteria_repo: SQLEventScoringCriteriaRepository = Depends(deps.get_event_scoring_criteria_repo),
    score_repo: SQLEventScoreRepository = Depends(deps.get_event_score_repo),
    user_repo: SQLUserRepository = Depends(deps.get_user_repo),
    notification_repo: SQLNotificationRepository = Depends(deps.get_notification_repo),
):
    """Update scores for an idea. Same permission as submit."""
    use_case = UpdateScoreUseCase(event_repo, idea_repo, team_repo, criteria_repo, score_repo)
    try:
        score = await use_case.execute(event_id, idea_id, data.criteria_scores, data.criteria_notes, current_user.id)
    except (NotFoundException, ForbiddenException, ValidationException) as e:
        _handle_exceptions(e)

    team = await team_repo.get_team_by_id(score.scorer_team_id)

    # Notify idea team's leader + idea author
    try:
        idea = await idea_repo.get_by_id(idea_id)
        event = await event_repo.get_by_id(event_id)
        all_criteria = await criteria_repo.list_by_event(event_id)
        max_total = sum(c.max_score * c.weight for c in all_criteria)
        scorer_team = team

        recipients = set()
        if idea:
            if idea.author_id != current_user.id:
                recipients.add(idea.author_id)
            idea_team = await team_repo.get_team_by_id(idea.team_id)
            if idea_team and idea_team.leader_id != current_user.id:
                recipients.add(idea_team.leader_id)

        target_title = idea.title if idea else ""
        if idea and event:
            target_title = f"{idea.title}{EVENT_TITLE_SEPARATOR}{event.title}"

        score_detail = (
            f"{score.total_score}/{max_total} từ {scorer_team.name}"
            if scorer_team
            else f"{score.total_score}/{max_total}"
        )

        notifications = [
            Notification(
                user_id=uid,
                actor_id=current_user.id,
                type="event_scored",
                target_id=idea_id,
                target_type="event_idea",
                target_title=target_title,
                action_detail=score_detail,
                reference_id=event_id,
            )
            for uid in recipients
        ]
        if notifications:
            await NotificationDeliveryService(notification_repo, user_repo).deliver(
                notifications
            )
    except Exception:
        logger.exception("Failed to send event_scored notification")

    return ScoreResponseDTO(
        id=score.id,
        event_idea_id=score.event_idea_id,
        scorer_team_id=score.scorer_team_id,
        scorer_team={"id": team.id, "name": team.name} if team else None,
        criteria_scores=score.criteria_scores,
        criteria_notes=score.criteria_notes,
        total_score=score.total_score,
        created_at=score.created_at,
        updated_at=score.updated_at,
    )


@router.get("/ideas/{idea_id}/scores", response_model=ScoreListResponseDTO)
async def list_scores(
    event_id: UUID,
    idea_id: UUID,
    event_repo: SQLEventRepository = Depends(deps.get_event_repo),
    idea_repo: SQLEventIdeaRepository = Depends(deps.get_event_idea_repo),
    team_repo: SQLEventTeamRepository = Depends(deps.get_event_team_repo),
    score_repo: SQLEventScoreRepository = Depends(deps.get_event_score_repo),
):
    """View all scores for an idea with summary."""
    use_case = ListScoresUseCase(event_repo, idea_repo, team_repo, score_repo)
    try:
        return await use_case.execute(event_id, idea_id)
    except NotFoundException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
