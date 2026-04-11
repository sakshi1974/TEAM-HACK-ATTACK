# File: app/api/v1/endpoints/auth.py

from fastapi import APIRouter, HTTPException, Header
from app.models.schemas import OTPSendRequest, OTPVerifyRequest, LoginResponse
from app.services.auth_service import send_otp, verify_otp, validate_session, logout
from typing import Optional

router = APIRouter()


@router.post(
    "/auth/send-otp",
    response_model=LoginResponse,
    summary="Send OTP",
    description="Send a 6-digit OTP to the given mobile number (printed to console for demo).",
)
async def send_otp_endpoint(request: OTPSendRequest) -> LoginResponse:
    """POST /api/v1/auth/send-otp"""
    try:
        send_otp(request.mobile)
        return LoginResponse(
            success=True,
            message=f"OTP sent to {request.mobile}. Check the backend console.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {exc}")


@router.post(
    "/auth/verify-otp",
    response_model=LoginResponse,
    summary="Verify OTP",
    description="Verify the OTP and receive a session token.",
)
async def verify_otp_endpoint(request: OTPVerifyRequest) -> LoginResponse:
    """POST /api/v1/auth/verify-otp"""
    success, message, token = verify_otp(request.mobile, request.otp)
    return LoginResponse(
        success=success,
        token=token,
        mobile=request.mobile if success else None,
        message=message,
    )


@router.post(
    "/auth/logout",
    response_model=LoginResponse,
    summary="Logout",
    description="Invalidate the current session.",
)
async def logout_endpoint(
    authorization: Optional[str] = Header(None),
) -> LoginResponse:
    """POST /api/v1/auth/logout"""
    if not authorization:
        return LoginResponse(success=False, message="No session token provided.")

    token = authorization.replace("Bearer ", "")
    success = logout(token)
    return LoginResponse(
        success=success,
        message="Logged out successfully." if success else "Invalid or expired session.",
    )


@router.get(
    "/auth/me",
    summary="Check Session",
    description="Check if the current session is valid.",
)
async def check_session(
    authorization: Optional[str] = Header(None),
):
    """GET /api/v1/auth/me"""
    if not authorization:
        return {"authenticated": False, "message": "No token provided."}

    token = authorization.replace("Bearer ", "")
    session = validate_session(token)
    if session:
        return {
            "authenticated": True,
            "mobile": session["mobile"],
            "message": "Session is valid.",
        }
    return {"authenticated": False, "message": "Invalid or expired session."}
