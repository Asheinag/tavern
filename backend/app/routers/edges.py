from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import current_user
from app.models import Edge, Game, Scene, User
from app.schemas import EdgeCreate, EdgePatch, EdgeRead

router = APIRouter(tags=["edges"])


@router.post(
    "/api/games/{game_id}/edges",
    response_model=EdgeRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_edge(
    game_id: int,
    body: EdgeCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_game_or_404(game_id, user.id, db)
    await _get_scene_or_404(body.from_scene_id, game_id, db)
    await _get_scene_or_404(body.to_scene_id, game_id, db)
    edge = Edge(game_id=game_id, **body.model_dump())
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return edge


@router.patch("/api/edges/{edge_id}", response_model=EdgeRead)
async def patch_edge(
    edge_id: int,
    body: EdgePatch,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    edge = await _get_edge_or_404(edge_id, user.id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(edge, field, value)
    await db.commit()
    await db.refresh(edge)
    return edge


@router.delete("/api/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_edge(
    edge_id: int,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    edge = await _get_edge_or_404(edge_id, user.id, db)
    await db.delete(edge)
    await db.commit()


async def _get_game_or_404(game_id: int, user_id: int, db: AsyncSession) -> Game:
    result = await db.execute(select(Game).where(Game.id == game_id, Game.owner_id == user_id))
    game = result.scalar_one_or_none()
    if not game:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return game


async def _get_scene_or_404(scene_id: int, game_id: int, db: AsyncSession) -> Scene:
    result = await db.execute(select(Scene).where(Scene.id == scene_id, Scene.game_id == game_id))
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scene not found")
    return scene


async def _get_edge_or_404(edge_id: int, user_id: int, db: AsyncSession) -> Edge:
    result = await db.execute(
        select(Edge).join(Game).where(Edge.id == edge_id, Game.owner_id == user_id)
    )
    edge = result.scalar_one_or_none()
    if not edge:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edge not found")
    return edge
