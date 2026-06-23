"""
app/main.py
-----------
FastAPI application entry point.

Lifespan context manager handles:
  - Startup : nothing extra needed (engine is module-level)
  - Shutdown: disposes the async connection pool gracefully
"""

from contextlib import asynccontextmanager
import warnings

# Suppress requests dependency warning
try:
    from requests.exceptions import RequestsDependencyWarning
    warnings.filterwarnings("ignore", category=RequestsDependencyWarning)
except ImportError:
    pass

from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.routers import defaulters, notices



@asynccontextmanager
async def lifespan(app: FastAPI):
    
    yield
    
    await engine.dispose()


app = FastAPI(
    title="Revenue Recovery System API",
    description=(
        "Property tax defaulters API. "
        "All queries are hand-written SQL executed against PostgreSQL via asyncpg."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(defaulters.router)
app.include_router(notices.router)


@app.get("/health", tags=["Health"], summary="Health check")
async def health():
    return {"status": "ok", "version": "2.0.0"}
