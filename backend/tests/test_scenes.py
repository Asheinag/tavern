import pytest
from httpx import AsyncClient


async def _create_game(client: AsyncClient) -> int:
    response = await client.post("/api/games", json={"title": "Игра"})
    return response.json()["id"]


@pytest.mark.asyncio
async def test_create_scene(client: AsyncClient):
    game_id = await _create_game(client)
    response = await client.post(
        f"/api/games/{game_id}/scenes",
        json={"title": "Таверна", "type": "Социум", "x": 100, "y": 200},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Таверна"
    assert data["game_id"] == game_id
    assert data["x"] == 100
    assert data["y"] == 200
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_scene_appears_in_game_detail(client: AsyncClient):
    game_id = await _create_game(client)
    await client.post(f"/api/games/{game_id}/scenes", json={"title": "Лес"})

    response = await client.get(f"/api/games/{game_id}")
    assert response.status_code == 200
    scenes = response.json()["scenes"]
    assert len(scenes) == 1
    assert scenes[0]["title"] == "Лес"


@pytest.mark.asyncio
async def test_patch_scene(client: AsyncClient):
    game_id = await _create_game(client)
    create = await client.post(f"/api/games/{game_id}/scenes", json={"title": "Замок"})
    scene_id = create.json()["id"]

    response = await client.patch(f"/api/scenes/{scene_id}", json={"status": "available", "x": 50})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "available"
    assert data["x"] == 50
    assert data["title"] == "Замок"


@pytest.mark.asyncio
async def test_delete_scene(client: AsyncClient):
    game_id = await _create_game(client)
    create = await client.post(f"/api/games/{game_id}/scenes", json={"title": "Пещера"})
    scene_id = create.json()["id"]

    response = await client.delete(f"/api/scenes/{scene_id}")
    assert response.status_code == 204

    detail = await client.get(f"/api/games/{game_id}")
    assert detail.json()["scenes"] == []


@pytest.mark.asyncio
async def test_create_edge(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "A"})).json()["id"]
    s2 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "B"})).json()["id"]

    response = await client.post(
        f"/api/games/{game_id}/edges",
        json={"from_scene_id": s1, "to_scene_id": s2, "cond": "Победа в бою"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["from_scene_id"] == s1
    assert data["to_scene_id"] == s2
    assert data["cond"] == "Победа в бою"


@pytest.mark.asyncio
async def test_patch_edge(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "A"})).json()["id"]
    s2 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "B"})).json()["id"]
    edge_id = (
        await client.post(
            f"/api/games/{game_id}/edges", json={"from_scene_id": s1, "to_scene_id": s2}
        )
    ).json()["id"]

    response = await client.patch(f"/api/edges/{edge_id}", json={"cond": "Тайный проход"})
    assert response.status_code == 200
    assert response.json()["cond"] == "Тайный проход"


@pytest.mark.asyncio
async def test_delete_edge(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "A"})).json()["id"]
    s2 = (await client.post(f"/api/games/{game_id}/scenes", json={"title": "B"})).json()["id"]
    edge_id = (
        await client.post(
            f"/api/games/{game_id}/edges", json={"from_scene_id": s1, "to_scene_id": s2}
        )
    ).json()["id"]

    response = await client.delete(f"/api/edges/{edge_id}")
    assert response.status_code == 204

    detail = await client.get(f"/api/games/{game_id}")
    assert detail.json()["edges"] == []
