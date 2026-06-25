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
from app.routers import defaulters, notices, ai_agent, users
from app.services.AI_Agent_service import initialize_agent
from sqlalchemy import text


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create user_login table if not exists
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    """
                    CREATE TABLE IF NOT EXISTS user_login (
                        user_id VARCHAR(255) PRIMARY KEY,
                        password_hash VARCHAR(255) NOT NULL
                    );
                    """
                )
            )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error(
            "Failed to initialize database table user_login: %s", exc
        )

    # Startup: build the LangGraph agent (validates LLM credentials)
    try:
        initialize_agent()
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "AI Agent failed to initialize: %s — /ai/chat will return errors.", exc
        )

    yield

    # Shutdown: close DB connection pools
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
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(defaulters.router)
app.include_router(notices.router)
app.include_router(ai_agent.router)
app.include_router(users.router)


@app.get("/health", tags=["Health"], summary="Health check")
async def health():
    return {"status": "ok", "version": "2.0.0"}
