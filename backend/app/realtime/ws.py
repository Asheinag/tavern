from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import SessionLog
from app.realtime.protocol import IncomingMessage
from app.realtime.rooms import room_manager

router = APIRouter()

_EVENT_KIND: dict[str, str] = {
    "scene_change": "move",
    "dice_roll": "roll",
}


def _log_kind(event_type: str) -> str:
    return _EVENT_KIND.get(event_type, "show")


def _log_text(event_type: str, payload: dict) -> str:
    match event_type:
        case "show_bg":
            return f"Фон: artId={payload.get('artId')}"
        case "clear_bg":
            return "Фон убран"
        case "add_npc":
            return f"NPC artId={payload.get('artId')} → {payload.get('side', 'left')}"
        case "remove_npc":
            return f"NPC artId={payload.get('artId')} убран"
        case "show_text":
            return f"Заметка: artId={payload.get('artId')}"
        case "hide_text":
            return "Заметка скрыта"
        case "clear_all":
            return "Экран очищен"
        case "scene_change":
            return f"Переход в сцену {payload.get('sceneId')}"
        case "dice_roll":
            return f"Бросок d{payload.get('sides', '?')}: {payload.get('result', '?')}"
        case _:
            return event_type


@router.websocket("/ws/{game_id}")
async def ws_endpoint(
    websocket: WebSocket,
    game_id: int,
    role: str = "player",
    db: AsyncSession = Depends(get_db),
) -> None:
    await websocket.accept()
    room = room_manager.get_or_create(game_id)
    room.add(websocket)

    await websocket.send_json({"type": "snapshot", "state": room.live_state})

    try:
        while True:
            data = await websocket.receive_json()

            if role != "master":
                continue

            try:
                msg = IncomingMessage.model_validate(data)
            except ValidationError as exc:
                await websocket.send_json({"type": "error", "detail": str(exc.errors()[0]["msg"])})
                continue

            room.apply(msg.type, msg.payload)
            await room.broadcast({"type": "event", "event": msg.type, "payload": msg.payload})

            scene_id = msg.payload.get("sceneId") if msg.type == "scene_change" else None
            db.add(
                SessionLog(
                    game_id=game_id,
                    kind=_log_kind(msg.type),
                    text=_log_text(msg.type, msg.payload),
                    scene_id=scene_id,
                )
            )
            await db.commit()

    except WebSocketDisconnect:
        room.remove(websocket)
        room_manager.remove_if_empty(game_id)
