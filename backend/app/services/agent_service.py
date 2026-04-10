# File: app/services/agent_service.py

import re
from app.services.ollama_service import generate_text

# Prompt template that instructs Llama 3 to respond in a structured format
AGENT_PROMPT_TEMPLATE = """You are an Autonomous Agent operating inside a Governance & Observability Platform.
Your job is to analyse the following task and respond STRICTLY in this exact format (no extra text):

DECISION: <one-sentence decision>
ACTION: <specific action to take>
REASONING: <detailed reasoning in 2-3 sentences>

Task: {task}
"""


def _extract_field(text: str, field: str) -> str:
    """Extract a labelled field from the structured LLM output."""
    pattern = rf"(?i){re.escape(field)}:\s*(.+?)(?=\n[A-Z]+:|$)"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return f"[{field} not found in model response]"


async def run_agent(task: str) -> dict:
    """
    Use Llama 3 to act as an autonomous agent for the given task.

    Returns a dict with keys: task, decision, action, reasoning, model.
    """
    prompt = AGENT_PROMPT_TEMPLATE.format(task=task)
    raw_response = await generate_text(prompt)

    decision = _extract_field(raw_response, "DECISION")
    action = _extract_field(raw_response, "ACTION")
    reasoning = _extract_field(raw_response, "REASONING")

    return {
        "task": task,
        "decision": decision,
        "action": action,
        "reasoning": reasoning,
        "model": "llama3",
    }
