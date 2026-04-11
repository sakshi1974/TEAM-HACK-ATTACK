# File: app/main.py

import asyncio
import json
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
    version="2.0.0",
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
        version="2.0.0",
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
        version="2.0.0",
    )


# ──────────────────────────────────────────────
# WebSocket — Real-time notifications
# ──────────────────────────────────────────────

class ConnectionManager:
    """Manages WebSocket connections for real-time broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send a message to all connected clients."""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.
    Clients connect here to receive live notifications about:
    - New loan applications
    - KYC verifications
    - AI decisions
    - Alerts
    - Dashboard stat changes
    """
    await manager.connect(websocket)
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "CONNECTED",
            "message": "Connected to real-time notification stream.",
        })

        # Keep connection alive and listen for client messages
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                # Echo back or handle client messages if needed
                if data == "ping":
                    await websocket.send_json({"type": "PONG"})
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                try:
                    await websocket.send_json({"type": "HEARTBEAT"})
                except Exception:
                    break
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


def get_ws_manager() -> ConnectionManager:
    """Get the WebSocket connection manager for broadcasting from services."""
    return manager
