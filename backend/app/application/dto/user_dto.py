"""User DTOs for crossing layer boundaries."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.domain.value_objects.role import UserRole


# Input DTOs
class CreateUserDTO(BaseModel):
    """Input for creating a user."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    team: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=255)


class UpdateUserDTO(BaseModel):
    """Input for updating a user."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    team: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class AdminUpdateUserDTO(BaseModel):
    """Input for admin updating a user."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    team: Optional[str] = Field(None, max_length=50)
    role: Optional[str] = Field(None, pattern=r'^(member|admin)$')
    is_active: Optional[bool] = None


class UserStatsDTO(BaseModel):
    """Output for user statistics."""
    problems_count: int = 0
    ideas_count: int = 0
    comments_count: int = 0
    rooms_count: int = 0


class UserListFiltersDTO(BaseModel):
    """Filters for listing users."""
    role: Optional[UserRole] = None
    team: Optional[str] = None
    is_active: Optional[bool] = None
    search: Optional[str] = None


# Output DTOs
class UserResponseDTO(BaseModel):
    """Output for user data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole
    team: Optional[str] = None
    avatar_url: Optional[str] = None
    llm_api_key_set: bool = False
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @field_validator('email', mode='before')
    @classmethod
    def convert_email_to_str(cls, v):
        """Convert Email value object to string."""
        if v is None:
            return None
        if hasattr(v, 'value'):
            return v.value
        return str(v)
    
    @field_validator('role', mode='before')
    @classmethod
    def convert_role_to_enum(cls, v):
        """Convert role to UserRole enum."""
        if isinstance(v, UserRole):
            return v
        if isinstance(v, str):
            return UserRole(v)
        return UserRole(str(v))


class UserListResponseDTO(BaseModel):
    """Output for paginated user list."""
    items: List[UserResponseDTO]
    total: int
    page: int
    limit: int
