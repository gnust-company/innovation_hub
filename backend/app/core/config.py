"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from typing import List, Optional, Union

from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # App
    app_name: str = "Innovation Hub API"
    app_version: str = "0.1.0"
    env: str = "development"
    debug: bool = True
    log_level: str = "INFO"

    # Database
    database_url: PostgresDsn
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_pool_pre_ping: bool = True

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_secure: bool = False
    minio_bucket: str = "avatars"
    minio_public_url: str = ""  # External URL for accessing files, empty = use proxy

    # Agent BE
    agent_base_url: str = "http://agent-be:8000"
    agent_api_key: str = ""
    agent_timeout: float = 60.0
    agent_key_help_url: str = "https://wiki.internal/how-to-get-api-key"

    # CORS
    cors_origins: List[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Optional[Union[str, List[str]]]) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        return []


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
