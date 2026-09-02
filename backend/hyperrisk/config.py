from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+asyncpg://hyperrisk:hyperrisk@localhost:5432/hyperrisk"
    hyperliquid_rest_url: str = "https://api.hyperliquid.xyz"
    hyperliquid_ws_url: str = "wss://api.hyperliquid.xyz/ws"
    request_timeout_seconds: float = Field(default=5.0, ge=1, le=30)
    stale_after_seconds: int = Field(default=10, ge=2, le=120)
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    log_level: str = "INFO"
    openai_api_key: str | None = None

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
