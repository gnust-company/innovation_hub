"""Notification service - creates notifications as side effects of user actions."""
import logging
from typing import List, Optional
from uuid import UUID

from app.domain.entities.notification import Notification
from app.domain.repositories.notification_repository import NotificationRepository
from app.domain.repositories.comment_repository import CommentRepository
from app.domain.repositories.reaction_repository import ReactionRepository
from app.domain.repositories.user_repository import UserRepository
from app.domain.repositories.vote_repository import VoteRepository
from app.application.services.notification_delivery_service import (
    NotificationDeliveryService,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating notifications when actions happen."""

    def __init__(
        self,
        notification_repo: NotificationRepository,
        user_repo: UserRepository,
        comment_repo: CommentRepository,
        reaction_repo: ReactionRepository,
        vote_repo: VoteRepository,
    ):
        self.notification_repo = notification_repo
        self.delivery_service = NotificationDeliveryService(notification_repo, user_repo)
        self.comment_repo = comment_repo
        self.reaction_repo = reaction_repo
        self.vote_repo = vote_repo

    async def _collect_interactors(
        self, target_id: UUID, target_type: str
    ) -> set[UUID]:
        """Collect all user IDs who interacted with a target."""
        user_ids: set[UUID] = set()

        # Users who commented
        comment_authors = await self.comment_repo.list_distinct_authors_by_target(
            target_id, target_type
        )
        user_ids.update(comment_authors)

        # Users who reacted
        reaction_users = await self.reaction_repo.list_distinct_users_by_target(
            target_id, target_type
        )
        user_ids.update(reaction_users)

        # Users who voted (only for ideas)
        if target_type == "idea":
            vote_users = await self.vote_repo.list_distinct_users_by_idea(target_id)
            user_ids.update(vote_users)

        return user_ids

    async def notify(
        self,
        actor_id: UUID,
        target_id: UUID,
        target_type: str,
        target_title: str,
        notification_type: str,
        owner_id: UUID,
        action_detail: Optional[str] = None,
        reference_id: Optional[UUID] = None,
    ) -> None:
        """Create notifications for the owner and all interactors of a target.

        Args:
            actor_id: The user who performed the action.
            target_id: The problem or idea ID.
            target_type: 'problem', 'idea', or 'event_idea'.
            target_title: Title for display.
            notification_type: comment_added, reaction_added, vote_added, status_changed.
            owner_id: The author_id of the target problem/idea.
            action_detail: Optional detail about the action (comment content, reaction type, etc.)
            reference_id: Optional parent entity ID (e.g. event_id for event_idea notifications).
        """
        try:
            recipients: set[UUID] = set()

            # Always include the owner
            recipients.add(owner_id)

            # Add all interactors
            interactors = await self._collect_interactors(target_id, target_type)
            recipients.update(interactors)

            # Never notify the actor themselves
            recipients.discard(actor_id)

            if not recipients:
                return

            notifications = [
                Notification(
                    user_id=user_id,
                    actor_id=actor_id,
                    type=notification_type,
                    target_id=target_id,
                    target_type=target_type,
                    target_title=target_title,
                    action_detail=action_detail,
                    reference_id=reference_id,
                )
                for user_id in recipients
            ]

            await self.delivery_service.deliver(notifications)
            logger.info(
                "Created %d notifications (type=%s, target=%s/%s)",
                len(notifications),
                notification_type,
                target_type,
                target_id,
            )
        except Exception:
            logger.exception("Failed to create notifications")

    @staticmethod
    def truncate_comment(content: str, max_length: int = 100) -> str:
        """Truncate comment content for notification display.

        Args:
            content: The full comment content.
            max_length: Maximum length before truncation (default: 100).

        Returns:
            Truncated content with '...' if exceeded max_length.
        """
        if len(content) <= max_length:
            return content
        return content[:max_length - 3].rstrip() + "..."
