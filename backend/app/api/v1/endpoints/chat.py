# File: app/api/v1/endpoints/chat.py

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.services.ollama_service import generate_text

router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with Llama 3",
    description="Send a prompt to the local Ollama Llama 3 model and receive a response.",
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    POST /api/v1/chat

    Accepts a user prompt, forwards it to the local Ollama Llama 3 instance,
    and returns the generated response.
    """
    try:
        response_text = await generate_text(request.prompt)
        return ChatResponse(response=response_text, model="llama3")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")
