import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


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
    type: str = "location_image",
    title: str = "Фон",
) -> dict:
    r = await client.post(
        "/api/artifacts",
        files=[_image_file()],
        data={"type": type, "title": title, "tags": "[]"},
    )
    return r


async def _attach(client: AsyncClient, scene_id: int, artifact_id: int):
    return await client.post(f"/api/scenes/{scene_id}/artifacts/{artifact_id}")


# ── Library CRUD ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_location_image(client: AsyncClient):
    r = await _upload(client, type="location_image", title="Таверна днём")
    assert r.status_code == 201
    data = r.json()
    assert data["type"] == "location_image"
    assert data["title"] == "Таверна днём"
    assert data["file_path"].endswith(".png")
    assert "scene_id" not in data
    assert "is_active" not in data


@pytest.mark.asyncio
async def test_upload_npc(client: AsyncClient):
    r = await _upload(client, type="npc", title="Корчмарь")
    assert r.status_code == 201
    assert r.json()["type"] == "npc"


@pytest.mark.asyncio
async def test_upload_with_tags(client: AsyncClient):
    r = await client.post(
        "/api/artifacts",
        files=[_image_file()],
        data={"type": "npc", "title": "Злодей", "tags": '["boss", "villain"]'},
    )
    assert r.status_code == 201
    assert r.json()["tags"] == ["boss", "villain"]


@pytest.mark.asyncio
async def test_list_artifacts(client: AsyncClient):
    await _upload(client, type="location_image", title="Фон 1")
    await _upload(client, type="npc", title="НПС 1")

    r = await client.get("/api/artifacts")
    assert r.status_code == 200
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_list_artifacts_filter_by_type(client: AsyncClient):
    await _upload(client, type="location_image")
    await _upload(client, type="npc")

    r = await client.get("/api/artifacts?type=npc")
    assert r.status_code == 200
    assert all(a["type"] == "npc" for a in r.json())
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_patch_artifact(client: AsyncClient):
    artifact_id = (await _upload(client)).json()["id"]

    r = await client.patch(
        f"/api/artifacts/{artifact_id}",
        json={"title": "Новое название", "tags": ["важный"]},
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Новое название"
    assert r.json()["tags"] == ["важный"]


@pytest.mark.asyncio
async def test_delete_artifact(client: AsyncClient, tmp_uploads):
    data = (await _upload(client)).json()
    artifact_id = data["id"]
    file_path = tmp_uploads / data["file_path"]
    assert file_path.exists()

    r = await client.delete(f"/api/artifacts/{artifact_id}")
    assert r.status_code == 204
    assert not file_path.exists()

    r = await client.get("/api/artifacts")
    assert r.json() == []


# ── Access control ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_other_user_cannot_patch_artifact(
    client: AsyncClient, db_session: AsyncSession, app_with_user
):
    artifact_id = (await _upload(client)).json()["id"]

    other_user = User(name="Other", avatar_color="#000")
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    other_client, cleanup = await app_with_user(other_user)
    async with other_client as c:
        r = await c.patch(f"/api/artifacts/{artifact_id}", json={"title": "Взлом"})
        assert r.status_code == 404
    await cleanup()


@pytest.mark.asyncio
async def test_other_user_cannot_delete_artifact(
    client: AsyncClient, db_session: AsyncSession, app_with_user
):
    artifact_id = (await _upload(client)).json()["id"]

    other_user = User(name="Other", avatar_color="#000")
    db_session.add(other_user)
    await db_session.commit()
    await db_session.refresh(other_user)

    other_client, cleanup = await app_with_user(other_user)
    async with other_client as c:
        r = await c.delete(f"/api/artifacts/{artifact_id}")
        assert r.status_code == 404
    await cleanup()


# ── Scene attachments ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_attach_and_list(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client)).json()["id"]

    r = await _attach(client, scene_id, artifact_id)
    assert r.status_code == 201
    data = r.json()
    assert data["scene_id"] == scene_id
    assert data["artifact_id"] == artifact_id
    assert data["is_active"] is False
    assert data["artifact"]["id"] == artifact_id

    r = await client.get(f"/api/scenes/{scene_id}/artifacts")
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_attach_duplicate_returns_409(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client)).json()["id"]

    await _attach(client, scene_id, artifact_id)
    r = await _attach(client, scene_id, artifact_id)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_detach_artifact(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client)).json()["id"]
    await _attach(client, scene_id, artifact_id)

    r = await client.delete(f"/api/scenes/{scene_id}/artifacts/{artifact_id}")
    assert r.status_code == 204

    r = await client.get(f"/api/scenes/{scene_id}/artifacts")
    assert r.json() == []


@pytest.mark.asyncio
async def test_same_artifact_attached_to_multiple_scenes(client: AsyncClient):
    game_id = await _create_game(client)
    scene1 = await _create_scene(client, game_id)
    scene2 = await _create_scene(client, game_id)
    artifact_id = (await _upload(client)).json()["id"]

    assert (await _attach(client, scene1, artifact_id)).status_code == 201
    assert (await _attach(client, scene2, artifact_id)).status_code == 201


# ── Business rules: location_image ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_activate_location_image_deactivates_others(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    id1 = (await _upload(client, title="Фон 1")).json()["id"]
    id2 = (await _upload(client, title="Фон 2")).json()["id"]
    await _attach(client, scene_id, id1)
    await _attach(client, scene_id, id2)

    await client.patch(f"/api/scenes/{scene_id}/artifacts/{id1}", json={"is_active": True})
    await client.patch(f"/api/scenes/{scene_id}/artifacts/{id2}", json={"is_active": True})

    r = await client.get(f"/api/scenes/{scene_id}/artifacts")
    by_art = {a["artifact_id"]: a for a in r.json()}
    assert by_art[id1]["is_active"] is False
    assert by_art[id2]["is_active"] is True


# ── Business rules: NPC positions ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_npc_position_conflict(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    id1 = (await _upload(client, type="npc")).json()["id"]
    id2 = (await _upload(client, type="npc")).json()["id"]
    await _attach(client, scene_id, id1)
    await _attach(client, scene_id, id2)

    await client.patch(
        f"/api/scenes/{scene_id}/artifacts/{id1}", json={"position": "left", "is_active": True}
    )
    r = await client.patch(
        f"/api/scenes/{scene_id}/artifacts/{id2}", json={"position": "left", "is_active": True}
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_npc_three_positions_allowed(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)

    for pos in ("left", "center", "right"):
        art_id = (await _upload(client, type="npc")).json()["id"]
        await _attach(client, scene_id, art_id)
        r = await client.patch(
            f"/api/scenes/{scene_id}/artifacts/{art_id}",
            json={"position": pos, "is_active": True},
        )
        assert r.status_code == 200


@pytest.mark.asyncio
async def test_npc_activate_without_position_fails(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    art_id = (await _upload(client, type="npc")).json()["id"]
    await _attach(client, scene_id, art_id)

    r = await client.patch(f"/api/scenes/{scene_id}/artifacts/{art_id}", json={"is_active": True})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_position_on_location_image_fails(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    art_id = (await _upload(client, type="location_image")).json()["id"]
    await _attach(client, scene_id, art_id)

    r = await client.patch(f"/api/scenes/{scene_id}/artifacts/{art_id}", json={"position": "left"})
    assert r.status_code == 400


# ── Validation ────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_invalid_type(client: AsyncClient):
    r = await client.post(
        "/api/artifacts",
        files=[_image_file()],
        data={"type": "unknown", "title": ""},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_upload_invalid_mime(client: AsyncClient):
    r = await client.post(
        "/api/artifacts",
        files=[("file", ("doc.pdf", b"%PDF", "application/pdf"))],
        data={"type": "location_image", "title": ""},
    )
    assert r.status_code == 400


# ── 404 ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_patch_artifact_not_found(client: AsyncClient):
    r = await client.patch("/api/artifacts/99999", json={"title": "X"})
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_artifact_not_found(client: AsyncClient):
    r = await client.delete("/api/artifacts/99999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_scene_artifacts_scene_not_found(client: AsyncClient):
    r = await client.get("/api/scenes/99999/artifacts")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_attach_to_nonexistent_scene(client: AsyncClient):
    artifact_id = (await _upload(client)).json()["id"]
    r = await client.post(f"/api/scenes/99999/artifacts/{artifact_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_attach_nonexistent_artifact(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    r = await client.post(f"/api/scenes/{scene_id}/artifacts/99999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_detach_not_attached(client: AsyncClient):
    game_id = await _create_game(client)
    scene_id = await _create_scene(client, game_id)
    artifact_id = (await _upload(client)).json()["id"]
    r = await client.delete(f"/api/scenes/{scene_id}/artifacts/{artifact_id}")
    assert r.status_code == 404
