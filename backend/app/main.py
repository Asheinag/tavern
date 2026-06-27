from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.realtime.ws import router as ws_router
from app.routers import artifacts, edges, games, health, scenes

app = FastAPI(title="Tavern API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80"],
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

app.include_router(health.router)
app.include_router(games.router)
app.include_router(scenes.router)
app.include_router(edges.router)
app.include_router(artifacts.router)
app.include_router(ws_router)
