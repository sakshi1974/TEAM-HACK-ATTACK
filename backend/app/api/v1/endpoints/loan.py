# File: app/api/v1/endpoints/loan.py

from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    LoanRequest, LoanResponse, LoansListResponse,
    LoanApplicationRequest, LoanApplicationResponse,
    EKYCRequest, EKYCResponse,
    VideoKYCRequest, VideoKYCResponse,
)
from app.services.loan_service import (
    evaluate_and_store_loan, get_all_loans,
    evaluate_loan_v2, get_all_loans_v2, update_loan_kyc,
)
from app.services.kyc_service import run_ekyc, run_video_kyc
from app.services.audit_service import add_audit_log

router = APIRouter()


# ── Original endpoints (preserved) ──

@router.post(
    "/loan/apply",
    response_model=LoanResponse,
    summary="Apply for a Loan",
    description=(
        "Submit a loan application. The AI governance engine evaluates the application "
        "using rule-based risk scoring and returns a decision (APPROVED / REVIEW / REJECTED) "
        "with a plain-English explanation."
    ),
)
async def apply_for_loan(request: LoanRequest) -> LoanResponse:
    """POST /api/v1/loan/apply"""
    try:
        result = evaluate_and_store_loan(
            name=request.name,
            income=request.income,
            credit_score=request.credit_score,
            loan_amount=request.loan_amount,
        )
        return LoanResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Loan evaluation error: {exc}")


@router.get(
    "/loan/list",
    response_model=LoansListResponse,
    summary="List All Loans",
    description="Retrieve all loan applications, newest first.",
)
async def list_loans() -> LoansListResponse:
    """GET /api/v1/loan/list"""
    return LoansListResponse(loans=get_all_loans())


# ── V2 Indian-format endpoints ──

@router.post(
    "/loan/apply-v2",
    response_model=LoanApplicationResponse,
    summary="Apply for Loan (Indian Format)",
    description=(
        "Submit a loan application with Indian identity documents (Aadhaar, PAN). "
        "Returns structured AI decision with risk score, confidence, and supervisor validation."
    ),
)
async def apply_for_loan_v2(request: LoanApplicationRequest) -> LoanApplicationResponse:
    """POST /api/v1/loan/apply-v2"""
    try:
        geo = None
        if request.geo_location:
            geo = request.geo_location.model_dump()

        result = evaluate_loan_v2(
            name=request.name,
            mobile=request.mobile,
            aadhaar=request.aadhaar,
            pan=request.pan,
            income=request.income,
            credit_score=request.credit_score,
            loan_amount=request.loan_amount,
            geo_location=geo,
        )
        return LoanApplicationResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Loan evaluation error: {exc}")


@router.get(
    "/loan/list-v2",
    summary="List All V2 Loans",
    description="Retrieve all V2 loan applications, newest first.",
)
async def list_loans_v2():
    """GET /api/v1/loan/list-v2"""
    return {"loans": get_all_loans_v2()}


# ── KYC endpoints ──

@router.post(
    "/loan/ekyc",
    response_model=EKYCResponse,
    summary="eKYC Verification",
    description="Simulate AI-based eKYC verification for Aadhaar and PAN.",
)
async def ekyc_verification(request: EKYCRequest) -> EKYCResponse:
    """POST /api/v1/loan/ekyc"""
    try:
        result = run_ekyc(
            aadhaar=request.aadhaar,
            pan=request.pan,
            name=request.name,
        )

        # Log to audit trail
        add_audit_log(
            event_type="KYC_VERIFICATION",
            explanation=result["explanation"],
            user=request.name,
            agent="eKYC-Agent",
            details={
                "kyc_type": "eKYC",
                "status": result["status"],
                "confidence": result["confidence"],
                "checks": result["checks"],
            },
        )

        return EKYCResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"eKYC error: {exc}")


@router.post(
    "/loan/video-kyc",
    response_model=VideoKYCResponse,
    summary="Video KYC Verification",
    description="Simulate AI-powered video KYC with face matching and liveness detection.",
)
async def video_kyc_verification(request: VideoKYCRequest) -> VideoKYCResponse:
    """POST /api/v1/loan/video-kyc"""
    try:
        result = run_video_kyc(
            loan_id=request.loan_id,
            name=request.name,
        )

        # Update loan record
        update_loan_kyc(request.loan_id, "video_kyc", result["status"])

        # Log to audit trail
        add_audit_log(
            event_type="KYC_VERIFICATION",
            explanation=result["explanation"],
            user=request.name,
            agent="VideoKYC-Agent",
            details={
                "kyc_type": "video_kyc",
                "loan_id": request.loan_id,
                "status": result["status"],
                "face_match": result["face_match"],
                "liveness_check": result["liveness_check"],
            },
        )

        return VideoKYCResponse(**result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Video KYC error: {exc}")
