"""Email template helpers for notification delivery."""
from html import escape
from typing import Optional

from app.domain.entities.notification import Notification
from app.domain.entities.user import User


EVENT_TAB_BY_TYPE = {
    "event_created": "introduction",
    "event_closed": "introduction",
    "event_join_request": "teams",
    "event_join_approved": "teams",
    "event_join_rejected": "teams",
    "team_review_assigned": "ideas",
    "team_disbanded": "teams",
    "team_lead_transferred": "teams",
}


SUBJECTS = {
    "comment_added": "Bình luận mới",
    "reaction_added": "Reaction mới",
    "vote_added": "Vote mới",
    "status_changed": "Trạng thái thay đổi",
    "room_idea_created": "Ý tưởng mới",
    "event_join_request": "Yêu cầu tham gia đội",
    "event_join_approved": "Đã được duyệt vào đội",
    "event_join_rejected": "Yêu cầu bị từ chối",
    "event_idea_submitted": "Ý tưởng Event mới",
    "event_scored": "Ý tưởng đã được chấm điểm",
    "event_created": "Event mới",
    "event_closed": "Event đã đóng",
    "team_review_assigned": "Được gán chấm điểm",
    "team_disbanded": "Đội đã giải tán",
    "team_lead_transferred": "Team Lead thay đổi",
}


ICONS = {
    "comment_added": "💬",
    "event_join_request": "🙋",
    "event_scored": "⭐",
    "team_disbanded": "👥",
}


REACTION_LABELS = {
    "like": "like",
    "dislike": "dislike",
    "insight": "insight",
}


TARGET_LABELS = {
    "problem": "Problem",
    "idea": "ý tưởng trong Idea Lab",
    "event_idea": "ý tưởng trong Event",
    "event": "Event",
}


EVENT_TITLE_SEPARATOR = " · Event: "


def build_notification_link(
    notification: Notification, app_public_url: str
) -> Optional[str]:
    """Build absolute frontend link for a notification."""
    base_url = app_public_url.rstrip("/")
    if not base_url:
        return None

    if notification.target_type == "problem":
        return f"{base_url}/problems/{notification.target_id}"
    if notification.target_type == "idea":
        return f"{base_url}/ideas/{notification.target_id}"
    if notification.target_type == "event_idea":
        if not notification.reference_id:
            return None
        return (
            f"{base_url}/events/{notification.reference_id}"
            f"/ideas/{notification.target_id}"
        )
    if notification.target_type == "event":
        tab = EVENT_TAB_BY_TYPE.get(notification.type)
        url = f"{base_url}/events/{notification.target_id}"
        return f"{url}?tab={tab}" if tab else url
    return base_url


def build_notification_email(
    notification: Notification,
    recipient: User,
    actor: Optional[User],
    link: str,
) -> tuple[str, str]:
    """Build subject and concise HTML body for a notification email."""
    label = SUBJECTS.get(notification.type, "Thông báo mới")
    icon = ICONS.get(notification.type, "🔔")
    subject = f"[NO_REPLY][Innovation Hub] {label}"
    message_html = _message_for_notification_html(notification, actor)
    detail = (notification.action_detail or "").strip()

    safe_label = escape(label)
    safe_icon = escape(icon)
    safe_recipient_name = escape(_user_display_name(recipient))
    safe_link = escape(link, quote=True)
    safe_detail = escape(detail)

    detail_html = ""
    if detail and notification.type in {"comment_added", "event_scored"}:
        detail_html = (
            '<blockquote style="border-left:4px solid #2563eb;'
            "margin:12px 0;padding:8px 12px;color:#333;"
            'font-family:Arial,sans-serif;font-size:13px;">'
            f"{safe_detail}"
            "</blockquote>"
        )

    body = f"""
<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
  <h2 style="font-size:18px;margin:0 0 12px 0;">
    <span style="font-size:20px;margin-right:6px;">{safe_icon}</span>{safe_label}
  </h2>
  <p style="font-size:14px;margin:0 0 8px 0;">
    Xin chào <em>{safe_recipient_name}</em>,
  </p>
  <p style="font-size:14px;margin:0 0 12px 0;">
    Đây là thông báo từ nền tảng Innovation Hub.
  </p>
  <p style="font-size:14px;margin:0 0 12px 0;">{message_html}</p>
  {detail_html}
  <p style="font-size:14px;margin:16px 0 0 0;font-style:italic;">
    Để biết thêm chi tiết, vui lòng
    <a href="{safe_link}" style="color:#2563eb;font-weight:bold;text-decoration:none;">
      nhấn vào đây
    </a>!
  </p>
</div>
""".strip()
    return subject, body


def _user_display_name(user: User) -> str:
    return user.full_name or user.username


def _actor_name(actor: Optional[User]) -> str:
    if not actor:
        return "Ai đó"
    return _user_display_name(actor)


def _split_status(detail: Optional[str]) -> tuple[str, str]:
    if not detail or "→" not in detail:
        return "", ""
    old_status, new_status = detail.split("→", 1)
    return old_status.strip(), new_status.strip()


def _strong(value: str) -> str:
    return f"<strong>{escape(value)}</strong>"


def _split_event_idea_title(target_title: str) -> tuple[str, str]:
    if EVENT_TITLE_SEPARATOR not in target_title:
        return target_title, ""
    idea_title, event_title = target_title.split(EVENT_TITLE_SEPARATOR, 1)
    return idea_title.strip(), event_title.strip()


def _message_for_notification_html(
    notification: Notification,
    actor: Optional[User],
) -> str:
    actor_name = escape(_actor_name(actor))
    raw_title = notification.target_title
    title = _strong(raw_title)
    detail = escape(notification.action_detail or "")
    target_label = escape(TARGET_LABELS.get(notification.target_type, "nội dung"))
    event_idea_title = ""
    event_title = ""
    if notification.target_type == "event_idea":
        raw_idea_title, raw_event_title = _split_event_idea_title(raw_title)
        event_idea_title = _strong(raw_idea_title)
        event_title = _strong(raw_event_title) if raw_event_title else ""

    if notification.type == "comment_added":
        if event_idea_title and event_title:
            return (
                f'{actor_name} đã bình luận trên ý tưởng "{event_idea_title}" '
                f'trong Event "{event_title}".'
            )
        return f'{actor_name} đã bình luận trên {target_label} "{title}".'
    if notification.type == "reaction_added":
        raw_reaction = notification.action_detail or ""
        reaction = escape(REACTION_LABELS.get(raw_reaction, raw_reaction))
        return f'{actor_name} đã thả {reaction} trên {target_label} "{title}".'
    if notification.type == "vote_added":
        return f'{actor_name} đã vote {detail} sao cho {target_label} "{title}".'
    if notification.type == "status_changed":
        old_status, new_status = _split_status(detail)
        if old_status and new_status:
            return (
                f'{actor_name} đã chuyển trạng thái {target_label} "{title}" '
                f"từ {old_status} sang {new_status}."
            )
        return f'{actor_name} đã chuyển trạng thái {target_label} "{title}".'
    if notification.type == "room_idea_created":
        return f'{actor_name} đã nộp ý tưởng mới "{title}" trong Idea Lab.'
    if notification.type == "event_join_request":
        return f'{actor_name} muốn tham gia đội "{detail}" trong Event "{title}".'
    if notification.type == "event_join_approved":
        return f'Bạn đã được duyệt vào đội "{detail}" trong Event "{title}".'
    if notification.type == "event_join_rejected":
        return f'Yêu cầu tham gia đội "{detail}" trong Event "{title}" đã bị từ chối.'
    if notification.type == "event_idea_submitted":
        return f'{actor_name} đã nộp ý tưởng Event "{detail}" vào Event "{title}".'
    if notification.type == "event_scored":
        if event_idea_title and event_title:
            if detail:
                return (
                    f'Ý tưởng "{event_idea_title}" trong Event "{event_title}" '
                    f"đã được chấm điểm: {detail}."
                )
            return (
                f'Ý tưởng "{event_idea_title}" trong Event "{event_title}" '
                "đã được chấm điểm."
            )
        if detail:
            return f'Ý tưởng Event "{title}" đã được chấm điểm: {detail}.'
        return f'Ý tưởng Event "{title}" đã được chấm điểm.'
    if notification.type == "event_created":
        return f'{actor_name} đã tạo Event "{title}".'
    if notification.type == "event_closed":
        return f'{actor_name} đã đóng Event "{title}".'
    if notification.type == "team_review_assigned":
        return f'Đội của bạn được gán review đội "{detail}" trong Event "{title}".'
    if notification.type == "team_disbanded":
        return f'Đội "{detail}" trong Event "{title}" đã được giải tán.'
    if notification.type == "team_lead_transferred":
        return f'Team Lead mới là "{detail}" trong Event "{title}".'
    return f'Bạn có thông báo mới liên quan đến {target_label} "{title}".'
