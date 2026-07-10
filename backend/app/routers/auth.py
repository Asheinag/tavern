import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import bcrypt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import get_db
from app.deps import SESSION_COOKIE, current_user
from app.models import AuthSession, InviteCode, User
from app.schemas import LoginIn, RegisterIn, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])

SESSION_TTL_DAYS = 30


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


async def _create_session(db: AsyncSession, user_id: int) -> str:
    session_id = uuid.uuid4().hex
    expires_at = datetime.now(UTC) + timedelta(days=SESSION_TTL_DAYS)
    db.add(AuthSession(id=session_id, user_id=user_id, expires_at=expires_at))
    await db.commit()
    return session_id


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InviteCode).where(
            InviteCode.code == body.invite_code,
            InviteCode.used_by.is_(None),
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=400, detail="Инвайт-код недействителен или уже использован")

    now = datetime.now(UTC)
    if invite.expires_at and invite.expires_at < now:
        raise HTTPException(status_code=400, detail="Инвайт-код истёк")

    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")

    user = User(username=body.username, password_hash=_hash(body.password))
    db.add(user)
    await db.flush()

    invite.used_by = user.id
    invite.used_at = now
    await db.commit()
    await db.refresh(user)

    session_id = await _create_session(db, user.id)
    response.set_cookie(
        SESSION_COOKIE, session_id, httponly=True, samesite="lax", max_age=SESSION_TTL_DAYS * 86400
    )
    return user


@router.post("/login", response_model=UserRead)
async def login(body: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not _verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")

    session_id = await _create_session(db, user.id)
    response.set_cookie(
        SESSION_COOKIE, session_id, httponly=True, samesite="lax", max_age=SESSION_TTL_DAYS * 86400
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE),
):
    if session_id:
        session = await db.get(AuthSession, session_id)
        if session:
            await db.delete(session)
            await db.commit()
    response.delete_cookie(SESSION_COOKIE)


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(current_user)):
    return user


@router.post("/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(current_user),
):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise HTTPException(status_code=400, detail="Недопустимый формат файла")

    dest = settings.uploads_dir / "avatars" / f"user_{user.id}{ext}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(await file.read())

    user.avatar = f"/uploads/avatars/user_{user.id}{ext}"
    await db.commit()
    await db.refresh(user)
    return user
