from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://tavern:tavern@db:5432/tavern"

    model_config = {"env_file": ".env"}


settings = Settings()
