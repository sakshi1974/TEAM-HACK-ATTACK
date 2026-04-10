# File: app/services/ollama_service.py

import httpx
from typing import Optional

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3"
TIMEOUT_SECONDS = 120  # Llama 3 can be slow on first call


async def generate_text(prompt: str, model: str = OLLAMA_MODEL) -> str:
    """
    Send a prompt to the local Ollama instance and return the generated text.

    Args:
        prompt: The text prompt.
        model:  Ollama model name (default: llama3).

    Returns:
        The model's response string.

    Raises:
        RuntimeError: If the Ollama server is unreachable or returns an error.
    """
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()

    except httpx.ConnectError:
        raise RuntimeError(
            "Cannot connect to Ollama at http://localhost:11434. "
            "Make sure Ollama is running: `ollama run llama3`"
        )
    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"Ollama returned HTTP {exc.response.status_code}: {exc.response.text}"
        )
    except Exception as exc:
        raise RuntimeError(f"Unexpected error calling Ollama: {exc}") from exc


async def check_ollama_health() -> bool:
    """Return True if the Ollama server responds to a health ping."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
