# File: app/services/supervisor_service.py

from typing import List


def supervise_decision(
    decision: str,
    risk_score: float,
    income: float,
    loan_amount: float,
    credit_score: int,
) -> dict:
    """
    Supervisor Agent: validates the output of the primary loan decision agent.
    Cross-checks decision consistency with risk score, income ratio,
    and credit thresholds. Flags any inconsistencies.

    Returns:
        dict with status, validated_decision, checks_passed, checks_failed, explanation
    """
    checks_passed: List[str] = []
    checks_failed: List[str] = []

    # ── Check 1: Risk-score ↔ decision consistency ──
    if risk_score > 0.7 and decision == "APPROVED":
        checks_failed.append(
            f"High risk score ({risk_score:.2f}) but decision is APPROVED — expected REJECTED or REVIEW"
        )
    elif risk_score < 0.3 and decision == "REJECTED":
        checks_failed.append(
            f"Low risk score ({risk_score:.2f}) but decision is REJECTED — expected APPROVED"
        )
    else:
        checks_passed.append(f"Risk score ({risk_score:.2f}) aligns with {decision} decision")

    # ── Check 2: Loan-to-income ratio ──
    ratio = loan_amount / max(income, 1)
    if ratio > 5 and decision == "APPROVED":
        checks_failed.append(
            f"Loan-to-income ratio is very high ({ratio:.1f}x) but loan was APPROVED"
        )
    else:
        checks_passed.append(f"Loan-to-income ratio ({ratio:.1f}x) is within acceptable bounds for {decision}")

    # ── Check 3: Credit score minimum threshold ──
    if credit_score < 500 and decision == "APPROVED":
        checks_failed.append(
            f"Credit score ({credit_score}) is below minimum threshold (500) for APPROVED decision"
        )
    else:
        checks_passed.append(f"Credit score ({credit_score}) meets minimum requirements")

    # ── Check 4: Extreme loan amounts ──
    if loan_amount > income * 10:
        checks_failed.append(
            f"Loan amount (₹{loan_amount:,.0f}) exceeds 10x annual income (₹{income:,.0f})"
        )
    else:
        checks_passed.append("Loan amount is within 10x income ceiling")

    # ── Determine supervisor verdict ──
    if len(checks_failed) == 0:
        status = "VERIFIED"
        validated_decision = decision
        explanation = (
            f"Supervisor Agent has verified the {decision} decision. "
            f"All {len(checks_passed)} consistency checks passed. "
            f"The decision is coherent with the applicant's financial profile."
        )
    else:
        status = "MISMATCH_DETECTED"
        # Suggest what the decision should be based on rules
        if risk_score > 0.7 or credit_score < 500:
            validated_decision = "REJECTED"
        elif risk_score > 0.4:
            validated_decision = "REVIEW"
        else:
            validated_decision = "APPROVED"

        explanation = (
            f"Supervisor Agent detected {len(checks_failed)} inconsistenc{'y' if len(checks_failed) == 1 else 'ies'} "
            f"in the {decision} decision. Issues: {'; '.join(checks_failed)}. "
            f"Recommended decision: {validated_decision}."
        )

    return {
        "status": status,
        "original_decision": decision,
        "validated_decision": validated_decision,
        "explanation": explanation,
        "checks_passed": checks_passed,
        "checks_failed": checks_failed,
    }
