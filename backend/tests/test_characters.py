import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Game, GamePlayer, User
from app.routers.auth import _hash


async def _make_user(db: AsyncSession, username: str = "player") -> User:
    user = User(username=username, password_hash=_hash("pass"))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_create_character(client: AsyncClient):
    r = await client.post("/api/characters", json={"name": "Горин Стальной"})
    assert r.status_code == 201
    assert r.json()["name"] == "Горин Стальной"


@pytest.mark.asyncio
async def test_list_characters(client: AsyncClient):
    await client.post("/api/characters", json={"name": "Горин"})
    await client.post("/api/characters", json={"name": "Элара"})
    r = await client.get("/api/characters")
    assert r.status_code == 200
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_get_character(client: AsyncClient):
    char_id = (await client.post("/api/characters", json={"name": "Горин"})).json()["id"]
    r = await client.get(f"/api/characters/{char_id}")
    assert r.status_code == 200
    assert r.json()["id"] == char_id


@pytest.mark.asyncio
async def test_patch_character(client: AsyncClient):
    char_id = (await client.post("/api/characters", json={"name": "Горин"})).json()["id"]
    r = await client.patch(f"/api/characters/{char_id}", json={"name": "Горин Обновлённый"})
    assert r.status_code == 200
    assert r.json()["name"] == "Горин Обновлённый"


@pytest.mark.asyncio
async def test_delete_character(client: AsyncClient):
    char_id = (await client.post("/api/characters", json={"name": "Горин"})).json()["id"]
    r = await client.delete(f"/api/characters/{char_id}")
    assert r.status_code == 204
    r = await client.get(f"/api/characters/{char_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_other_user_cannot_access_character(
    client: AsyncClient, db_session: AsyncSession, app_with_user
):
    char_id = (await client.post("/api/characters", json={"name": "Горин"})).json()["id"]

    other = await _make_user(db_session, "other")
    ac, cleanup = await app_with_user(other)
    async with ac as c:
        assert (await c.get(f"/api/characters/{char_id}")).status_code == 404
        assert (
            await c.patch(f"/api/characters/{char_id}", json={"name": "Взлом"})
        ).status_code == 404
        assert (await c.delete(f"/api/characters/{char_id}")).status_code == 404
    await cleanup()


@pytest.mark.asyncio
async def test_patch_game_player_character(
    client: AsyncClient, db_session: AsyncSession, default_user: User
):
    game = Game(owner_id=default_user.id, title="Тест", share_code="SHARE1")
    db_session.add(game)
    await db_session.flush()

    gp = GamePlayer(game_id=game.id, user_id=default_user.id, role="player")
    db_session.add(gp)
    await db_session.commit()

    char_id = (await client.post("/api/characters", json={"name": "Горин"})).json()["id"]

    r = await client.patch(
        f"/api/games/{game.id}/players/{default_user.id}",
        json={"character_id": char_id},
    )
    assert r.status_code == 200
    assert r.json()["character_id"] == char_id


@pytest.mark.asyncio
async def test_patch_game_player_other_user_forbidden(
    client: AsyncClient, db_session: AsyncSession, default_user: User, app_with_user
):
    other = await _make_user(db_session, "other")
    game = Game(owner_id=default_user.id, title="Тест", share_code="SHARE2")
    db_session.add(game)
    await db_session.flush()
    gp = GamePlayer(game_id=game.id, user_id=other.id, role="player")
    db_session.add(gp)
    await db_session.commit()

    ac, cleanup = await app_with_user(other)
    async with ac as c:
        r = await c.patch(
            f"/api/games/{game.id}/players/{default_user.id}",
            json={"character_id": None},
        )
        assert r.status_code == 403
    await cleanup()
