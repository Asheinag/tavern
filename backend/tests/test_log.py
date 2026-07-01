import pytest
from httpx import AsyncClient

from app.realtime.ws import _log_kind, _log_text  # noqa: F401 — internal helpers

# ── Unit: helpers ──────────────────────────────────────────────────────────────


def test_log_kind_show_events():
    show_events = (
        "show_bg",
        "clear_bg",
        "add_npc",
        "remove_npc",
        "show_text",
        "hide_text",
        "clear_all",
    )
    for event in show_events:
        assert _log_kind(event) == "show"


def test_log_kind_move():
    assert _log_kind("scene_change") == "move"


def test_log_kind_roll():
    assert _log_kind("dice_roll") == "roll"


def test_log_text_show_bg():
    assert _log_text("show_bg", {"artId": 7}) == "Фон: artId=7"


def test_log_text_add_npc():
    assert _log_text("add_npc", {"artId": 8, "side": "left"}) == "NPC artId=8 → left"


def test_log_text_clear_all():
    assert _log_text("clear_all", {}) == "Экран очищен"


def test_log_text_scene_change():
    assert _log_text("scene_change", {"sceneId": 3}) == "Переход в сцену 3"


def test_log_text_dice_roll():
    assert _log_text("dice_roll", {"sides": 20, "result": 17}) == "Бросок d20: 17"


def test_log_text_unknown_event():
    assert _log_text("unknown", {}) == "unknown"


# ── Integration: REST log endpoints ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_log_empty(client: AsyncClient):
    game = await client.post("/api/games", json={"title": "Игра"})
    game_id = game.json()["id"]

    response = await client.get(f"/api/games/{game_id}/log")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_post_log_creates_note(client: AsyncClient):
    game = await client.post("/api/games", json={"title": "Игра"})
    game_id = game.json()["id"]

    response = await client.post(
        f"/api/games/{game_id}/log", json={"text": "Партия вошла в таверну"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["kind"] == "note"
    assert data["text"] == "Партия вошла в таверну"
    assert data["game_id"] == game_id
    assert data["scene_id"] is None


@pytest.mark.asyncio
async def test_get_log_returns_entries_in_order(client: AsyncClient):
    game = await client.post("/api/games", json={"title": "Игра"})
    game_id = game.json()["id"]

    await client.post(f"/api/games/{game_id}/log", json={"text": "Первая запись"})
    await client.post(f"/api/games/{game_id}/log", json={"text": "Вторая запись"})

    response = await client.get(f"/api/games/{game_id}/log")
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 2
    assert entries[0]["text"] == "Первая запись"
    assert entries[1]["text"] == "Вторая запись"


@pytest.mark.asyncio
async def test_get_log_404_unknown_game(client: AsyncClient):
    response = await client.get("/api/games/99999/log")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_post_log_404_unknown_game(client: AsyncClient):
    response = await client.post("/api/games/99999/log", json={"text": "Запись"})
    assert response.status_code == 404


# ── Integration: by-code endpoint ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_game_by_code(client: AsyncClient):
    game = await client.post("/api/games", json={"title": "Таверна"})
    share_code = game.json()["share_code"]
    game_id = game.json()["id"]

    response = await client.get(f"/api/games/by-code/{share_code}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == game_id
    assert data["title"] == "Таверна"


@pytest.mark.asyncio
async def test_get_game_by_code_not_found(client: AsyncClient):
    response = await client.get("/api/games/by-code/nonexistent-code")
    assert response.status_code == 404
