"""User SQLAlchemy model."""
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.value_objects.role import UserRole
from app.infrastructure.database.models.base import BaseModel

if TYPE_CHECKING:
    from app.infrastructure.database.models.problem_model import ProblemModel
    from app.infrastructure.database.models.room_model import RoomModel
    from app.infrastructure.database.models.idea_model import IdeaModel
    from app.infrastructure.database.models.comment_model import CommentModel
    from app.infrastructure.database.models.reaction_model import ReactionModel
    from app.infrastructure.database.models.vote_model import VoteModel
    from app.infrastructure.database.models.event_model import EventModel
    from app.infrastructure.database.models.chat_session_model import ChatSessionModel


class UserModel(BaseModel):
    """User ORM model."""
    
    __tablename__ = "users"
    
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default=UserRole.MEMBER.value)
    team: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    llm_api_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Relationships
    problems: Mapped[List["ProblemModel"]] = relationship(
        "ProblemModel",
        back_populates="author",
        cascade="all, delete-orphan"
    )
    rooms: Mapped[List["RoomModel"]] = relationship(
        "RoomModel",
        back_populates="creator",
        cascade="all, delete-orphan"
    )
    ideas: Mapped[List["IdeaModel"]] = relationship(
        "IdeaModel",
        back_populates="author",
        cascade="all, delete-orphan"
    )
    comments: Mapped[List["CommentModel"]] = relationship(
        "CommentModel",
        back_populates="author",
        cascade="all, delete-orphan"
    )
    reactions: Mapped[List["ReactionModel"]] = relationship(
        "ReactionModel",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    votes: Mapped[List["VoteModel"]] = relationship(
        "VoteModel",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    shared_problems: Mapped[List["ProblemModel"]] = relationship(
        "ProblemModel",
        secondary="problem_shared_users",
        back_populates="shared_users",
        viewonly=True,
    )
    shared_rooms: Mapped[List["RoomModel"]] = relationship(
        "RoomModel",
        secondary="room_shared_users",
        back_populates="shared_users",
        viewonly=True,
    )
    events: Mapped[List["EventModel"]] = relationship(
        "EventModel",
        back_populates="creator",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[List["ChatSessionModel"]] = relationship(
        "ChatSessionModel",
        back_populates="user",
        cascade="all, delete-orphan",
    )
