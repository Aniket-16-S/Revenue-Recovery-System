from __future__ import annotations

import os
import logging
from typing import Annotated, AsyncGenerator, Sequence, TypedDict, Dict, List

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

logger = logging.getLogger(__name__)

_AI_DB_URL = (
    os.getenv("AI_AGENT_DATABASE_URL")
    or "postgresql+asyncpg://ai_agent:abcd_1234@localhost/postgres"
)

_ai_engine = create_async_engine(
    _AI_DB_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

_ai_session_factory = async_sessionmaker(
    _ai_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


@tool
async def query_database(query: str) -> str:
    """
    Execute a SELECT SQL query against the PostgreSQL database and return results.
    """

    query = query.strip()

    # Safety: only allow SELECT
    first_word = query.split()[0].upper() if query else ""
    if first_word != "SELECT":
        return "ERROR: Only SELECT queries are permitted. Query rejected."

    logger.info("AI Agent executing DB query:\n%s", query)

    try:
        async with _ai_session_factory() as session:
            result = await session.execute(text(query))
            rows = result.fetchall()
            columns = list(result.keys()) if hasattr(result, "keys") else []

        if not rows:
            return "Query returned no results."

        # Format as a readable table string
        col_header = " | ".join(columns) if columns else ""
        divider = "-" * max(len(col_header), 40)
        lines = [col_header, divider]
        for row in rows:
            lines.append(" | ".join(str(v) for v in row))

        return "\n".join(lines)

    except Exception as exc:
        logger.error("DB query error: %s", exc)
        return f"DB ERROR: {exc}\n\n**Attempted Query:**\n```sql\n{query}\n```"


def _build_llm():
    """Return a LangChain chat model (Gemini first, then Groq)."""
    gemini_key = (
        os.getenv("Google_AI_Studio") or os.getenv("GOOGLE_API_KEY") or ""
    ).strip()
    groq_key = (os.getenv("Groq") or os.getenv("GROQ_API_KEY") or "").strip()

    if gemini_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        logger.info("AI Agent: using Gemini 2.5 Flash Lite")
        return ChatGoogleGenerativeAI(
            # ── Gemini models (swap model= string to switch) 
            # gemini-2.5-flash
            #  gemini-2.5-pro
            # gemini-2.5-flash-lite
            # gemini-2.0-flash
            # gemini-2.0-flash-lite
            # gemini-2.0-flash-001
            # gemini-2.0-flash-lite-001
            # gemini-2.5-flash-preview-tts
            # gemini-2.5-pro-preview-tts
            # gemma-4-26b-a4b-it
            # gemma-4-31b-it
            # gemini-flash-latest
            # gemini-flash-lite-latest
            # gemini-pro-latest
            # gemini-3-pro-preview
            # gemini-3-flash-preview
            # gemini-3.1-pro-preview
            # gemini-3-flash-lite-preview
            # gemini-3.1-flash-lite
            
            model="gemini-2.0-flash-lite",
            google_api_key=gemini_key,
            temperature=0.3,
        )

    if groq_key:
        from langchain_groq import ChatGroq
        logger.info("AI Agent: using Groq llama-3.1-8b-instant")
        return ChatGroq(
            # ── Groq models (swap model= string to switch) ────────────────
            # "llama-3.1-8b-instant"      ← current: fastest, lowest latency
            # "llama-3.3-70b-versatile"   ← best quality on Groq
            # "llama-3.1-70b-versatile"   ← older 70b, stable
            # "mixtral-8x7b-32768"        ← good for structured/SQL tasks
            # "gemma2-9b-it"              ← Google Gemma via Groq
            model="llama-3.1-8b-instant",
            api_key=groq_key,
            temperature=0.3,
        )

    raise RuntimeError(
        "No LLM API key found. Set Google_AI_Studio or Groq in your .env file."
    )


SYSTEM_PROMPT = """You are an intelligent data assistant for the Revenue Recovery System of the Government of Maharashtra.
Your job is to help government officers understand property tax defaulter data by querying the database and providing clear, insightful answers.
DATABASE SCHEMA - ALL AVAILABLE TABLES :

1. mv_ward_summary  (materialized view — fast, use for ward/district-level aggregations)
   - ward_id, ward_number, ulb_name
   - district_id, district_name
   - total_defaulters, total_outstanding, avg_outstanding
   - critical_count (outstanding > 5L), high_count (2-5L), medium_count (1-2L), low_count (< 1L)

2. defaulters  (partitioned parent — queries both Pune + Mumbai)
   - property_id, owner_name, ward_id, district_id
   - property_type, annual_tax, arrears, penalty, interest
   - years_pending, total_outstanding, risk_level

3. defaulters_pune   — same columns as defaulters, Pune partition only
4. defaulters_mumbai — same columns as defaulters, Mumbai partition only

5. wards    — ward_id, ward_number, ulb_id, district_id
6. districts — district_id, district_name, state_id
7. states   — state_id, state_name
8. ulbs     — ulb_id, ulb_name, district_id

JOIN HINTS:
  defaulters → wards       ON defaulters.ward_id = wards.ward_id
  defaulters → districts   ON defaulters.district_id = districts.district_id
  wards → districts        ON wards.district_id = districts.district_id

TOOL USAGE — CRITICAL RULES

1. ALWAYS use the query_database tool — never guess or invent numbers.
2. Only SELECT queries. Never UPDATE, DELETE, INSERT, DROP, ALTER.
3. For COMPLEX questions that need data from multiple tables: call query_database MULTIPLE TIMES.
   Example: "Who are the top 5 defaulters in the ward with the most critical cases?"
   → Query 1: find the ward with most critical_count from mv_ward_summary
   → Query 2: find top defaulters in that ward_id from defaulters table
4. Choose the right table for the question:
   - Ward/district summaries → mv_ward_summary (fastest)
   - Individual defaulter lookup, owner names, property details → defaulters table
   - District/state/ULB name lookups → districts, states, ulbs tables
5. For location filters: use ILIKE '%Pune%' style matching on district_name / state_name.
6. "Less than 1 lakh" → low_count in mv_ward_summary, or total_outstanding < 100000 in defaulters.
7. Present numbers in Indian format: ₹42.5 lakh, ₹1.2 crore, 1,234 defaulters.
8. After getting all needed data, compose a single clear, insightful answer.

RESPONSE STYLE

- Be professional but friendly.
- Use markdown: **bold** key numbers, bullet lists for multiple items, tables for comparisons.
- Add brief insight or recommendation where relevant.
- If a query returns no data, explain why and suggest an alternative query.
"""


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


# Module-level graph (compiled once)
_graph = None
_llm_with_tools = None


def _build_graph():
    """Build and compile the LangGraph workflow."""
    global _llm_with_tools

    tools = [query_database]
    llm = _build_llm()
    _llm_with_tools = llm.bind_tools(tools)

    def call_model(state: AgentState):
        """Node 1: LLM decides whether to answer or call a tool."""
        response = _llm_with_tools.invoke(state["messages"])
        return {"messages": [response]}

    tool_node = ToolNode(tools)  # Node 2: executes tool calls

    workflow = StateGraph(AgentState)
    workflow.add_node("agent", call_model)
    workflow.add_node("action", tool_node)
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges(
        "agent",
        tools_condition,
        {"tools": "action", END: END},
    )
    workflow.add_edge("action", "agent")

    return workflow.compile()


_sessions: Dict[str, List[BaseMessage]] = {}


def get_session_history(session_id: str) -> List[BaseMessage]:
    if session_id not in _sessions:
        _sessions[session_id] = [SystemMessage(content=SYSTEM_PROMPT)]
    return _sessions[session_id]


def clear_session(session_id: str) -> None:
    """Remove conversation history for a session."""
    _sessions.pop(session_id, None)


def initialize_agent() -> None:
    """
    Build the LangGraph graph and validate LLM credentials.
    Call once from the FastAPI lifespan startup hook.
    """
    global _graph
    logger.info("Initializing AI Agent…")
    _graph = _build_graph()
    logger.info("AI Agent ready.")


def is_agent_ready() -> bool:
    """Return True if the agent graph has been successfully initialized."""
    return _graph is not None


async def chat_stream(
    session_id: str, user_message: str
) -> AsyncGenerator[dict, None]:
    """
    Async generator that runs the LangGraph agent and yields SSE-compatible dicts.

    Yields:
        { "type": "status", "text": "..." }  – intermediate status updates
        { "type": "token",  "text": "..." }  – final answer chunks
        { "type": "done" }                   – signals completion
        { "type": "error",  "text": "..." }  – on failure
    """
    if _graph is None:
        yield {"type": "error", "text": "AI Agent is not initialized. Please restart the server."}
        return

    # Build message history
    history = get_session_history(session_id)
    history.append(HumanMessage(content=user_message))

    state = {"messages": list(history)}

    try:
        yield {"type": "status", "text": "Thinking…"}

        # Stream events from LangGraph
        async for event in _graph.astream(state, stream_mode="values"):
            messages = event.get("messages", [])
            if not messages:
                continue

            last_msg = messages[-1]

            # When the LLM decides to call a tool
            if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
                for tc in last_msg.tool_calls:
                    tool_name = tc.get("name", "tool")
                    if tool_name == "query_database":
                        yield {"type": "status", "text": "Querying the database…"}
                    else:
                        yield {"type": "status", "text": f"Running {tool_name}…"}

            # When a tool result comes back
            elif isinstance(last_msg, ToolMessage):
                if last_msg.content.startswith("DB ERROR:"):
                    raise ValueError(last_msg.content)
                yield {"type": "status", "text": "Analyzing results…"}

            # When the LLM produces its final text answer
            elif isinstance(last_msg, AIMessage) and last_msg.content and not last_msg.tool_calls:
                yield {"type": "status", "text": "Composing answer…"}
                # content may be a str or a list of content-part dicts (Gemini style)
                raw = last_msg.content
                if isinstance(raw, list):
                    content = " ".join(
                        part.get("text", "") if isinstance(part, dict) else str(part)
                        for part in raw
                    )
                else:
                    content = str(raw)

                # Stream the answer word by word for a nice typing effect
                words = content.split(" ")
                for i, word in enumerate(words):
                    chunk = word if i == len(words) - 1 else word + " "
                    yield {"type": "token", "text": chunk}

                # Save assistant reply to history
                history.append(last_msg)

        yield {"type": "done"}

    except Exception as exc:
        logger.error("chat_stream error: %s", exc, exc_info=True)
        # Remove the failed user message from history
        if history and isinstance(history[-1], HumanMessage):
            history.pop()
        err_msg = str(exc)
        if err_msg.startswith("DB ERROR:"):
            yield {"type": "error", "text": err_msg}
        else:
            yield {"type": "error", "text": f"Agent error: {exc}"}