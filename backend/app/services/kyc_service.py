# File: app/services/kyc_service.py

import random
import re
import time
from typing import Tuple


def run_ekyc(aadhaar: str, pan: str, name: str) -> dict:
    """
    Simulate AI-based eKYC verification.
    Validates Aadhaar format, PAN format, and cross-references name.
    Returns a structured result with status, confidence, and checks.
    """
    checks = {}
    issues = []

    # 1. Aadhaar format check
    aadhaar_clean = aadhaar.replace(" ", "").replace("-", "")
    if re.match(r"^\d{12}$", aadhaar_clean):
        checks["aadhaar_format"] = "PASS"
    else:
        checks["aadhaar_format"] = "FAIL"
        issues.append("Aadhaar number is not 12 digits")

    # 2. PAN format check
    pan_clean = pan.upper().strip()
    if re.match(r"^[A-Z]{5}\d{4}[A-Z]$", pan_clean):
        checks["pan_format"] = "PASS"
    else:
        checks["pan_format"] = "FAIL"
        issues.append("PAN format is invalid")

    # 3. Name consistency (simulated AI check)
    if len(name.strip()) >= 2:
        checks["name_verification"] = "PASS"
    else:
        checks["name_verification"] = "FAIL"
        issues.append("Name too short for verification")

    # 4. Simulated database cross-reference
    # Randomly simulate occasional mismatches for demo
    if random.random() > 0.15:
        checks["database_match"] = "PASS"
    else:
        checks["database_match"] = "PARTIAL"
        issues.append("Minor discrepancy in government records (non-critical)")

    # 5. Fraud pattern check (simulated)
    checks["fraud_screen"] = "PASS"

    # Calculate overall result
    fails = sum(1 for v in checks.values() if v == "FAIL")
    partials = sum(1 for v in checks.values() if v == "PARTIAL")

    if fails > 0:
        status = "FAILED"
        confidence = round(random.uniform(0.1, 0.4), 2)
        explanation = f"eKYC verification failed. Issues found: {'; '.join(issues)}"
    elif partials > 0:
        status = "VERIFIED"
        confidence = round(random.uniform(0.7, 0.85), 2)
        explanation = (
            f"eKYC verification passed with minor observations. "
            f"All critical checks passed. Notes: {'; '.join(issues)}"
        )
    else:
        status = "VERIFIED"
        confidence = round(random.uniform(0.9, 0.99), 2)
        explanation = (
            f"eKYC verification completed successfully. "
            f"Aadhaar, PAN, and identity records match. No discrepancies found."
        )

    return {
        "status": status,
        "confidence": confidence,
        "explanation": explanation,
        "checks": checks,
    }


def run_video_kyc(loan_id: str, name: str) -> dict:
    """
    Simulate AI-powered Video KYC verification.
    Returns face-match, liveness check, and overall status.
    """
    # Simulate processing time effect
    face_match = random.random() > 0.05        # 95% pass rate
    liveness_check = random.random() > 0.08    # 92% pass rate

    if face_match and liveness_check:
        status = "VERIFIED"
        confidence = round(random.uniform(0.88, 0.99), 2)
        explanation = (
            f"Video KYC for {name} completed successfully. "
            f"Face matched with Aadhaar photo (confidence: {confidence}). "
            f"Liveness detection confirmed — no spoofing detected."
        )
    elif face_match and not liveness_check:
        status = "FAILED"
        confidence = round(random.uniform(0.3, 0.55), 2)
        explanation = (
            f"Video KYC for {name}: Face matched, but liveness check failed. "
            f"The system could not confirm this is a live person. "
            f"Please try again in a well-lit environment."
        )
    else:
        status = "FAILED"
        confidence = round(random.uniform(0.1, 0.35), 2)
        explanation = (
            f"Video KYC for {name}: Face did not match the Aadhaar photo on file. "
            f"This could be due to poor lighting, image quality, or identity mismatch. "
            f"Please contact support if this is an error."
        )

    return {
        "status": status,
        "confidence": confidence,
        "explanation": explanation,
        "face_match": face_match,
        "liveness_check": liveness_check,
    }
