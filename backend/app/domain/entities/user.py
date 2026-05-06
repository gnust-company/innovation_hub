"""User entity - Pure business logic, no infrastructure dependencies."""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from app.domain.value_objects.email import Email
from app.domain.value_objects.role import UserRole


@dataclass
class User:
    """Domain entity representing a user in the system."""
    username: str
    password_hash: str
    id: UUID = field(default_factory=uuid4)
    email: Optional[Email] = None
    full_name: Optional[str] = None
    role: UserRole = field(default=UserRole.MEMBER)
    team: Optional[str] = None
    avatar_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    is_active: bool = field(default=True)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    def deactivate(self) -> None:
        """Deactivate user account."""
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def activate(self) -> None:
        """Activate user account."""
        self.is_active = True
        self.updated_at = datetime.utcnow()
    
    def update_profile(
        self,
        full_name: Optional[str] = None,
        email: Optional[Email] = None,
        team: Optional[str] = None,
        avatar_url: Optional[str] = None
    ) -> None:
        """Update user profile information."""
        if full_name is not None:
            self.full_name = full_name
        if email is not None:
            self.email = email
        if team is not None:
            self.team = team
        if avatar_url is not None:
            self.avatar_url = avatar_url
        self.updated_at = datetime.utcnow()
    
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN

    @property
    def llm_api_key_set(self) -> bool:
        """Whether the user has configured an LLM API key."""
        return bool(self.llm_api_key)
    
    def set_role(self, role: UserRole) -> None:
        """Set user role."""
        self.role = role
        self.updated_at = datetime.utcnow()
