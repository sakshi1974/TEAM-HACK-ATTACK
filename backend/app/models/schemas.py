# File: app/models/schemas.py

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import re


# ──────────────────────────────────────────────
# Chat schemas
# ──────────────────────────────────────────────

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="User prompt to send to the LLM")


class ChatResponse(BaseModel):
    response: str
    model: str = "llama3"


# ──────────────────────────────────────────────
# Agent schemas
# ──────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    task: str = Field(..., min_length=1, description="Task description for the agent to execute")


class AgentRunResponse(BaseModel):
    task: str
    decision: str
    action: str
    reasoning: str
    model: str = "llama3"


# ──────────────────────────────────────────────
# Monitoring schemas
# ──────────────────────────────────────────────

class MonitorRequest(BaseModel):
    metrics: List[float] = Field(
        ...,
        min_length=1,
        description="List of numeric metric values for anomaly detection",
    )


class MonitorResponse(BaseModel):
    anomaly: bool
    status: str          # "ALERT" | "OK"
    anomaly_count: int
    total_points: int
    scores: Optional[List[float]] = None


# ──────────────────────────────────────────────
# General
# ──────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    message: str
    version: str = "1.0.0"


# ──────────────────────────────────────────────
# Loan schemas (original — kept intact)
# ──────────────────────────────────────────────

class LoanRequest(BaseModel):
    name: str           = Field(..., min_length=1, description="Applicant full name")
    income: float       = Field(..., gt=0,          description="Annual income in USD")
    credit_score: int   = Field(..., ge=300, le=850, description="FICO credit score (300–850)")
    loan_amount: float  = Field(..., gt=0,          description="Requested loan amount in USD")


class LoanResponse(BaseModel):
    id: str
    name: str
    income: float
    credit_score: int
    loan_amount: float
    decision: str           # APPROVED | REVIEW | REJECTED
    status: str             # same value – used for badge display
    risk_score: float
    reason: str             # technical reason
    simple_explanation: str # plain English for non-technical users
    timestamp: str


class LoansListResponse(BaseModel):
    loans: List[LoanResponse]


# ──────────────────────────────────────────────
# Geo-Location schema
# ──────────────────────────────────────────────

class GeoLocation(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: Optional[str] = None


# ──────────────────────────────────────────────
# Loan V2 — Indian format with Aadhaar/PAN
# ──────────────────────────────────────────────

class LoanApplicationRequest(BaseModel):
    name: str           = Field(..., min_length=2, description="Applicant full name")
    mobile: str         = Field(..., description="10-digit Indian mobile number")
    aadhaar: str        = Field(..., description="12-digit Aadhaar number")
    pan: str            = Field(..., description="PAN in format ABCDE1234F")
    income: float       = Field(..., gt=0, description="Annual income in INR")
    credit_score: int   = Field(..., ge=300, le=900, description="Credit score (300–900)")
    loan_amount: float  = Field(..., gt=0, description="Requested loan amount in INR")
    geo_location: Optional[GeoLocation] = None

    @field_validator("aadhaar")
    @classmethod
    def validate_aadhaar(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "")
        if not re.match(r"^\d{12}$", cleaned):
            raise ValueError("Aadhaar must be exactly 12 digits")
        return cleaned

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v: str) -> str:
        v = v.upper().strip()
        if not re.match(r"^[A-Z]{5}\d{4}[A-Z]$", v):
            raise ValueError("PAN must be in format ABCDE1234F")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "")
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Mobile must be a valid 10-digit Indian number starting with 6-9")
        return cleaned


class LoanApplicationResponse(BaseModel):
    id: str
    name: str
    mobile: str
    aadhaar_masked: str        # last 4 digits visible
    pan: str
    income: float
    credit_score: int
    loan_amount: float
    decision: str              # APPROVED | REVIEW | REJECTED
    status: str
    risk_score: float          # 0.0 – 1.0
    confidence: float          # 0.0 – 1.0
    reason: str
    simple_explanation: str
    geo_location: Optional[GeoLocation] = None
    ekyc_status: Optional[str] = None
    video_kyc_status: Optional[str] = None
    supervisor_status: Optional[str] = None
    supervisor_explanation: Optional[str] = None
    timestamp: str


# ──────────────────────────────────────────────
# eKYC / Video KYC schemas
# ──────────────────────────────────────────────

class EKYCRequest(BaseModel):
    aadhaar: str
    pan: str
    name: str

class EKYCResponse(BaseModel):
    status: str             # VERIFIED | FAILED | PENDING
    confidence: float
    explanation: str
    checks: dict

class VideoKYCRequest(BaseModel):
    loan_id: str
    name: str

class VideoKYCResponse(BaseModel):
    status: str             # VERIFIED | FAILED
    confidence: float
    explanation: str
    face_match: bool
    liveness_check: bool


# ──────────────────────────────────────────────
# Authentication schemas
# ──────────────────────────────────────────────

class OTPSendRequest(BaseModel):
    mobile: str = Field(..., description="10-digit Indian mobile number")

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        cleaned = v.replace(" ", "").replace("-", "")
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Mobile must be a valid 10-digit Indian number starting with 6-9")
        return cleaned


class OTPVerifyRequest(BaseModel):
    mobile: str
    otp: str = Field(..., min_length=6, max_length=6)


class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    mobile: Optional[str] = None
    message: str


# ──────────────────────────────────────────────
# Audit schemas
# ──────────────────────────────────────────────

class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    event_type: str         # LOAN_APPLICATION | KYC_VERIFICATION | AI_DECISION | ALERT | AGENT_RUN
    user: Optional[str] = None
    agent: Optional[str] = None
    risk_score: Optional[float] = None
    decision: Optional[str] = None
    explanation: str        # Human-readable
    details: Optional[dict] = None
    is_important: bool = False


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogEntry]
    total: int


class AuditFilterParams(BaseModel):
    user: Optional[str] = None
    agent: Optional[str] = None
    risk_level: Optional[str] = None    # HIGH | MEDIUM | LOW
    event_type: Optional[str] = None
    important_only: bool = False


# ──────────────────────────────────────────────
# Dashboard schemas
# ──────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_loans: int
    approved: int
    rejected: int
    under_review: int
    approval_rate: float
    high_risk_percent: float
    alerts_triggered: int
    avg_risk_score: float
    loan_trends: List[dict]        # [{date, count, approved, rejected}]
    risk_distribution: List[dict]  # [{level, count}]


# ──────────────────────────────────────────────
# Supervisor schemas
# ──────────────────────────────────────────────

class SupervisorResult(BaseModel):
    status: str             # VERIFIED | MISMATCH_DETECTED
    original_decision: str
    validated_decision: str
    explanation: str
    checks_passed: List[str]
    checks_failed: List[str]
