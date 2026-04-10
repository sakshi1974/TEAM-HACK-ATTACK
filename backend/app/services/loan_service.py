# File: app/services/loan_service.py

import uuid
from datetime import datetime, timezone
from typing import List, Tuple

# ── In-memory loan store (resets on server restart, fine for demo) ──
_loans: List[dict] = []


# ─────────────────────────────────────────────────────────────────────
# Public API
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
            f"Good news, {name}! Your loan of ${loan_amount:,.0f} has been approved. "
            f"Based on your annual income of ${income:,.0f} and credit score of {credit_score}, "
            f"the system considers this application low risk. "
            f"Key factors: {factor_str}."
        )
    elif decision == "REVIEW":
        reason = f"Requires manual review. Risk factors: {factor_str}."
        simple = (
            f"Hi {name}, your application for ${loan_amount:,.0f} needs a closer look by our team. "
            f"Your income (${income:,.0f}/yr) and credit score ({credit_score}) show some positives, "
            f"but certain factors — {factor_str} — mean we need to review this manually. "
            f"Expect a decision within 1–2 business days."
        )
    else:
        reason = f"Rejected. Risk factors: {factor_str}."
        simple = (
            f"Unfortunately, {name}'s loan request of ${loan_amount:,.0f} was not approved at this time. "
            f"The system identified these concerns: {factor_str}. "
            f"To improve your chances, consider improving your credit score (currently {credit_score}), "
            f"reducing the loan amount, or increasing your income before re-applying."
        )

    return reason, simple
