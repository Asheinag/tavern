from typing import Any, Literal

from pydantic import BaseModel

EventType = Literal[
    "show_bg",
    "clear_bg",
    "add_npc",
    "remove_npc",
    "show_text",
    "hide_text",
    "clear_all",
]


class IncomingMessage(BaseModel):
    type: EventType
    payload: dict[str, Any] = {}


class OutgoingEvent(BaseModel):
    type: Literal["event"] = "event"
    event: str
    payload: dict[str, Any]


class OutgoingSnapshot(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    state: dict[str, Any]


class OutgoingError(BaseModel):
    type: Literal["error"] = "error"
    detail: str
