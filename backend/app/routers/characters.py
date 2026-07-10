from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import current_user
from app.models import Character, GamePlayer, User
from app.schemas import (
    CharacterCreate,
    CharacterPatch,
    CharacterRead,
    GamePlayerPatch,
    GamePlayerRead,
)

router = APIRouter(tags=["characters"])


@router.get("/api/characters", response_model=list[CharacterRead])
async def list_characters(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    result = await db.execute(
        select(Character).where(Character.owner_id == user.id).order_by(Character.created_at)
    )
    return result.scalars().all()


@router.post("/api/characters", response_model=CharacterRead, status_code=status.HTTP_201_CREATED)
async def create_character(
    body: CharacterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    char = Character(owner_id=user.id, name=body.name, bio=body.bio)
    db.add(char)
    await db.commit()
    await db.refresh(char)
    return char


@router.get("/api/characters/{char_id}", response_model=CharacterRead)
async def get_character(
    char_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    char = await db.get(Character, char_id)
    if not char or char.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Персонаж не найден")
    return char


@router.patch("/api/characters/{char_id}", response_model=CharacterRead)
async def patch_character(
    char_id: int,
    body: CharacterPatch,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    char = await db.get(Character, char_id)
    if not char or char.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Персонаж не найден")
    if body.name is not None:
        char.name = body.name
    if body.bio is not None:
        char.bio = body.bio
    await db.commit()
    await db.refresh(char)
    return char


@router.delete("/api/characters/{char_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    char_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    char = await db.get(Character, char_id)
    if not char or char.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Персонаж не найден")
    await db.delete(char)
    await db.commit()


@router.post("/api/characters/{char_id}/avatar", response_model=CharacterRead)
async def upload_character_avatar(
    char_id: int,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    char = await db.get(Character, char_id)
    if not char or char.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Персонаж не найден")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(status_code=400, detail="Недопустимый формат файла")

    dest = settings.uploads_dir / "characters" / f"char_{char_id}{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(await file.read())

    char.avatar = f"/uploads/characters/char_{char_id}{ext}"
    await db.commit()
    await db.refresh(char)
    return char


@router.patch("/api/games/{game_id}/players/{user_id}", response_model=GamePlayerRead)
async def patch_game_player(
    game_id: int,
    user_id: int,
    body: GamePlayerPatch,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Нельзя менять данные другого игрока")

    gp = await db.get(GamePlayer, (game_id, user_id))
    if not gp:
        raise HTTPException(status_code=404, detail="Запись игрока не найдена")

    if body.character_id is not None:
        char = await db.get(Character, body.character_id)
        if not char or char.owner_id != user.id:
            raise HTTPException(status_code=404, detail="Персонаж не найден")
        gp.character_id = body.character_id
    else:
        gp.character_id = None

    await db.commit()
    await db.refresh(gp)
    return gp
