"""Register use case."""
from uuid import UUID

from app.application.dto.user_dto import CreateUserDTO, UserResponseDTO
from app.application.services.jwt_service import JWTService
from app.core.email_policy import (
    allowed_email_domains_message,
    is_allowed_company_email,
)
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.domain.value_objects.email import Email
from app.infrastructure.security.password import PasswordHasher


class RegisterUseCase:
    """Use case: Register a new user."""
    
    def __init__(
        self,
        user_repo: UserRepository,
        password_hasher: PasswordHasher,
        jwt_service: JWTService
    ):
        self.user_repo = user_repo
        self.password_hasher = password_hasher
        self.jwt_service = jwt_service
    
    async def execute(
        self,
        dto: CreateUserDTO
    ) -> tuple[UserResponseDTO, str, str]:
        """
        Execute the use case.
        
        Returns:
            Tuple of (UserResponseDTO, access_token, refresh_token)
        """
        # Check if username exists
        existing_user = await self.user_repo.get_by_username(dto.username)
        if existing_user:
            raise ValueError(f"Username '{dto.username}' is already taken")
        
        # Check if email exists
        if dto.email:
            if not is_allowed_company_email(str(dto.email)):
                raise ValueError(allowed_email_domains_message())
            existing_email = await self.user_repo.get_by_email(dto.email)
            if existing_email:
                raise ValueError(f"Email '{dto.email}' is already registered")
        
        # Hash password
        password_hash = self.password_hasher.hash(dto.password)
        
        # Create domain entity
        user = User(
            username=dto.username,
            password_hash=password_hash,
            email=Email(dto.email) if dto.email else None,
            full_name=dto.full_name,
            team=dto.team,
            avatar_url=dto.avatar_url
        )
        
        # Persist via repository
        created_user = await self.user_repo.create(user)
        
        # Generate tokens
        access_token = self.jwt_service.create_access_token(
            user_id=created_user.id,
            username=created_user.username,
            role=created_user.role.value
        )
        refresh_token = self.jwt_service.create_refresh_token(
            user_id=created_user.id
        )
        
        # Return as DTO
        return UserResponseDTO.model_validate(created_user), access_token, refresh_token
