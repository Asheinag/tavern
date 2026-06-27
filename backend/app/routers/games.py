import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.deps import current_user
from app.models import Game, User
from app.schemas import GameCreate, GameDetail, GamePatch, GameRead

router = APIRouter(prefix="/api/games", tags=["games"])


@router.get("", response_model=list[GameRead])
async def list_games(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Game).where(Game.owner_id == user.id))
    return result.scalars().all()


@router.post("", response_model=GameRead, status_code=status.HTTP_201_CREATED)
async def create_game(
    body: GameCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    game = Game(
        owner_id=user.id,
        title=body.title,
        system=body.system,
        share_code=secrets.token_urlsafe(16),
    )
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@router.get("/{game_id}", response_model=GameDetail)
async def get_game(
    game_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Game)
        .where(Game.id == game_id, Game.owner_id == user.id)
        .options(selectinload(Game.scenes), selectinload(Game.edges))
    )
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


@router.patch("/{game_id}", response_model=GameRead)
async def patch_game(
    game_id: int,
    body: GamePatch,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    game = await _get_game_or_404(game_id, user.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(game, field, value)
    await db.commit()
    await db.refresh(game)
    return game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_game(
    game_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    game = await _get_game_or_404(game_id, user.id, db)
    await db.delete(game)
    await db.commit()


async def _get_game_or_404(game_id: int, user_id: int, db: AsyncSession) -> Game:
    result = await db.execute(select(Game).where(Game.id == game_id, Game.owner_id == user_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game
