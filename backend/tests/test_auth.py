import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InviteCode, User
from app.routers.auth import _hash


async def _make_admin(db: AsyncSession) -> User:
    user = User(username="admin", password_hash=_hash("adminpass"), system_role="admin")
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _make_invite(db: AsyncSession, created_by: int) -> InviteCode:
    invite = InviteCode(code="TESTCODE123", created_by=created_by)
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


@pytest.mark.asyncio
async def test_register_happy_path(client: AsyncClient, db_session: AsyncSession):
    admin = await _make_admin(db_session)
    await _make_invite(db_session, admin.id)

    r = await client.post(
        "/api/auth/register",
        json={"username": "player1", "password": "secret", "invite_code": "TESTCODE123"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["username"] == "player1"
    assert data["system_role"] == "user"
    assert "session_id" in r.cookies


@pytest.mark.asyncio
async def test_register_invalid_invite(client: AsyncClient, db_session: AsyncSession):
    r = await client.post(
        "/api/auth/register",
        json={"username": "player1", "password": "secret", "invite_code": "BADCODE"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient, db_session: AsyncSession):
    admin = await _make_admin(db_session)
    await _make_invite(db_session, admin.id)

    await client.post(
        "/api/auth/register",
        json={"username": "player1", "password": "secret", "invite_code": "TESTCODE123"},
    )
    invite2 = InviteCode(code="CODE2", created_by=admin.id)
    db_session.add(invite2)
    await db_session.commit()

    r = await client.post(
        "/api/auth/register",
        json={"username": "player1", "password": "other", "invite_code": "CODE2"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_invite_already_used(client: AsyncClient, db_session: AsyncSession):
    admin = await _make_admin(db_session)
    invite = await _make_invite(db_session, admin.id)

    await client.post(
        "/api/auth/register",
        json={"username": "player1", "password": "secret", "invite_code": invite.code},
    )
    r = await client.post(
        "/api/auth/register",
        json={"username": "player2", "password": "secret", "invite_code": invite.code},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_login_happy_path(client: AsyncClient, db_session: AsyncSession):
    db_session.add(User(username="tester", password_hash=_hash("pass123")))
    await db_session.commit()

    r = await client.post("/api/auth/login", json={"username": "tester", "password": "pass123"})
    assert r.status_code == 200
    assert r.json()["username"] == "tester"
    assert "session_id" in r.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session: AsyncSession):
    db_session.add(User(username="tester", password_hash=_hash("pass123")))
    await db_session.commit()

    r = await client.post("/api/auth/login", json={"username": "tester", "password": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client: AsyncClient):
    r = await client.post("/api/auth/login", json={"username": "ghost", "password": "x"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(raw_client: AsyncClient, db_session: AsyncSession):
    db_session.add(User(username="tester", password_hash=_hash("pass")))
    await db_session.commit()

    await raw_client.post("/api/auth/login", json={"username": "tester", "password": "pass"})
    r = await raw_client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["username"] == "tester"


@pytest.mark.asyncio
async def test_me_unauthenticated(raw_client: AsyncClient):
    r = await raw_client.get("/api/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_logout(raw_client: AsyncClient, db_session: AsyncSession):
    db_session.add(User(username="tester", password_hash=_hash("pass")))
    await db_session.commit()

    await raw_client.post("/api/auth/login", json={"username": "tester", "password": "pass"})
    r = await raw_client.post("/api/auth/logout")
    assert r.status_code == 204

    r = await raw_client.get("/api/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_invite_as_admin(client: AsyncClient, db_session: AsyncSession, app_with_user):
    admin = await _make_admin(db_session)
    ac, cleanup = await app_with_user(admin)
    async with ac as c:
        r = await c.post("/api/invites", json={})
        assert r.status_code == 201
        assert r.json()["code"]
    await cleanup()


@pytest.mark.asyncio
async def test_create_invite_as_regular_user(
    client: AsyncClient, db_session: AsyncSession, app_with_user
):
    user = User(username="regular", password_hash=_hash("pass"), system_role="user")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    ac, cleanup = await app_with_user(user)
    async with ac as c:
        r = await c.post("/api/invites", json={})
        assert r.status_code == 403
    await cleanup()


@pytest.mark.asyncio
async def test_list_invites(client: AsyncClient, db_session: AsyncSession, app_with_user):
    admin = await _make_admin(db_session)
    await _make_invite(db_session, admin.id)

    ac, cleanup = await app_with_user(admin)
    async with ac as c:
        r = await c.get("/api/invites")
        assert r.status_code == 200
        assert len(r.json()) == 1
    await cleanup()
