"""Notification delivery orchestration."""
import asyncio
import logging
from dataclasses import dataclass
from typing import List

from app.application.services.internal_mail_service import get_internal_mail_service
from app.application.services.notification_email_template import (
    build_notification_email,
    build_notification_link,
)
from app.core.config import get_settings
from app.domain.entities.notification import Notification
from app.domain.repositories.notification_repository import NotificationRepository
from app.domain.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)


EMAIL_NOTIFICATION_TYPES = frozenset(
    {
        "comment_added",
        "event_scored",
        "event_join_request",
        "team_disbanded",
    }
)


@dataclass(frozen=True)
class EmailJob:
    target_email: str
    title: str
    content: str


class NotificationDeliveryService:
    """Persist in-app notifications and send best-effort email copies."""

    def __init__(
        self,
        notification_repo: NotificationRepository,
        user_repo: UserRepository,
    ) -> None:
        self.notification_repo = notification_repo
        self.user_repo = user_repo
        self.settings = get_settings()
        self.mail_service = get_internal_mail_service()

    async def deliver(self, notifications: List[Notification]) -> List[Notification]:
        """Create in-app notifications, then send matching emails when enabled."""
        if not notifications:
            return []

        created = await self.notification_repo.create_bulk(notifications)
        try:
            email_jobs = await self._build_email_jobs(created)
            if email_jobs:
                task = asyncio.create_task(self._send_email_jobs(email_jobs))
                task.add_done_callback(self._log_background_email_result)
        except Exception:
            logger.exception("Failed to queue notification email copies")
        return created

    async def _build_email_jobs(
        self, notifications: List[Notification]
    ) -> List[EmailJob]:
        if not self.settings.mail_sender_enabled:
            return []
        if not self.settings.mail_sender_api_key.strip():
            logger.warning("Mail sender enabled but MAIL_SENDER_API_KEY is empty")
            return []
        if not self.settings.app_public_url.strip():
            logger.warning(
                "Mail sender enabled but APP_PUBLIC_URL is empty; skipping emails"
            )
            return []

        email_notifications = [
            n for n in notifications if n.type in EMAIL_NOTIFICATION_TYPES
        ]
        if not email_notifications:
            return []

        user_ids = {n.user_id for n in email_notifications}
        actor_ids = {n.actor_id for n in email_notifications}
        users = await self.user_repo.get_by_ids(list(user_ids | actor_ids))
        users_by_id = {u.id: u for u in users}

        jobs: List[EmailJob] = []
        for notification in email_notifications:
            recipient = users_by_id.get(notification.user_id)
            if not recipient or not recipient.is_active or not recipient.email:
                continue

            link = build_notification_link(notification, self.settings.app_public_url)
            if not link:
                logger.warning(
                    "Cannot build email link for notification %s (%s/%s)",
                    notification.id,
                    notification.target_type,
                    notification.target_id,
                )
                continue

            actor = users_by_id.get(notification.actor_id)
            subject, body = build_notification_email(
                notification, recipient, actor, link
            )
            jobs.append(
                EmailJob(
                    target_email=str(recipient.email),
                    title=subject,
                    content=body,
                )
            )
        return jobs

    async def _send_email_jobs(self, jobs: List[EmailJob]) -> None:
        for job in jobs:
            await self.mail_service.send_html_email(
                target_email=job.target_email,
                title=job.title,
                content=job.content,
            )

    @staticmethod
    def _log_background_email_result(task: asyncio.Task[None]) -> None:
        try:
            task.result()
        except Exception:
            logger.exception("Failed to send background notification email copies")
