from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    system_role: Mapped[str] = mapped_column(String(20), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    games: Mapped[list["Game"]] = relationship("Game", back_populates="owner")
    artifacts: Mapped[list["Artifact"]] = relationship("Artifact", back_populates="owner")
    characters: Mapped[list["Character"]] = relationship("Character", back_populates="owner")
    game_players: Mapped[list["GamePlayer"]] = relationship("GamePlayer", back_populates="user")
    auth_sessions: Mapped[list["AuthSession"]] = relationship("AuthSession", back_populates="user")


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="characters")
    game_players: Mapped[list["GamePlayer"]] = relationship(
        "GamePlayer", back_populates="character"
    )


class GamePlayer(Base):
    __tablename__ = "game_players"

    game_id: Mapped[int] = mapped_column(
        ForeignKey("games.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    character_id: Mapped[int | None] = mapped_column(
        ForeignKey("characters.id", ondelete="SET NULL"), nullable=True
    )
    role: Mapped[str] = mapped_column(String(20))  # master / player
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    game: Mapped["Game"] = relationship("Game", back_populates="game_players")
    user: Mapped["User"] = relationship("User", back_populates="game_players")
    character: Mapped["Character | None"] = relationship("Character", back_populates="game_players")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    used_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    used_by_user: Mapped["User | None"] = relationship("User", foreign_keys=[used_by])


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # UUID hex
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship("User", back_populates="auth_sessions")


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    system: Mapped[str] = mapped_column(String(100), default="")
    cover: Mapped[str | None] = mapped_column(Text, nullable=True)
    share_code: Mapped[str] = mapped_column(String(32), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="games")
    scenes: Mapped[list["Scene"]] = relationship(
        "Scene", back_populates="game", cascade="all, delete-orphan"
    )
    edges: Mapped[list["Edge"]] = relationship(
        "Edge", back_populates="game", cascade="all, delete-orphan"
    )
    game_players: Mapped[list["GamePlayer"]] = relationship(
        "GamePlayer", back_populates="game", cascade="all, delete-orphan"
    )


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(30))  # location_image | npc
    title: Mapped[str] = mapped_column(String(200), default="")
    file_path: Mapped[str] = mapped_column(Text)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="artifacts")
    scene_links: Mapped[list["SceneArtifact"]] = relationship(
        "SceneArtifact", back_populates="artifact", cascade="all, delete-orphan"
    )


class SceneArtifact(Base):
    __tablename__ = "scene_artifacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"))
    artifact_id: Mapped[int] = mapped_column(ForeignKey("artifacts.id", ondelete="CASCADE"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[str | None] = mapped_column(String(10), nullable=True)  # left|center|right

    scene: Mapped["Scene"] = relationship("Scene", back_populates="artifact_links")
    artifact: Mapped["Artifact"] = relationship("Artifact", back_populates="scene_links")


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(50), default="")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    x: Mapped[int] = mapped_column(Integer, default=0)
    y: Mapped[int] = mapped_column(Integer, default=0)
    col: Mapped[int] = mapped_column(Integer, default=0)
    row: Mapped[int] = mapped_column(Integer, default=0)

    game: Mapped["Game"] = relationship("Game", back_populates="scenes")
    artifact_links: Mapped[list["SceneArtifact"]] = relationship(
        "SceneArtifact", back_populates="scene", cascade="all, delete-orphan"
    )
    edges_from: Mapped[list["Edge"]] = relationship(
        "Edge",
        foreign_keys="Edge.from_scene_id",
        back_populates="from_scene",
        cascade="all, delete-orphan",
    )
    edges_to: Mapped[list["Edge"]] = relationship(
        "Edge",
        foreign_keys="Edge.to_scene_id",
        back_populates="to_scene",
        cascade="all, delete-orphan",
    )


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    from_scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"))
    to_scene_id: Mapped[int] = mapped_column(ForeignKey("scenes.id", ondelete="CASCADE"))
    cond: Mapped[str | None] = mapped_column(Text, nullable=True)

    game: Mapped["Game"] = relationship("Game", back_populates="edges")
    from_scene: Mapped["Scene"] = relationship(
        "Scene", foreign_keys=[from_scene_id], back_populates="edges_from"
    )
    to_scene: Mapped["Scene"] = relationship(
        "Scene", foreign_keys=[to_scene_id], back_populates="edges_to"
    )


class SessionLog(Base):
    __tablename__ = "session_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    kind: Mapped[str] = mapped_column(String(20))  # move/show/roll/note
    text: Mapped[str] = mapped_column(Text, default="")
    scene_id: Mapped[int | None] = mapped_column(
        ForeignKey("scenes.id", ondelete="SET NULL"), nullable=True
    )
