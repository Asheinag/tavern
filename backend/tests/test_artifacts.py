import pytest
from httpx import AsyncClient


async def _create_game(client: AsyncClient) -> int:
    r = await client.post("/api/games", json={"title": "Игра"})
    return r.json()["id"]


async def _create_scene(client: AsyncClient, game_id: int) -> int:
    r = await client.post(f"/api/games/{game_id}/scenes", json={"title": "Сцена"})
    return r.json()["id"]


def _image_file(filename: str = "img.png") -> tuple:
    return ("file", (filename, b"\x89PNG\r\n\x1a\n" + b"\x00" * 8, "image/png"))


async def _upload(
    client: AsyncClient,
    scene_id: int,
    type: str = "location_image",
    title: str = "Фон",
    position: str | None = None,
) -> dict:
    data = {"type": type, "title": title, "tags": "[]"}
    if position:
        data["position"] = position
    r = await client.post(
        f"/api/scenes/{scene_id}/artifacts",
        files=[_image_file()],
        data=data,
    )
    return r


# ── Happy path ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_location_image(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    r = await _upload(client, scene_id, type="location_image", title="Таверна днём")
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "location_image"
    assert data["title"] == "Таверна днём"
    assert data["scene_id"] == scene_id
    assert data["is_active"] is False
    assert data["file_path"].endswith(".png")


@pytest.mark.asyncio
async def test_upload_npc(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    r = await _upload(client, scene_id, type="npc", title="Корчмарь", position="center")
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "npc"
    assert data["position"] == "center"


@pytest.mark.asyncio
async def test_upload_with_tags(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    r = await client.post(
        f"/api/scenes/{scene_id}/artifacts",
        files=[_image_file()],
        data={"type": "npc", "title": "Злодей", "tags": '["boss", "villain"]'},
    )
    assert r.status_code == 201
    assert r.json()["tags"] == ["boss", "villain"]


@pytest.mark.asyncio
async def test_list_artifacts(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    await _upload(client, scene_id, type="location_image", title="Фон 1")
    await _upload(client, scene_id, type="npc", title="НПС 1", position="left")

    r = await client.get(f"/api/scenes/{scene_id}/artifacts")
    assert r.status_code == 200
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_patch_artifact_title_and_tags(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client, scene_id)).json()["id"]

    r = await client.patch(
        f"/api/artifacts/{artifact_id}",
        json={"title": "Новое название", "tags": ["важный"]},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Новое название"
    assert r.json()["tags"] == ["важный"]


@pytest.mark.asyncio
async def test_delete_artifact(client: AsyncClient, tmp_uploads):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    data = (await _upload(client, scene_id)).json()
    artifact_id = data["id"]
    file_path = tmp_uploads / data["file_path"]
    assert file_path.exists()

    r = await client.delete(f"/api/artifacts/{artifact_id}")
    assert r.status_code == 204
    assert not file_path.exists()

    r = await client.get(f"/api/scenes/{scene_id}/artifacts")
    assert r.json() == []


# ── Бизнес-правила: location_image ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_activate_location_image_deactivates_others(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    id1 = (await _upload(client, scene_id, title="Фон 1")).json()["id"]
    id2 = (await _upload(client, scene_id, title="Фон 2")).json()["id"]

    await client.patch(f"/api/artifacts/{id1}", json={"is_active": True})
    await client.patch(f"/api/artifacts/{id2}", json={"is_active": True})

    r1 = await client.get(f"/api/scenes/{scene_id}/artifacts")
    artifacts = {a["id"]: a for a in r1.json()}
    assert artifacts[id1]["is_active"] is False
    assert artifacts[id2]["is_active"] is True


# ── Бизнес-правила: NPC позиции ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_npc_position_conflict(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    id1 = (await _upload(client, scene_id, type="npc", position="left")).json()["id"]
    await client.patch(f"/api/artifacts/{id1}", json={"is_active": True})

    id2 = (await _upload(client, scene_id, type="npc", position="left")).json()["id"]
    r = await client.patch(f"/api/artifacts/{id2}", json={"is_active": True})
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_npc_three_positions_allowed(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    for pos in ("left", "center", "right"):
        artifact_id = (await _upload(client, scene_id, type="npc", position=pos)).json()["id"]
        r = await client.patch(f"/api/artifacts/{artifact_id}", json={"is_active": True})
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_npc_activate_without_position_fails(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client, scene_id, type="npc")).json()["id"]

    r = await client.patch(f"/api/artifacts/{artifact_id}", json={"is_active": True})
    assert r.status_code == 400


# ── Валидация ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_invalid_type(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    r = await client.post(
        f"/api/scenes/{scene_id}/artifacts",
        files=[_image_file()],
        data={"type": "unknown", "title": ""},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_upload_invalid_mime(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    r = await client.post(
        f"/api/scenes/{scene_id}/artifacts",
        files=[("file", ("doc.pdf", b"%PDF", "application/pdf"))],
        data={"type": "location_image", "title": ""},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_patch_position_on_location_image_fails(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client, scene_id, type="location_image")).json()["id"]

    r = await client.patch(f"/api/artifacts/{artifact_id}", json={"position": "left"})
    assert r.status_code == 400


# ── 404 ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_to_nonexistent_scene(client: AsyncClient):
    r = await client.post(
        "/api/scenes/99999/artifacts",
        files=[_image_file()],
        data={"type": "location_image", "title": ""},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_artifacts_scene_not_found(client: AsyncClient):
    r = await client.get("/api/scenes/99999/artifacts")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_artifact_not_found(client: AsyncClient):
    r = await client.patch("/api/artifacts/99999", json={"title": "X"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_artifact_not_found(client: AsyncClient):
    r = await client.delete("/api/artifacts/99999")
    assert r.status_code == 404
