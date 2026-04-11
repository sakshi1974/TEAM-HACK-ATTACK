# File: app/api/v1/api.py

from fastapi import APIRouter
from app.api.v1.endpoints.chat       import router as chat_router
from app.api.v1.endpoints.agent      import router as agent_router
from app.api.v1.endpoints.monitoring import router as monitoring_router
from app.api.v1.endpoints.loan       import router as loan_router
from app.api.v1.endpoints.auth       import router as auth_router
from app.api.v1.endpoints.audit_endpoints import router as audit_router

# Master v1 router – all endpoint routers are included here.
api_router = APIRouter()

api_router.include_router(chat_router,       tags=["Chat"])
api_router.include_router(agent_router,      tags=["Agent"])
api_router.include_router(monitoring_router, tags=["Monitoring"])
api_router.include_router(loan_router,       tags=["Loan"])
api_router.include_router(auth_router,       tags=["Authentication"])
api_router.include_router(audit_router,      tags=["Audit"])
