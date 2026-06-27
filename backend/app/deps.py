from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User


async def current_user(db: AsyncSession = Depends(get_db)) -> User:
    """Заглушка аутентификации — возвращает первого пользователя или создаёт dev-пользователя.
    Заменить реальной auth при решении вопроса (архитектура §6).
    """
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        user = User(name="Dev Master")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user
