from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.realtime.protocol import IncomingMessage
from app.realtime.rooms import room_manager

router = APIRouter()


@router.websocket("/ws/{game_id}")
async def ws_endpoint(websocket: WebSocket, game_id: int, role: str = "player") -> None:
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

    except WebSocketDisconnect:
        room.remove(websocket)
        room_manager.remove_if_empty(game_id)
