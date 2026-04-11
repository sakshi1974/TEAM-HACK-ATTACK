# File: app/services/audit_service.py

import uuid
from datetime import datetime, timezone
from typing import List, Optional

# ── In-memory audit log store ──
_audit_logs: List[dict] = []

# Event types that are considered important
IMPORTANT_EVENT_TYPES = {"LOAN_APPLICATION", "KYC_VERIFICATION", "AI_DECISION", "ALERT"}


def add_audit_log(
    event_type: str,
    explanation: str,
    user: Optional[str] = None,
    agent: Optional[str] = None,
    risk_score: Optional[float] = None,
    decision: Optional[str] = None,
    details: Optional[dict] = None,
) -> dict:
    """
    Add a new audit log entry.
    Automatically determines if the log is 'important' based on decision parameters.
    """
    is_important = _check_importance(event_type, risk_score, decision, details)

    entry = {
        "id": str(uuid.uuid4())[:12].upper(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "user": user,
        "agent": agent,
        "risk_score": risk_score,
        "decision": decision,
        "explanation": explanation,
        "details": details or {},
        "is_important": is_important,
    }
    _audit_logs.insert(0, entry)  # newest first
    return entry


def _check_importance(
    event_type: str,
    risk_score: Optional[float],
    decision: Optional[str],
    details: Optional[dict],
) -> bool:
    """
    Decision parameter logic for selecting important audit logs.
    Prioritize logs where:
      - risk_score > 0.7
      - anomaly detected
      - decision = REJECTED
      - event_type is in IMPORTANT_EVENT_TYPES
    """
    if event_type in IMPORTANT_EVENT_TYPES:
        return True
    if risk_score is not None and risk_score > 0.7:
        return True
    if decision == "REJECTED":
        return True
    if details and details.get("anomaly_detected"):
        return True
    return False


def get_audit_logs(
    user: Optional[str] = None,
    agent: Optional[str] = None,
    risk_level: Optional[str] = None,
    event_type: Optional[str] = None,
    important_only: bool = False,
) -> List[dict]:
    """
    Get filtered audit logs.
    risk_level: HIGH (>0.7), MEDIUM (0.4-0.7), LOW (<0.4)
    """
    results = _audit_logs

    if user:
        results = [r for r in results if r.get("user") and user.lower() in r["user"].lower()]
    if agent:
        results = [r for r in results if r.get("agent") and agent.lower() in r["agent"].lower()]
    if event_type:
        results = [r for r in results if r["event_type"] == event_type]
    if important_only:
        results = [r for r in results if r["is_important"]]
    if risk_level:
        results = _filter_by_risk_level(results, risk_level)

    return results


def _filter_by_risk_level(logs: List[dict], level: str) -> List[dict]:
    """Filter logs by risk level category."""
    filtered = []
    for log in logs:
        score = log.get("risk_score")
        if score is None:
            continue
        if level == "HIGH" and score > 0.7:
            filtered.append(log)
        elif level == "MEDIUM" and 0.4 <= score <= 0.7:
            filtered.append(log)
        elif level == "LOW" and score < 0.4:
            filtered.append(log)
    return filtered


def get_important_logs() -> List[dict]:
    """Get only important/high-priority audit logs."""
    return [log for log in _audit_logs if log["is_important"]]


def get_dashboard_stats() -> dict:
    """
    Compute dashboard statistics from audit logs and loan records.
    """
    loan_logs = [l for l in _audit_logs if l["event_type"] == "LOAN_APPLICATION"]
    total_loans = len(loan_logs)

    approved = sum(1 for l in loan_logs if l.get("decision") == "APPROVED")
    rejected = sum(1 for l in loan_logs if l.get("decision") == "REJECTED")
    review = sum(1 for l in loan_logs if l.get("decision") == "REVIEW")

    risk_scores = [l["risk_score"] for l in loan_logs if l.get("risk_score") is not None]
    high_risk = sum(1 for s in risk_scores if s > 0.7)

    alert_logs = [l for l in _audit_logs if l["event_type"] == "ALERT" or l.get("decision") == "REJECTED"]

    # Build trend data (group by date)
    trends: dict = {}
    for log in loan_logs:
        date = log["timestamp"][:10]  # YYYY-MM-DD
        if date not in trends:
            trends[date] = {"date": date, "count": 0, "approved": 0, "rejected": 0}
        trends[date]["count"] += 1
        if log.get("decision") == "APPROVED":
            trends[date]["approved"] += 1
        elif log.get("decision") == "REJECTED":
            trends[date]["rejected"] += 1

    # Risk distribution
    risk_dist = [
        {"level": "Low (<0.4)", "count": sum(1 for s in risk_scores if s < 0.4)},
        {"level": "Medium (0.4-0.7)", "count": sum(1 for s in risk_scores if 0.4 <= s <= 0.7)},
        {"level": "High (>0.7)", "count": sum(1 for s in risk_scores if s > 0.7)},
    ]

    return {
        "total_loans": total_loans,
        "approved": approved,
        "rejected": rejected,
        "under_review": review,
        "approval_rate": round((approved / max(total_loans, 1)) * 100, 1),
        "high_risk_percent": round((high_risk / max(total_loans, 1)) * 100, 1),
        "alerts_triggered": len(alert_logs),
        "avg_risk_score": round(sum(risk_scores) / max(len(risk_scores), 1), 2),
        "loan_trends": list(trends.values()),
        "risk_distribution": risk_dist,
    }


def clear_audit_logs() -> int:
    """Clear all audit logs. Returns count cleared."""
    count = len(_audit_logs)
    _audit_logs.clear()
    return count
