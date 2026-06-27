from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models import Game, Scene, User
from app.schemas import SceneCreate, ScenePatch, SceneRead

router = APIRouter(tags=["scenes"])


@router.post(
    "/api/games/{game_id}/scenes",
    response_model=SceneRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_scene(
    game_id: int,
    body: SceneCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_game_or_404(game_id, user.id, db)
    scene = Scene(game_id=game_id, **body.model_dump())
    db.add(scene)
    await db.commit()
    await db.refresh(scene)
    return scene


@router.patch("/api/scenes/{scene_id}", response_model=SceneRead)
async def patch_scene(
    scene_id: int,
    body: ScenePatch,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    scene = await _get_scene_or_404(scene_id, user.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(scene, field, value)
    await db.commit()
    await db.refresh(scene)
    return scene


@router.delete("/api/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scene(
    scene_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    scene = await _get_scene_or_404(scene_id, user.id, db)
    await db.delete(scene)
    await db.commit()


async def _get_game_or_404(game_id: int, user_id: int, db: AsyncSession) -> Game:
    result = await db.execute(select(Game).where(Game.id == game_id, Game.owner_id == user_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


async def _get_scene_or_404(scene_id: int, user_id: int, db: AsyncSession) -> Scene:
    result = await db.execute(
        select(Scene).join(Game).where(Scene.id == scene_id, Game.owner_id == user_id)
    )
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    return scene
