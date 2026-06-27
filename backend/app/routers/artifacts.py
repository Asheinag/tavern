import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.models import Artifact, Game, Scene, SceneArtifact, User
from app.schemas import (
    ARTIFACT_TYPES,
    ArtifactPatch,
    ArtifactRead,
    SceneArtifactPatch,
    SceneArtifactRead,
)

router = APIRouter(tags=["artifacts"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# ── Library (global) ──────────────────────────────────────────────────────────


@router.post("/api/artifacts", response_model=ArtifactRead, status_code=status.HTTP_201_CREATED)
async def upload_artifact(
    file: UploadFile = File(...),
    type: str = Form(...),
    title: str = Form(""),
    tags: str = Form("[]"),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if type not in ARTIFACT_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {ARTIFACT_TYPES}")

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        tags_list: list[str] = json.loads(tags)
        if not isinstance(tags_list, list):
            raise ValueError
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="tags must be a JSON array of strings")

    dest_dir = settings.uploads_dir / str(user.id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "file").suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = dest_dir / filename
    content = await file.read()
    dest.write_bytes(content)

    artifact = Artifact(
        owner_id=user.id,
        type=type,
        title=title,
        file_path=str(dest.relative_to(settings.uploads_dir)),
        tags=tags_list,
    )
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)
    return artifact


@router.get("/api/artifacts", response_model=list[ArtifactRead])
async def list_artifacts(
    type: str | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Artifact).where(Artifact.owner_id == user.id).order_by(Artifact.created_at)
    if type is not None:
        q = q.where(Artifact.type == type)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/api/artifacts/{artifact_id}", response_model=ArtifactRead)
async def patch_artifact(
    artifact_id: int,
    body: ArtifactPatch,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await _get_artifact_or_404(artifact_id, user.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(artifact, field, value)
    await db.commit()
    await db.refresh(artifact)
    return artifact


@router.delete("/api/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(
    artifact_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await _get_artifact_or_404(artifact_id, user.id, db)
    file = settings.uploads_dir / artifact.file_path
    await db.delete(artifact)
    await db.commit()
    if file.exists():
        file.unlink()


# ── Scene attachments ─────────────────────────────────────────────────────────


@router.get("/api/scenes/{scene_id}/artifacts", response_model=list[SceneArtifactRead])
async def list_scene_artifacts(
    scene_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_scene_or_404(scene_id, user.id, db)
    result = await db.execute(
        select(SceneArtifact)
        .where(SceneArtifact.scene_id == scene_id)
        .options(selectinload(SceneArtifact.artifact))
        .order_by(SceneArtifact.id)
    )
    return result.scalars().all()


@router.post(
    "/api/scenes/{scene_id}/artifacts/{artifact_id}",
    response_model=SceneArtifactRead,
    status_code=status.HTTP_201_CREATED,
)
async def attach_artifact(
    scene_id: int,
    artifact_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_scene_or_404(scene_id, user.id, db)
    await _get_artifact_or_404(artifact_id, user.id, db)

    existing = await db.execute(
        select(SceneArtifact).where(
            SceneArtifact.scene_id == scene_id, SceneArtifact.artifact_id == artifact_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Artifact already attached to this scene")

    link = SceneArtifact(scene_id=scene_id, artifact_id=artifact_id)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    await db.refresh(link, ["artifact"])
    return link


@router.delete(
    "/api/scenes/{scene_id}/artifacts/{artifact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def detach_artifact(
    scene_id: int,
    artifact_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_scene_or_404(scene_id, user.id, db)
    link = await _get_link_or_404(scene_id, artifact_id, db)
    await db.delete(link)
    await db.commit()


@router.patch(
    "/api/scenes/{scene_id}/artifacts/{artifact_id}",
    response_model=SceneArtifactRead,
)
async def patch_scene_artifact(
    scene_id: int,
    artifact_id: int,
    body: SceneArtifactPatch,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_scene_or_404(scene_id, user.id, db)
    link = await _get_link_or_404(scene_id, artifact_id, db)
    await db.refresh(link, ["artifact"])

    if body.position is not None and link.artifact.type != "npc":
        raise HTTPException(status_code=400, detail="position is only valid for npc")

    if body.position is not None and body.position != link.position:
        await _check_npc_position_free(scene_id, body.position, db, exclude_id=link.id)

    if body.is_active is True:
        if link.artifact.type == "location_image":
            await db.execute(
                update(SceneArtifact)
                .where(
                    SceneArtifact.scene_id == scene_id,
                    SceneArtifact.artifact_id.in_(
                        select(Artifact.id).where(Artifact.type == "location_image")
                    ),
                    SceneArtifact.id != link.id,
                )
                .values(is_active=False)
            )
        elif link.artifact.type == "npc":
            target_position = body.position or link.position
            if target_position is None:
                raise HTTPException(
                    status_code=400, detail="npc must have a position before becoming active"
                )
            await _check_npc_position_free(scene_id, target_position, db, exclude_id=link.id)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(link, field, value)

    await db.commit()
    await db.refresh(link)
    await db.refresh(link, ["artifact"])
    return link


# ── helpers ───────────────────────────────────────────────────────────────────


async def _get_scene_or_404(scene_id: int, user_id: int, db: AsyncSession) -> Scene:
    result = await db.execute(
        select(Scene).join(Game).where(Scene.id == scene_id, Game.owner_id == user_id)
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


async def _get_artifact_or_404(artifact_id: int, user_id: int, db: AsyncSession) -> Artifact:
    result = await db.execute(
        select(Artifact).where(Artifact.id == artifact_id, Artifact.owner_id == user_id)
    )
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return artifact


async def _get_link_or_404(scene_id: int, artifact_id: int, db: AsyncSession) -> SceneArtifact:
    result = await db.execute(
        select(SceneArtifact).where(
            SceneArtifact.scene_id == scene_id, SceneArtifact.artifact_id == artifact_id
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Artifact not attached to this scene")
    return link


async def _check_npc_position_free(
    scene_id: int, position: str, db: AsyncSession, exclude_id: int | None = None
) -> None:
    q = (
        select(SceneArtifact)
        .join(Artifact)
        .where(
            SceneArtifact.scene_id == scene_id,
            Artifact.type == "npc",
            SceneArtifact.position == position,
            SceneArtifact.is_active.is_(True),
        )
    )
    if exclude_id is not None:
        q = q.where(SceneArtifact.id != exclude_id)
    result = await db.execute(q)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"NPC position '{position}' is already taken")
