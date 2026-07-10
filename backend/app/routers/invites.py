import secrets

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.deps import admin_user
from app.models import InviteCode, User
from app.schemas import InviteCodeCreate, InviteCodeRead

router = APIRouter(prefix="/api/invites", tags=["invites"])


@router.post("", response_model=InviteCodeRead, status_code=status.HTTP_201_CREATED)
async def create_invite(
    body: InviteCodeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user),
):
    invite = InviteCode(
        code=secrets.token_urlsafe(32),
        created_by=user.id,
        expires_at=body.expires_at,
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


@router.get("", response_model=list[InviteCodeRead])
async def list_invites(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(admin_user),
):
    result = await db.execute(
        select(InviteCode)
        .where(InviteCode.created_by == user.id)
        .order_by(InviteCode.created_at.desc())
    )
    return result.scalars().all()
