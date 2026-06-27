from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import edges, games, health, scenes

app = FastAPI(title="Tavern API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:80"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(games.router)
app.include_router(scenes.router)
app.include_router(edges.router)
