# File: app/services/loan_service.py

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from app.services.audit_service import add_audit_log
from app.services.supervisor_service import supervise_decision

# ── In-memory loan store (resets on server restart, fine for demo) ──
_loans: List[dict] = []
_loans_v2: List[dict] = []


# ─────────────────────────────────────────────────────────────────────
# Original Public API (preserved)
# ─────────────────────────────────────────────────────────────────────

def evaluate_and_store_loan(
    name: str,
    income: float,
    credit_score: int,
    loan_amount: float,
) -> dict:
    """
    Apply rule-based risk scoring, make a decision, generate explanations,
    persist the record, and return the full loan object.
    """
    loan_id      = str(uuid.uuid4())[:8].upper()
    risk_score, factors = _compute_risk(income, credit_score, loan_amount)

    if risk_score <= 15:
        decision = status = "APPROVED"
    elif risk_score <= 45:
        decision = status = "REVIEW"
    else:
        decision = status = "REJECTED"

    reason, simple_explanation = _build_explanations(
        decision, name, income, credit_score, loan_amount, factors
    )

    loan = {
        "id":                 loan_id,
        "name":               name,
        "income":             income,
        "credit_score":       credit_score,
        "loan_amount":        loan_amount,
        "decision":           decision,
        "status":             status,
        "risk_score":         round(risk_score, 1),
        "reason":             reason,
        "simple_explanation": simple_explanation,
        "timestamp":          datetime.now(timezone.utc).isoformat(),
    }
    _loans.insert(0, loan)   # newest first
    return loan


def get_all_loans() -> List[dict]:
    """Return all loans, newest first."""
    return _loans


# ─────────────────────────────────────────────────────────────────────
# V2 Loan API — Indian format with enhanced AI decision
# ─────────────────────────────────────────────────────────────────────

def evaluate_loan_v2(
    name: str,
    mobile: str,
    aadhaar: str,
    pan: str,
    income: float,
    credit_score: int,
    loan_amount: float,
    geo_location: Optional[dict] = None,
) -> dict:
    """
    Enhanced loan evaluation with:
    - Normalized risk score (0.0-1.0)
    - Confidence score
    - Supervisor agent validation
    - Audit trail logging
    - Geo-location attachment
    """
    loan_id = str(uuid.uuid4())[:8].upper()
    raw_risk, factors = _compute_risk(income, credit_score, loan_amount)

    # Normalize risk score to 0.0 - 1.0 range
    # Raw risk ranges roughly from -60 to +130
    normalized_risk = max(0.0, min(1.0, (raw_risk + 60) / 190))
    normalized_risk = round(normalized_risk, 3)

    # Compute confidence based on data completeness and score clarity
    confidence = _compute_confidence(normalized_risk, income, credit_score, loan_amount)

    # Decision based on normalized risk
    if normalized_risk <= 0.3:
        decision = "APPROVED"
    elif normalized_risk <= 0.6:
        decision = "REVIEW"
    else:
        decision = "REJECTED"

    status = decision

    reason, simple_explanation = _build_explanations(
        decision, name, income, credit_score, loan_amount, factors
    )

    # ── Supervisor Agent validation ──
    supervisor = supervise_decision(
        decision=decision,
        risk_score=normalized_risk,
        income=income,
        loan_amount=loan_amount,
        credit_score=credit_score,
    )

    # Mask Aadhaar for display
    aadhaar_masked = "XXXX-XXXX-" + aadhaar[-4:]

    loan = {
        "id": loan_id,
        "name": name,
        "mobile": mobile,
        "aadhaar_masked": aadhaar_masked,
        "pan": pan,
        "income": income,
        "credit_score": credit_score,
        "loan_amount": loan_amount,
        "decision": decision,
        "status": status,
        "risk_score": normalized_risk,
        "confidence": confidence,
        "reason": reason,
        "simple_explanation": simple_explanation,
        "geo_location": geo_location,
        "ekyc_status": None,
        "video_kyc_status": None,
        "supervisor_status": supervisor["status"],
        "supervisor_explanation": supervisor["explanation"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _loans_v2.insert(0, loan)

    # ── Log to audit trail ──
    add_audit_log(
        event_type="LOAN_APPLICATION",
        explanation=simple_explanation,
        user=name,
        agent="LoanDecisionAgent",
        risk_score=normalized_risk,
        decision=decision,
        details={
            "loan_id": loan_id,
            "loan_amount": loan_amount,
            "income": income,
            "credit_score": credit_score,
            "confidence": confidence,
            "factors": factors,
            "geo_location": geo_location,
        },
    )

    # Log supervisor result
    add_audit_log(
        event_type="AI_DECISION",
        explanation=supervisor["explanation"],
        user=name,
        agent="SupervisorAgent",
        risk_score=normalized_risk,
        decision=supervisor["validated_decision"],
        details={
            "loan_id": loan_id,
            "status": supervisor["status"],
            "checks_passed": supervisor["checks_passed"],
            "checks_failed": supervisor["checks_failed"],
        },
    )

    # If rejected or high risk → log alert
    if decision == "REJECTED" or normalized_risk > 0.7:
        add_audit_log(
            event_type="ALERT",
            explanation=f"High-risk loan application detected for {name}. "
                        f"Risk score: {normalized_risk:.2f}, Decision: {decision}. "
                        f"Factors: {', '.join(factors)}.",
            user=name,
            agent="RiskAlertSystem",
            risk_score=normalized_risk,
            decision=decision,
            details={"loan_id": loan_id, "alert_type": "HIGH_RISK_APPLICATION"},
        )

    return loan


def get_all_loans_v2() -> List[dict]:
    """Return all v2 loans, newest first."""
    return _loans_v2


def get_loan_by_id(loan_id: str) -> Optional[dict]:
    """Find a loan by ID (searches both v1 and v2)."""
    for loan in _loans_v2:
        if loan["id"] == loan_id:
            return loan
    for loan in _loans:
        if loan["id"] == loan_id:
            return loan
    return None


def update_loan_kyc(loan_id: str, kyc_type: str, status: str) -> Optional[dict]:
    """Update KYC status for a V2 loan."""
    for loan in _loans_v2:
        if loan["id"] == loan_id:
            if kyc_type == "ekyc":
                loan["ekyc_status"] = status
            elif kyc_type == "video_kyc":
                loan["video_kyc_status"] = status
            return loan
    return None


# ─────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────

def _compute_risk(
    income: float,
    credit_score: int,
    loan_amount: float,
) -> Tuple[float, List[str]]:
    """
    Lower score  → lower risk → more likely APPROVED.
    Higher score → higher risk → more likely REJECTED.
    """
    score: float = 0.0
    factors: List[str] = []

    # 1. Credit score
    if credit_score >= 750:
        score  -= 25;  factors.append("excellent credit score")
    elif credit_score >= 700:
        score  -= 10;  factors.append("good credit score")
    elif credit_score >= 650:
        score  += 15;  factors.append("fair credit score")
    elif credit_score >= 600:
        score  += 30;  factors.append("below-average credit score")
    else:
        score  += 55;  factors.append("poor credit score")

    # 2. Loan-to-income ratio
    ratio = loan_amount / max(income, 1.0)
    if ratio <= 2:
        score  -= 20;  factors.append("low loan-to-income ratio")
    elif ratio <= 4:
        score  +=  5;  factors.append("moderate loan-to-income ratio")
    elif ratio <= 7:
        score  += 25;  factors.append("high loan-to-income ratio")
    else:
        score  += 45;  factors.append("very high loan-to-income ratio")

    # 3. Absolute income level
    if income >= 100_000:
        score  -= 15;  factors.append("high annual income")
    elif income >= 50_000:
        score  -=  5;  factors.append("stable annual income")
    elif income >= 25_000:
        score  += 10;  factors.append("modest annual income")
    else:
        score  += 30;  factors.append("low annual income")

    return score, factors


def _compute_confidence(
    risk_score: float,
    income: float,
    credit_score: int,
    loan_amount: float,
) -> float:
    """
    Compute AI confidence based on how clearly the data points to a decision.
    Scores far from decision boundaries → higher confidence.
    """
    # Distance from decision boundaries (0.3 and 0.6)
    dist_from_boundary = min(
        abs(risk_score - 0.3),
        abs(risk_score - 0.6),
    )

    # More extreme risk scores → higher confidence
    base_confidence = 0.6 + (dist_from_boundary * 1.5)

    # Bonus for clear credit scores
    if credit_score >= 750 or credit_score < 500:
        base_confidence += 0.1

    # Reasonable income gives more confidence
    if income >= 50_000:
        base_confidence += 0.05

    return round(min(0.99, max(0.4, base_confidence)), 2)


def _build_explanations(
    decision: str,
    name: str,
    income: float,
    credit_score: int,
    loan_amount: float,
    factors: List[str],
) -> Tuple[str, str]:
    """Return (technical_reason, plain_english_explanation)."""
    factor_str = ", ".join(factors)

    if decision == "APPROVED":
        reason = f"Approved. Risk factors: {factor_str}."
        simple = (
            f"Good news, {name}! Your loan of ₹{loan_amount:,.0f} has been approved. "
            f"Based on your annual income of ₹{income:,.0f} and credit score of {credit_score}, "
            f"the system considers this application low risk. "
            f"Key factors: {factor_str}."
        )
    elif decision == "REVIEW":
        reason = f"Requires manual review. Risk factors: {factor_str}."
        simple = (
            f"Hi {name}, your application for ₹{loan_amount:,.0f} needs a closer look by our team. "
            f"Your income (₹{income:,.0f}/yr) and credit score ({credit_score}) show some positives, "
            f"but certain factors — {factor_str} — mean we need to review this manually. "
            f"Expect a decision within 1–2 business days."
        )
    else:
        reason = f"Rejected. Risk factors: {factor_str}."
        simple = (
            f"Unfortunately, {name}'s loan request of ₹{loan_amount:,.0f} was not approved at this time. "
            f"The system identified these concerns: {factor_str}. "
            f"To improve your chances, consider improving your credit score (currently {credit_score}), "
            f"reducing the loan amount, or increasing your income before re-applying."
        )

    return reason, simple
