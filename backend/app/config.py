from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://tavern:tavern@db:5432/tavern"
    uploads_dir: Path = Path("uploads")

    model_config = {"env_file": ".env"}


settings = Settings()
