"""
app/routers/ai_agent.py
-----------------------
POST /ai/chat           – stream an AI agent response via SSE
DELETE /ai/chat/{sid}   – clear conversation history for a session
GET  /ai/status         – check if the agent is ready
"""

import json
import logging

from fastapi import APIRouter
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.services.AI_Agent_service import chat_stream, clear_session, is_agent_ready

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str


# ─────────────────────────────────────────────────────────────────────────────
# GET /ai/status
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "/status",
    summary="AI Agent status",
    description="Returns whether the LangGraph agent is initialized and ready.",
)
async def agent_status():
    ready = is_agent_ready()
    return {
        "ready": ready,
        "status": "online" if ready else "initializing",
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /ai/chat
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/chat",
    summary="Chat with the AI assistant",
    description=(
        "Sends a user message to the LangGraph AI agent and streams the response "
        "via Server-Sent Events. Each SSE event is a JSON object with a `type` field:\n\n"
        "- `status` — intermediate step description (e.g. 'Querying database…')\n"
        "- `token`  — a chunk of the final answer text\n"
        "- `done`   — signals the stream is complete\n"
        "- `error`  — an error occurred\n\n"
        "**session_id**: client-generated UUID to maintain conversation history."
    ),
)
async def chat_endpoint(body: ChatRequest):
    async def event_generator():
        async for event in chat_stream(body.session_id, body.message):
            yield {"data": json.dumps(event)}

    return EventSourceResponse(
        event_generator(),
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /ai/chat/{session_id}
# ─────────────────────────────────────────────────────────────────────────────
@router.delete(
    "/chat/{session_id}",
    summary="Clear conversation history",
    description="Removes the stored conversation history for the given session_id.",
)
async def clear_chat(session_id: str):
    clear_session(session_id)
    return {"cleared": True, "session_id": session_id}
