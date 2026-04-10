# File: app/api/v1/endpoints/loan.py

from fastapi import APIRouter, HTTPException
from app.models.schemas import LoanRequest, LoanResponse, LoansListResponse
from app.services.loan_service import evaluate_and_store_loan, get_all_loans

router = APIRouter()


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
