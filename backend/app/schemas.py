from datetime import datetime

from pydantic import BaseModel, field_validator

# ── Auth ──────────────────────────────────────────────────────────────────────


class RegisterIn(BaseModel):
    username: str
    password: str
    invite_code: str


class LoginIn(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: int
    username: str
    avatar: str | None
    bio: str | None
    system_role: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── InviteCode ────────────────────────────────────────────────────────────────


class InviteCodeCreate(BaseModel):
    expires_at: datetime | None = None


class InviteCodeRead(BaseModel):
    id: int
    code: str
    used_by: int | None
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Character ─────────────────────────────────────────────────────────────────


class CharacterCreate(BaseModel):
    name: str
    bio: str | None = None


class CharacterPatch(BaseModel):
    name: str | None = None
    bio: str | None = None


class CharacterRead(BaseModel):
    id: int
    owner_id: int
    name: str
    avatar: str | None
    bio: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── GamePlayer ────────────────────────────────────────────────────────────────


class GamePlayerPatch(BaseModel):
    character_id: int | None = None


class GamePlayerRead(BaseModel):
    game_id: int
    user_id: int
    character_id: int | None
    role: str

    model_config = {"from_attributes": True}


# ── Artifact ──────────────────────────────────────────────────────────────────

ARTIFACT_TYPES = {"location_image", "npc"}
NPC_POSITIONS = {"left", "center", "right"}


class ArtifactRead(BaseModel):
    id: int
    owner_id: int
    type: str
    title: str
    file_path: str
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ArtifactPatch(BaseModel):
    title: str | None = None
    tags: list[str] | None = None


class SceneArtifactRead(BaseModel):
    id: int
    scene_id: int
    artifact_id: int
    is_active: bool
    position: str | None
    artifact: ArtifactRead

    model_config = {"from_attributes": True}


class SceneArtifactPatch(BaseModel):
    is_active: bool | None = None
    position: str | None = None

    @field_validator("position")
    @classmethod
    def validate_position(cls, v: str | None) -> str | None:
        if v is not None and v not in NPC_POSITIONS:
            raise ValueError(f"position must be one of {NPC_POSITIONS}")
        return v


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
    cover: str | None = None


class GamePatch(BaseModel):
    title: str | None = None
    system: str | None = None
    cover: str | None = None


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


class GameByCodeRead(BaseModel):
    id: int
    title: str

    model_config = {"from_attributes": True}


# ── SessionLog ────────────────────────────────────────────────────────────────


class SessionLogRead(BaseModel):
    id: int
    game_id: int
    ts: datetime
    kind: str
    text: str
    scene_id: int | None

    model_config = {"from_attributes": True}


class SessionLogCreate(BaseModel):
    text: str
