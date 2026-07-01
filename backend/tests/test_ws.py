from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app
from app.realtime.rooms import Room, room_manager


@pytest.fixture(autouse=True)
def reset_rooms():
    # WS эндпоинт использует get_db для записи в session_log.
    # Мокаем сессию, чтобы тесты не требовали реальной БД.
    mock_db = MagicMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    async def _override():
        yield mock_db

    app.dependency_overrides[get_db] = _override
    room_manager.reset()
    yield
    room_manager.reset()
    app.dependency_overrides.pop(get_db, None)


# --- Unit: Room ---


def test_room_apply_show_bg():
    room = Room()
    room.apply("show_bg", {"artId": 7})
    assert room.live_state["bg"] == {"artId": 7}


def test_room_apply_clear_bg():
    room = Room()
    room.apply("show_bg", {"artId": 7})
    room.apply("clear_bg", {})
    assert room.live_state["bg"] is None


def test_room_apply_add_npc_two_slots():
    room = Room()
    room.apply("add_npc", {"artId": 1, "side": "left"})
    room.apply("add_npc", {"artId": 2, "side": "right"})
    assert len(room.live_state["npcs"]) == 2


def test_room_apply_add_npc_same_side_replaces():
    room = Room()
    room.apply("add_npc", {"artId": 1, "side": "left"})
    room.apply("add_npc", {"artId": 2, "side": "left"})
    assert len(room.live_state["npcs"]) == 1
    assert room.live_state["npcs"][0]["artId"] == 2


def test_room_apply_add_npc_same_art_moves():
    room = Room()
    room.apply("add_npc", {"artId": 1, "side": "left"})
    room.apply("add_npc", {"artId": 1, "side": "right"})
    assert len(room.live_state["npcs"]) == 1
    assert room.live_state["npcs"][0]["side"] == "right"


def test_room_apply_remove_npc():
    room = Room()
    room.apply("add_npc", {"artId": 1, "side": "left"})
    room.apply("remove_npc", {"artId": 1})
    assert room.live_state["npcs"] == []


def test_room_apply_show_text():
    room = Room()
    room.apply("show_text", {"artId": 13})
    assert room.live_state["text"] == {"artId": 13}


def test_room_apply_hide_text():
    room = Room()
    room.apply("show_text", {"artId": 13})
    room.apply("hide_text", {})
    assert room.live_state["text"] is None


def test_room_apply_clear_all():
    room = Room()
    room.apply("show_bg", {"artId": 7})
    room.apply("add_npc", {"artId": 1, "side": "left"})
    room.apply("show_text", {"artId": 13})
    room.apply("clear_all", {})
    assert room.live_state == {"bg": None, "npcs": [], "text": None}


def test_room_manager_get_or_create():
    r1 = room_manager.get_or_create(1)
    r2 = room_manager.get_or_create(1)
    assert r1 is r2


def test_room_manager_remove_if_empty():
    room_manager.get_or_create(1)
    room_manager.remove_if_empty(1)
    assert room_manager.get(1) is None


# --- Integration: WebSocket ---


def test_player_receives_snapshot():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/1?role=player") as ws:
            data = ws.receive_json()
            assert data["type"] == "snapshot"
            assert data["state"]["bg"] is None
            assert data["state"]["npcs"] == []
            assert data["state"]["text"] is None


def test_master_show_bg_updates_state_and_broadcasts():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/1?role=master") as master:
            master.receive_json()  # snapshot
            master.send_json({"type": "show_bg", "payload": {"artId": 7}})
            event = master.receive_json()
            assert event["type"] == "event"
            assert event["event"] == "show_bg"
            assert event["payload"]["artId"] == 7
            # Check state while still connected
            assert room_manager.get(1).live_state["bg"] == {"artId": 7}


def test_player_receives_master_event():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/1?role=master") as master:
            master.receive_json()  # snapshot
            with client.websocket_connect("/ws/1?role=player") as player:
                player.receive_json()  # snapshot
                master.send_json({"type": "add_npc", "payload": {"artId": 8, "side": "left"}})
                master.receive_json()  # broadcast back to master
                event = player.receive_json()
                assert event["type"] == "event"
                assert event["event"] == "add_npc"


def test_player_cannot_send_events():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/1?role=player") as player:
            player.receive_json()  # snapshot
            player.send_json({"type": "show_bg", "payload": {"artId": 7}})
            # No broadcast — room state unchanged
        room = room_manager.get(1)
        assert room is None or room.live_state["bg"] is None


def test_late_player_gets_current_snapshot():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/1?role=master") as master:
            master.receive_json()  # snapshot
            master.send_json({"type": "show_bg", "payload": {"artId": 7}})
            master.receive_json()  # broadcast
            # Player joins while master is still connected
            with client.websocket_connect("/ws/1?role=player") as player:
                snap = player.receive_json()
                assert snap["type"] == "snapshot"
                assert snap["state"]["bg"] == {"artId": 7}


def test_invalid_event_returns_error():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/1?role=master") as master:
            master.receive_json()  # snapshot
            master.send_json({"type": "unknown_event", "payload": {}})
            err = master.receive_json()
            assert err["type"] == "error"
