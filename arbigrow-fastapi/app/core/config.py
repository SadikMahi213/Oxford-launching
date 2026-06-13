from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 7200
    ALLOWED_ORIGINS: List[str]
    LOG_LEVEL: str = "INFO"
    APP_ENV: str = "development"
    FRONTEND_DOMAIN: str

    DB_SSL_REQUIRED: bool = False

    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@arbigrow.com"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "ArbiGrow"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    B2_ENDPOINT: str = ""
    B2_KEY_ID: str = ""
    B2_APPLICATION_KEY: str = ""
    B2_BUCKET_NAME: str = ""

    AUTO_ROI_ENABLED: bool = True
    AUTO_ROI_POLL_SECONDS: int = 21600

    class Config:
        env_file = ".env"


settings = Settings()
