from datetime import datetime

from pydantic import BaseModel

# ── Scene ─────────────────────────────────────────────────────────────────────


class SceneCreate(BaseModel):
    title: str
    type: str = ""
    status: str = "draft"
    color: str | None = None
    summary: str = ""
    x: int = 0
    y: int = 0
    col: int = 0
    row: int = 0


class ScenePatch(BaseModel):
    title: str | None = None
    type: str | None = None
    status: str | None = None
    color: str | None = None
    summary: str | None = None
    x: int | None = None
    y: int | None = None
    col: int | None = None
    row: int | None = None


class SceneRead(BaseModel):
    id: int
    game_id: int
    title: str
    type: str
    status: str
    color: str | None
    summary: str
    x: int
    y: int
    col: int
    row: int

    model_config = {"from_attributes": True}


# ── Edge ──────────────────────────────────────────────────────────────────────


class EdgeCreate(BaseModel):
    from_scene_id: int
    to_scene_id: int
    cond: str | None = None


class EdgePatch(BaseModel):
    cond: str | None = None


class EdgeRead(BaseModel):
    id: int
    game_id: int
    from_scene_id: int
    to_scene_id: int
    cond: str | None

    model_config = {"from_attributes": True}


# ── Game ──────────────────────────────────────────────────────────────────────


class GameCreate(BaseModel):
    title: str
    system: str = ""


class GamePatch(BaseModel):
    title: str | None = None
    system: str | None = None


class GameRead(BaseModel):
    id: int
    title: str
    system: str
    cover: str | None
    share_code: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GameDetail(GameRead):
    scenes: list[SceneRead]
    edges: list[EdgeRead]
