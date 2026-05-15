"""Internal mail sender client."""
import logging
from typing import Optional

import httpx

from app.core.config import get_settings
from app.core.email_policy import (
    allowed_email_domains_message,
    is_allowed_company_email,
)

logger = logging.getLogger(__name__)


class InternalMailService:
    """Best-effort client for the internal mail-sender agent."""

    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = settings.mail_sender_enabled
        self.url = settings.mail_sender_url
        self.api_key = settings.mail_sender_api_key
        self.timeout_seconds = settings.mail_sender_timeout_seconds

    async def send_html_email(
        self,
        target_email: str,
        title: str,
        content: str,
        cc_target_emails: str = "",
        bcc_target_emails: str = "",
    ) -> bool:
        """Send one HTML email. Never raise to business flows."""
        if not self.enabled:
            return False
        if not self.api_key:
            logger.warning("Mail sender enabled but MAIL_SENDER_API_KEY is empty")
            return False
        if not target_email:
            return False
        if not self._all_recipients_allowed(
            target_email, cc_target_emails, bcc_target_emails
        ):
            logger.warning(
                "Blocked mail sender request outside allowed domains. %s",
                allowed_email_domains_message(),
            )
            return False

        payload = {
            "component_inputs": {
                "knox_portal_mail-ex0dP": {
                    "bcc_target_emails": bcc_target_emails,
                    "cc_target_emails": cc_target_emails,
                    "content": content,
                    "target_emails": target_email,
                    "title": title,
                }
            }
        }
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout_seconds)
            ) as client:
                response = await client.post(self.url, json=payload, headers=headers)
                if response.status_code >= 400:
                    logger.warning(
                        "Mail sender returned HTTP %s for %s: %s",
                        response.status_code,
                        target_email,
                        response.text[:300],
                    )
                    return False
                return True
        except httpx.TimeoutException:
            logger.warning("Mail sender timed out for %s", target_email)
        except httpx.HTTPError as exc:
            logger.warning("Mail sender request failed for %s: %s", target_email, exc)
        except Exception:
            logger.exception("Unexpected mail sender error for %s", target_email)
        return False

    @staticmethod
    def _split_recipient_list(value: str) -> list[str]:
        return [
            item.strip()
            for item in value.replace(";", ",").split(",")
            if item.strip()
        ]

    def _all_recipients_allowed(self, *recipient_fields: str) -> bool:
        recipients = []
        for field in recipient_fields:
            recipients.extend(self._split_recipient_list(field))
        return bool(recipients) and all(
            is_allowed_company_email(recipient) for recipient in recipients
        )


_mail_service: Optional[InternalMailService] = None


def get_internal_mail_service() -> InternalMailService:
    """Return module-level mail service singleton."""
    global _mail_service
    if _mail_service is None:
        _mail_service = InternalMailService()
    return _mail_service
