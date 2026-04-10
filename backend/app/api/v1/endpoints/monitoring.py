# File: app/api/v1/endpoints/monitoring.py

from fastapi import APIRouter, HTTPException
from app.models.schemas import MonitorRequest, MonitorResponse
from app.services.anomaly_service import detect_anomalies

router = APIRouter()


@router.post(
    "/monitor/analyze",
    response_model=MonitorResponse,
    summary="Anomaly Detection",
    description=(
        "Submit a list of numeric metric values. "
        "Uses Isolation Forest to identify anomalies. "
        "Returns ALERT if anomalies are found, OK otherwise."
    ),
)
async def analyze_metrics(request: MonitorRequest) -> MonitorResponse:
    """
    POST /api/v1/monitor/analyze

    Accepts a list of float metrics, runs Isolation Forest,
    and returns whether any anomalies were detected.
    """
    try:
        has_anomaly, scores, anomaly_count = detect_anomalies(request.metrics)
        return MonitorResponse(
            anomaly=has_anomaly,
            status="ALERT" if has_anomaly else "OK",
            anomaly_count=anomaly_count,
            total_points=len(request.metrics),
            scores=scores,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")
