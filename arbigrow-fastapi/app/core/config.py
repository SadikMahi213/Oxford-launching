from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALLOWED_ORIGINS: List[str]
    LOG_LEVEL: str = "INFO"
    APP_ENV: str = "development"
    FRONTEND_DOMAIN: str

    DB_SSL_REQUIRED: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@oxfordfinancialads.com"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "Oxford Financial Ads"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    B2_ENDPOINT: str = ""
    B2_KEY_ID: str = ""
    B2_APPLICATION_KEY: str = ""
    B2_BUCKET_NAME: str = ""

    AUTO_ROI_ENABLED: bool = True
    AUTO_ROI_POLL_SECONDS: int = 21600

    REDIS_URL: str = "redis://redis:6379/0"

    SESSION_TIMEOUT_MINUTES: int = 60
    REMEMBER_ME_DAYS: int = 30

    GOOGLE_ANALYTICS_CREDENTIALS: str = ""
    GOOGLE_ANALYTICS_PROPERTY_ID: str = ""

    MAX_FAILED_ATTEMPTS: int = 5
    SECURITY_LOG_ENABLED: bool = True
    PASSWORD_RESET_EXPIRE_MINUTES: int = 15

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_min_length(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: openssl rand -hex 32"
            )
        return v

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def allowed_origins_non_empty(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("ALLOWED_ORIGINS must contain at least one origin")
        return v


settings = Settings()
