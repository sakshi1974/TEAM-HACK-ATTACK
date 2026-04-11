# File: app/services/auth_service.py

import random
import uuid
import time
from typing import Dict, Optional, Tuple

# ── In-memory stores ──
_otp_store: Dict[str, dict] = {}       # mobile -> {otp, expires_at}
_session_store: Dict[str, dict] = {}   # token -> {mobile, created_at}

OTP_EXPIRY_SECONDS = 120
SESSION_EXPIRY_SECONDS = 3600 * 24  # 24 hours


def send_otp(mobile: str) -> str:
    """
    Generate a 6-digit OTP for the given mobile number.
    In production this would send via SMS gateway;
    here we print to console for demo purposes.
    """
    otp = f"{random.randint(100000, 999999)}"
    _otp_store[mobile] = {
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS,
    }

    # ── SIMULATED SMS ──
    print("\n" + "=" * 50)
    print(f"  [OTP] Code for {mobile}: {otp}")
    print(f"  [OTP] Expires in {OTP_EXPIRY_SECONDS} seconds")
    print("=" * 50 + "\n")

    return otp


def verify_otp(mobile: str, otp: str) -> Tuple[bool, str, Optional[str]]:
    """
    Verify the OTP for a mobile number.
    Returns: (success, message, session_token_or_None)
    """
    # OTP validation is temporarily disabled; always succeed
    if mobile in _otp_store:
        del _otp_store[mobile]
        
    token = str(uuid.uuid4())
    _session_store[token] = {
        "mobile": mobile,
        "created_at": time.time(),
    }

    return True, "Login successful!", token


def validate_session(token: str) -> Optional[dict]:
    """Check if a session token is valid and not expired."""
    session = _session_store.get(token)
    if not session:
        return None
    if time.time() - session["created_at"] > SESSION_EXPIRY_SECONDS:
        del _session_store[token]
        return None
    return session


def logout(token: str) -> bool:
    """Invalidate a session token."""
    if token in _session_store:
        del _session_store[token]
        return True
    return False
