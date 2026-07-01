from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Game, SessionLog
from app.schemas import SessionLogCreate, SessionLogRead

router = APIRouter(prefix="/api/games", tags=["log"])


@router.get("/{game_id}/log", response_model=list[SessionLogRead])
async def get_log(
    game_id: int,
    db: AsyncSession = Depends(get_db),
):
    await _get_game_or_404(game_id, db)
    result = await db.execute(
        select(SessionLog).where(SessionLog.game_id == game_id).order_by(SessionLog.ts)
    )
    return result.scalars().all()


@router.post(
    "/{game_id}/log",
    response_model=SessionLogRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_log_entry(
    game_id: int,
    body: SessionLogCreate,
    db: AsyncSession = Depends(get_db),
):
    await _get_game_or_404(game_id, db)
    entry = SessionLog(game_id=game_id, kind="note", text=body.text)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def _get_game_or_404(game_id: int, db: AsyncSession) -> Game:
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game
