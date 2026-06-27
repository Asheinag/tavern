from fastapi import WebSocket


class Room:
    def __init__(self) -> None:
        self.live_state: dict = {"bg": None, "npcs": [], "text": None}
        self.connections: set[WebSocket] = set()

    def add(self, ws: WebSocket) -> None:
        self.connections.add(ws)

    def remove(self, ws: WebSocket) -> None:
        self.connections.discard(ws)

    def is_empty(self) -> bool:
        return len(self.connections) == 0

    def apply(self, event_type: str, payload: dict) -> None:
        if event_type == "show_bg":
            self.live_state["bg"] = {"artId": payload["artId"]}
        elif event_type == "clear_bg":
            self.live_state["bg"] = None
        elif event_type == "add_npc":
            art_id = payload["artId"]
            side = payload.get("side", "left")
            npcs = [
                n for n in self.live_state["npcs"] if n["artId"] != art_id and n["side"] != side
            ]
            npcs.append({"artId": art_id, "side": side})
            self.live_state["npcs"] = npcs[:2]
        elif event_type == "remove_npc":
            art_id = payload["artId"]
            self.live_state["npcs"] = [n for n in self.live_state["npcs"] if n["artId"] != art_id]
        elif event_type == "show_text":
            self.live_state["text"] = {"artId": payload["artId"]}
        elif event_type == "hide_text":
            self.live_state["text"] = None
        elif event_type == "clear_all":
            self.live_state = {"bg": None, "npcs": [], "text": None}

    async def broadcast(self, message: dict) -> None:
        dead: set[WebSocket] = set()
        for ws in self.connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.connections -= dead


class RoomManager:
    def __init__(self) -> None:
        self._rooms: dict[int, Room] = {}

    def get_or_create(self, game_id: int) -> Room:
        if game_id not in self._rooms:
            self._rooms[game_id] = Room()
        return self._rooms[game_id]

    def get(self, game_id: int) -> Room | None:
        return self._rooms.get(game_id)

    def remove_if_empty(self, game_id: int) -> None:
        room = self._rooms.get(game_id)
        if room and room.is_empty():
            del self._rooms[game_id]

    def reset(self) -> None:
        self._rooms.clear()


room_manager = RoomManager()
