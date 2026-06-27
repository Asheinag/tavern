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
async def test_patch_game_not_found(client: AsyncClient):
    response = await client.patch("/api/games/99999", json={"title": "Не важно"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_game(client: AsyncClient):
    create = await client.post("/api/games", json={"title": "Удаляемая"})
    game_id = create.json()["id"]

    response = await client.delete(f"/api/games/{game_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/games/{game_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_game_not_found(client: AsyncClient):
    response = await client.delete("/api/games/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_game_cascades_scenes_and_edges(client: AsyncClient):
    create = await client.post("/api/games", json={"title": "Каскад"})
    game_id = create.json()["id"]

    s1 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "A"})).json()["id"]
    s2 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "B"})).json()["id"]
    await client.post(f"/api/games/{game_id}/edges", json={"from_scene_id": s1, "to_scene_id": s2})

    await client.delete(f"/api/games/{game_id}")

    # игра удалена — сцены и рёбра должны исчезнуть вместе с ней
    assert (await client.get(f"/api/games/{game_id}")).status_code == 404
    assert (await client.patch(f"/api/scenes/{s1}", json={"title": "X"})).status_code == 404
    assert (await client.patch(f"/api/scenes/{s2}", json={"title": "X"})).status_code == 404


@pytest.mark.asyncio
async def test_create_game_missing_title(client: AsyncClient):
    response = await client.post("/api/games", json={"system": "D&D 5e"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_share_codes_are_unique(client: AsyncClient):
    g1 = (await client.post("/api/games", json={"title": "Игра 1"})).json()
    g2 = (await client.post("/api/games", json={"title": "Игра 2"})).json()
    assert g1["share_code"] != g2["share_code"]
