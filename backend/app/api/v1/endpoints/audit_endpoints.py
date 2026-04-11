# File: app/api/v1/endpoints/audit_endpoints.py

from fastapi import APIRouter, Query
from typing import Optional
from app.models.schemas import AuditLogListResponse, DashboardStats
from app.services.audit_service import (
    get_audit_logs,
    get_important_logs,
    get_dashboard_stats,
    clear_audit_logs,
)

router = APIRouter()


@router.get(
    "/audit/logs",
    response_model=AuditLogListResponse,
    summary="Get Audit Logs",
    description="Retrieve filtered audit logs. Supports filtering by user, agent, risk level, and event type.",
)
async def list_audit_logs(
    user: Optional[str] = Query(None, description="Filter by user name"),
    agent: Optional[str] = Query(None, description="Filter by agent name"),
    risk_level: Optional[str] = Query(None, description="HIGH, MEDIUM, or LOW"),
    event_type: Optional[str] = Query(None, description="LOAN_APPLICATION, KYC_VERIFICATION, AI_DECISION, ALERT"),
    important_only: bool = Query(False, description="Show only important/high-priority logs"),
):
    """GET /api/v1/audit/logs"""
    logs = get_audit_logs(
        user=user,
        agent=agent,
        risk_level=risk_level,
        event_type=event_type,
        important_only=important_only,
    )
    return AuditLogListResponse(logs=logs, total=len(logs))


@router.get(
    "/audit/important",
    response_model=AuditLogListResponse,
    summary="Get Important Logs",
    description="Get only high-priority audit logs (high risk, rejections, anomalies).",
)
async def list_important_logs():
    """GET /api/v1/audit/important"""
    logs = get_important_logs()
    return AuditLogListResponse(logs=logs, total=len(logs))


@router.get(
    "/audit/dashboard-stats",
    response_model=DashboardStats,
    summary="Dashboard Statistics",
    description="Get aggregated metrics for the dashboard (total loans, approval rate, risk distribution, etc.).",
)
async def dashboard_stats():
    """GET /api/v1/audit/dashboard-stats"""
    return get_dashboard_stats()


@router.delete(
    "/audit/logs",
    summary="Clear Audit Logs",
    description="Delete all audit logs.",
)
async def delete_audit_logs():
    """DELETE /api/v1/audit/logs"""
    count = clear_audit_logs()
    return {"cleared": count, "message": f"Cleared {count} audit log entries."}
