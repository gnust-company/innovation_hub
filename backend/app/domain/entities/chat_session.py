"""ChatSession entity - Pure business logic, no infrastructure dependencies."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


@dataclass
class ChatSession:
    """Domain entity representing a chat session with the AI Agent."""
    user_id: UUID
    title: str
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    def rename(self, title: str) -> None:
        """Rename the session."""
        self.title = title
        self.updated_at = datetime.utcnow()

    def touch(self) -> None:
        """Update timestamp to reflect recent activity."""
        self.updated_at = datetime.utcnow()

    def is_owned_by(self, user_id: UUID) -> bool:
        """Check if session belongs to user."""
        return self.user_id == user_id
