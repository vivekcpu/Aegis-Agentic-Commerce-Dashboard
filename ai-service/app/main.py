from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.db import get_pool, close_pool
from app.routers import discovery, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()  # warm the connection pool on startup
    yield
    await close_pool()


app = FastAPI(title="Aegis AI & Agentic Microservice", lifespan=lifespan)

app.include_router(discovery.router, prefix="/api", tags=["discovery"])
app.include_router(agent.router, prefix="/api", tags=["agent"])


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
