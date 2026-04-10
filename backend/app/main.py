# File: app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.models.schemas import HealthResponse

# ──────────────────────────────────────────────
# Application factory
# ──────────────────────────────────────────────

app = FastAPI(
    title="Autonomous Agent Governance & Observability Platform",
    description=(
        "A production-ready backend for governing and observing autonomous AI agents. "
        "Powered by Llama 3 (via Ollama) and scikit-learn anomaly detection."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ──────────────────────────────────────────────
# CORS – allow all origins (adjust in production)
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────

app.include_router(api_router, prefix="/api/v1")

# ──────────────────────────────────────────────
# Root health endpoint
# ──────────────────────────────────────────────

@app.get(
    "/",
    response_model=HealthResponse,
    summary="Health Check",
    tags=["Health"],
)
async def root() -> HealthResponse:
    """Root endpoint – confirms the API is alive."""
    return HealthResponse(
        status="healthy",
        message="Autonomous Agent Governance & Observability Platform is running.",
        version="1.0.0",
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Detailed Health Check",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    """Detailed health check endpoint."""
    return HealthResponse(
        status="healthy",
        message="All systems operational.",
        version="1.0.0",
    )
