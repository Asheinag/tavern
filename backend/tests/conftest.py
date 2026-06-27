from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.deps import current_user
from app.main import app
from app.models import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with session_factory() as session:
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(table.delete())
        await session.commit()
        yield session


@pytest.fixture
def tmp_uploads(tmp_path: Path, monkeypatch):
    import app.config as cfg
    import app.routers.artifacts as art_router

    monkeypatch.setattr(cfg.settings, "uploads_dir", tmp_path)
    monkeypatch.setattr(art_router, "settings", cfg.settings)
    return tmp_path


@pytest.fixture
async def client(db_session: AsyncSession, tmp_uploads: Path):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
def app_with_user(db_session: AsyncSession, tmp_uploads: Path):
    """Factory: returns (AsyncClient context manager, cleanup coroutine) for a given user."""

    async def factory(user: User):
        async def override_get_db():
            yield db_session

        async def override_current_user():
            return user

        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[current_user] = override_current_user

        ac = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

        async def cleanup():
            app.dependency_overrides.pop(current_user, None)

        return ac, cleanup

    return factory
