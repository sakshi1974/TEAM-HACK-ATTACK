# File: app/api/v1/endpoints/agent.py

from fastapi import APIRouter, HTTPException
from app.models.schemas import AgentRunRequest, AgentRunResponse
from app.services.agent_service import run_agent

router = APIRouter()


@router.post(
    "/agent/run",
    response_model=AgentRunResponse,
    summary="Run Autonomous Agent",
    description=(
        "Provide a task description. The agent (powered by Llama 3) will produce "
        "a structured Decision, Action, and Reasoning."
    ),
)
async def agent_run(request: AgentRunRequest) -> AgentRunResponse:
    """
    POST /api/v1/agent/run

    Accepts a task string, runs it through the autonomous agent pipeline,
    and returns a structured governance decision.
    """
    try:
        result = await run_agent(request.task)
        return AgentRunResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")
