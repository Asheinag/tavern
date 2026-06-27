import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_games_empty(client: AsyncClient):
    response = await client.get("/api/games")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_game(client: AsyncClient):
    response = await client.post(
        "/api/games", json={"title": "Тестовая кампания", "system": "D&D 5e"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Тестовая кампания"
    assert data["system"] == "D&D 5e"
    assert "share_code" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_get_game(client: AsyncClient):
    create = await client.post("/api/games", json={"title": "Кампания"})
    game_id = create.json()["id"]

    response = await client.get(f"/api/games/{game_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == game_id
    assert data["scenes"] == []
    assert data["edges"] == []


@pytest.mark.asyncio
async def test_get_game_not_found(client: AsyncClient):
    response = await client.get("/api/games/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_game(client: AsyncClient):
    create = await client.post("/api/games", json={"title": "Старое название"})
    game_id = create.json()["id"]

    response = await client.patch(f"/api/games/{game_id}", json={"title": "Новое название"})
    assert response.status_code == 200
    assert response.json()["title"] == "Новое название"


@pytest.mark.asyncio
async def test_delete_game(client: AsyncClient):
    create = await client.post("/api/games", json={"title": "Удаляемая"})
    game_id = create.json()["id"]

    response = await client.delete(f"/api/games/{game_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/games/{game_id}")
    assert response.status_code == 404
