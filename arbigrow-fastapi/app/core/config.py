from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7200
    ALLOWED_ORIGINS: List[str]
    LOG_LEVEL: str = "INFO"
    FRONTEND_DOMAIN: str

    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool
    MAIL_SSL_TLS: bool

    B2_ENDPOINT: str
    B2_KEY_ID: str
    B2_APPLICATION_KEY: str
    B2_BUCKET_NAME: str
    DB_SSL_REQUIRED: bool = False

    AUTO_ROI_ENABLED: bool = True
    AUTO_ROI_POLL_SECONDS: int = 21600

    class Config:
        env_file = ".env"


settings = Settings()
