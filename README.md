# Tavern

Веб-приложение для проведения настольных ролевых игр (D&D и других НРИ).

## Что это

Мастер готовит кампанию как дерево сцен (таймлайн) и на лету показывает игрокам изображения, карты, музыку, NPC и заметки. Игроки видят «визуальную новеллу» со своих устройств по ссылке. Система-нейтральное — не привязано к механикам D&D.

## Стек

- **Backend:** Python + FastAPI, пакеты через uv
- **Frontend:** Vue 3 + TypeScript + Pinia, сборка Vite + npm
- **БД:** PostgreSQL 16 (Docker), SQLAlchemy + Alembic
- **Реалтайм:** WebSocket

## Быстрый старт

```bash
# Поднять всё локально
docker compose up

# Или по отдельности:
cd backend && uv run uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Структура

```
/backend     FastAPI (app/, alembic/, pyproject.toml)
/frontend    Vue 3 + Vite (src/, package.json)
docker-compose.yml
.env.example
```
