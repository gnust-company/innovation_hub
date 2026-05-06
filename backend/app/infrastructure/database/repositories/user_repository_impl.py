"""SQLAlchemy implementation of UserRepository."""
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.database.models.user_model import UserModel


class SQLUserRepository(UserRepository):
    """SQLAlchemy implementation of UserRepository."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _to_entity(self, model: UserModel) -> User:
        """Map ORM model to domain entity."""
        from app.domain.value_objects.email import Email
        from app.domain.value_objects.role import UserRole
        
        return User(
            id=UUID(model.id),
            username=model.username,
            password_hash=model.password_hash,
            email=Email(model.email) if model.email else None,
            full_name=model.full_name,
            role=UserRole(model.role),
            team=model.team,
            avatar_url=model.avatar_url,
            llm_api_key=model.llm_api_key,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at
        )
    
    def _to_model(self, entity: User) -> UserModel:
        """Map domain entity to ORM model."""
        return UserModel(
            id=str(entity.id),
            username=entity.username,
            password_hash=entity.password_hash,
            email=str(entity.email) if entity.email else None,
            full_name=entity.full_name,
            role=entity.role.value,
            team=entity.team,
            avatar_url=entity.avatar_url,
            llm_api_key=entity.llm_api_key,
            is_active=entity.is_active,
            created_at=entity.created_at,
            updated_at=entity.updated_at
        )
    
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        result = await self.session.execute(
            select(UserModel).where(UserModel.id == str(user_id))
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None
    
    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self.session.execute(
            select(UserModel).where(UserModel.username == username)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None
    
    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_ids(self, user_ids: List[UUID]) -> List[User]:
        if not user_ids:
            return []
        result = await self.session.execute(
            select(UserModel).where(UserModel.id.in_([str(uid) for uid in user_ids]))
        )
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def list(
        self,
        filters: Optional[dict] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[User], int]:
        query = select(UserModel)
        
        # Apply filters
        if filters:
            if filters.get("role"):
                query = query.where(UserModel.role == filters["role"])
            if filters.get("team"):
                query = query.where(UserModel.team == filters["team"])
            if filters.get("is_active") is not None:
                query = query.where(UserModel.is_active == filters["is_active"])
            if filters.get("search"):
                search = f"%{filters['search']}%"
                query = query.where(
                    (UserModel.username.ilike(search)) |
                    (UserModel.full_name.ilike(search)) |
                    (UserModel.email.ilike(search))
                )
        
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = await self.session.scalar(count_query)
        
        # Pagination
        query = query.offset((page - 1) * limit).limit(limit)
        query = query.order_by(UserModel.created_at.desc())
        
        result = await self.session.execute(query)
        models = result.scalars().all()
        
        return [self._to_entity(m) for m in models], total
    
    async def create(self, user: User) -> User:
        model = self._to_model(user)
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        await self.session.commit()
        return self._to_entity(model)

    async def update(self, user: User) -> User:
        model = await self.session.get(UserModel, str(user.id))
        if not model:
            raise ValueError(f"User {user.id} not found")
        
        model.username = user.username
        model.password_hash = user.password_hash
        model.email = str(user.email) if user.email else None
        model.full_name = user.full_name
        model.role = user.role.value
        model.team = user.team
        model.avatar_url = user.avatar_url
        model.llm_api_key = user.llm_api_key
        model.is_active = user.is_active
        model.updated_at = user.updated_at
        
        await self.session.flush()
        await self.session.refresh(model)
        await self.session.commit()
        return self._to_entity(model)

    async def delete(self, user_id: UUID) -> bool:
        model = await self.session.get(UserModel, str(user_id))
        if not model:
            return False
        
        await self.session.delete(model)
        await self.session.flush()
        await self.session.commit()
        return True
