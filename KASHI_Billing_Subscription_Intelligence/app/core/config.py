from decimal import Decimal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "KASHI Billing & Subscription Intelligence"
    app_version: str = "1.0.0"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./kashi_dev.db"
    default_currency: str = "INR"
    default_tax_rate_percent: Decimal = Decimal("18.0000")
    cors_origins: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
