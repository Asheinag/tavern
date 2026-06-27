import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.models import Artifact, Game, Scene, User
from app.schemas import ARTIFACT_TYPES, NPC_POSITIONS, ArtifactPatch, ArtifactRead

router = APIRouter(tags=["artifacts"])

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}


@router.post(
    "/api/scenes/{scene_id}/artifacts",
    response_model=ArtifactRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_artifact(
    scene_id: int,
    file: UploadFile = File(...),
    type: str = Form(...),
    title: str = Form(""),
    tags: str = Form("[]"),
    position: str | None = Form(None),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    scene = await _get_scene_or_404(scene_id, user.id, db)

    if type not in ARTIFACT_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {ARTIFACT_TYPES}")

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if position is not None and position not in NPC_POSITIONS:
        raise HTTPException(status_code=400, detail=f"position must be one of {NPC_POSITIONS}")

    try:
        tags_list: list[str] = json.loads(tags)
        if not isinstance(tags_list, list):
            raise ValueError
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="tags must be a JSON array of strings")

    dest_dir = settings.uploads_dir / str(scene.game_id) / str(scene_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "file").suffix or ".bin"
    filename = f"{uuid.uuid4().hex}{suffix}"
    dest = dest_dir / filename
    content = await file.read()
    dest.write_bytes(content)

    artifact = Artifact(
        game_id=scene.game_id,
        scene_id=scene_id,
        type=type,
        title=title,
        file_path=str(dest.relative_to(settings.uploads_dir)),
        tags=tags_list,
        is_active=False,
        position=position if type == "npc" else None,
    )
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)
    return artifact


@router.get("/api/scenes/{scene_id}/artifacts", response_model=list[ArtifactRead])
async def list_artifacts(
    scene_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_scene_or_404(scene_id, user.id, db)
    result = await db.execute(
        select(Artifact).where(Artifact.scene_id == scene_id).order_by(Artifact.created_at)
    )
    return result.scalars().all()


@router.patch("/api/artifacts/{artifact_id}", response_model=ArtifactRead)
async def patch_artifact(
    artifact_id: int,
    body: ArtifactPatch,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    artifact = await _get_artifact_or_404(artifact_id, user.id, db)

    if body.position is not None and artifact.type != "npc":
        raise HTTPException(status_code=400, detail="position is only valid for npc")

    if body.position is not None and body.position != artifact.position:
        await _check_npc_position_free(artifact.scene_id, body.position, db, exclude_id=artifact_id)

    if body.is_active is True:
        if artifact.type == "location_image":
            # снимаем is_active со всех других location_image этой сцены
            await db.execute(
                update(Artifact)
                .where(
                    Artifact.scene_id == artifact.scene_id,
                    Artifact.type == "location_image",
                    Artifact.id != artifact_id,
                )
                .values(is_active=False)
            )
        elif artifact.type == "npc":
            target_position = body.position or artifact.position
            if target_position is None:
                raise HTTPException(
                    status_code=400,
                    detail="npc must have a position before becoming active",
                )
            await _check_npc_position_free(
                artifact.scene_id, target_position, db, exclude_id=artifact_id
            )

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
        select(Artifact).join(Game).where(Artifact.id == artifact_id, Game.owner_id == user_id)
    )
    artifact = result.scalar_one_or_none()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    return artifact


async def _check_npc_position_free(
    scene_id: int, position: str, db: AsyncSession, exclude_id: int | None = None
) -> None:
    q = select(Artifact).where(
        Artifact.scene_id == scene_id,
        Artifact.type == "npc",
        Artifact.position == position,
        Artifact.is_active.is_(True),
    )
    if exclude_id is not None:
        q = q.where(Artifact.id != exclude_id)
    result = await db.execute(q)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"NPC position '{position}' is already taken")
