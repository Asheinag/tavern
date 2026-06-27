import pytest
from httpx import AsyncClient


async def _create_game(client: AsyncClient) -> int:
    response = await client.post("/api/games", json={"title": "Игра"})
    return response.json()["id"]


async def _create_scene(client: AsyncClient, game_id: int, title: str = "Сцена") -> int:
    response = await client.post(f"/api/games/{game_id}/scenes", json={"title": title})
    return response.json()["id"]


async def _create_edge(client: AsyncClient, game_id: int, from_id: int, to_id: int) -> int:
    response = await client.post(
        f"/api/games/{game_id}/edges",
        json={"from_scene_id": from_id, "to_scene_id": to_id},
    )
    return response.json()["id"]


# ── Сцены — happy path ────────────────────────────────────────────────────────


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
    scene_id = await _create_scene(client, game_id, "Замок")

    response = await client.patch(f"/api/scenes/{scene_id}", json={"status": "available", "x": 50})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "available"
    assert data["x"] == 50
    assert data["title"] == "Замок"


@pytest.mark.asyncio
async def test_delete_scene(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id, "Пещера")

    response = await client.delete(f"/api/scenes/{scene_id}")
    assert response.status_code == 204

    detail = await client.get(f"/api/games/{game_id}")
    assert detail.json()["scenes"] == []


# ── Сцены — 404 ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_scene_game_not_found(client: AsyncClient):
    response = await client.post("/api/games/99999/scenes", json={"title": "Сцена"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_scene_not_found(client: AsyncClient):
    response = await client.patch("/api/scenes/99999", json={"title": "Новое"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_scene_not_found(client: AsyncClient):
    response = await client.delete("/api/scenes/99999")
    assert response.status_code == 404


# ── Рёбра — happy path ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_edge(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = await _create_scene(client, game_id, "A")
    s2 = await _create_scene(client, game_id, "B")

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
    s1 = await _create_scene(client, game_id, "A")
    s2 = await _create_scene(client, game_id, "B")
    edge_id = await _create_edge(client, game_id, s1, s2)

    response = await client.patch(f"/api/edges/{edge_id}", json={"cond": "Тайный проход"})
    assert response.status_code == 200
    assert response.json()["cond"] == "Тайный проход"


@pytest.mark.asyncio
async def test_delete_edge(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = await _create_scene(client, game_id, "A")
    s2 = await _create_scene(client, game_id, "B")
    edge_id = await _create_edge(client, game_id, s1, s2)

    response = await client.delete(f"/api/edges/{edge_id}")
    assert response.status_code == 204

    detail = await client.get(f"/api/games/{game_id}")
    assert detail.json()["edges"] == []


# ── Рёбра — 404 ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_edge_game_not_found(client: AsyncClient):
    response = await client.post(
        "/api/games/99999/edges",
        json={"from_scene_id": 1, "to_scene_id": 2},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_edge_from_scene_not_found(client: AsyncClient):
    game_id = await _create_game(client)
    s2 = await _create_scene(client, game_id, "B")

    response = await client.post(
        f"/api/games/{game_id}/edges",
        json={"from_scene_id": 99999, "to_scene_id": s2},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_edge_to_scene_not_found(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = await _create_scene(client, game_id, "A")

    response = await client.post(
        f"/api/games/{game_id}/edges",
        json={"from_scene_id": s1, "to_scene_id": 99999},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_edge_scenes_from_another_game(client: AsyncClient):
    game1_id = await _create_game(client)
    game2_id = await _create_game(client)
    s1 = await _create_scene(client, game1_id, "A")
    s2 = await _create_scene(client, game2_id, "B")

    # пытаемся создать ребро в game1, используя сцену из game2 как цель
    response = await client.post(
        f"/api/games/{game1_id}/edges",
        json={"from_scene_id": s1, "to_scene_id": s2},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_patch_edge_not_found(client: AsyncClient):
    response = await client.patch("/api/edges/99999", json={"cond": "Что-то"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_edge_not_found(client: AsyncClient):
    response = await client.delete("/api/edges/99999")
    assert response.status_code == 404


# ── Каскадное удаление ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_scene_cascades_edges(client: AsyncClient):
    game_id = await _create_game(client)
    s1 = await _create_scene(client, game_id, "A")
    s2 = await _create_scene(client, game_id, "B")
    s3 = await _create_scene(client, game_id, "C")
    await _create_edge(client, game_id, s1, s2)
    await _create_edge(client, game_id, s2, s3)
    await _create_edge(client, game_id, s3, s1)

    # удаляем s2 — должны исчезнуть рёбра s1→s2 и s2→s3
    await client.delete(f"/api/scenes/{s2}")

    detail = await client.get(f"/api/games/{game_id}")
    data = detail.json()
    edge_pairs = {(e["from_scene_id"], e["to_scene_id"]) for e in data["edges"]}
    assert (s1, s2) not in edge_pairs
    assert (s2, s3) not in edge_pairs
    assert (s3, s1) in edge_pairs  # это ребро не трогали
