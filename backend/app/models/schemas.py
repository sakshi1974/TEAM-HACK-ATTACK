# File: app/models/schemas.py

from pydantic import BaseModel, Field
from typing import List, Optional


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
# Loan schemas
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

