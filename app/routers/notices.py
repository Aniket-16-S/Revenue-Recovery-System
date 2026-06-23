"""
app/routers/notices.py
-----------------------
POST /notices/generate — generate a property tax notice via LLM.
GET  /notices/list     — list all saved notices with metadata.
GET  /notices/{property_id}/content — read a specific notice file.

Streams the LLM output token-by-token using Server-Sent Events (SSE)
so the frontend can display words as they are generated.
Also saves the complete notice to notices/{property_id}.txt.
"""

import os
import datetime
import io
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.notice_generator import VALID_NOTICE_TYPES, stream_notice, generate_notice
from app.services import defaulter_service
from pdf_generator import render_notice

router = APIRouter(prefix="/notices", tags=["Notices"])

# Directory where notices are saved (project_root/notices/)
NOTICES_DIR = Path(__file__).resolve().parent.parent.parent / "notices"


# ------------------------------------------------------------------ #
# Request body                                                         #
# ------------------------------------------------------------------ #
class NoticeRequest(BaseModel):
    property_id: int
    notice_type: str

    @field_validator("notice_type")
    @classmethod
    def validate_notice_type(cls, v: str) -> str:
        if v not in VALID_NOTICE_TYPES:
            raise ValueError(
                f"notice_type must be one of: {', '.join(sorted(VALID_NOTICE_TYPES))}"
            )
        return v


# ------------------------------------------------------------------ #
# GET /notices/list                                                    #
# ------------------------------------------------------------------ #
@router.get(
    "/list",
    summary="List all saved notices",
    description="Reads the notices/ directory and returns metadata for each saved notice file.",
)
async def list_notices():
    """Return a list of saved notice files with metadata."""
    NOTICES_DIR.mkdir(parents=True, exist_ok=True)
    notices = []
    for f in sorted(NOTICES_DIR.glob("*.txt")):
        stat = f.stat()
        # Read first 150 chars as preview
        try:
            preview = f.read_text(encoding="utf-8")[:150]
        except Exception:
            preview = ""
        notices.append(
            {
                "property_id": int(f.stem),
                "filename": f.name,
                "size_bytes": stat.st_size,
                "modified_at": datetime.datetime.fromtimestamp(
                    stat.st_mtime
                ).isoformat(),
                "preview": preview,
            }
        )
    return notices


# ------------------------------------------------------------------ #
# GET /notices/{property_id}/content                                   #
# ------------------------------------------------------------------ #
@router.get(
    "/{property_id}/content",
    summary="Read a specific notice",
    description="Returns the full text content of a saved notice file.",
)
async def get_notice_content(property_id: int):
    """Return the full text content of a saved notice."""
    notice_path = NOTICES_DIR / f"{property_id}.txt"
    if not notice_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Notice for property {property_id} not found.",
        )
    content = notice_path.read_text(encoding="utf-8")
    return {"property_id": property_id, "content": content}


# ------------------------------------------------------------------ #
# POST /notices/generate                                               #
# ------------------------------------------------------------------ #
@router.post(
    "/generate",
    summary="Generate a tax notice via LLM",
    description=(
        "Looks up the defaulter by property_id, builds a prompt, and streams "
        "the LLM-generated notice via Server-Sent Events (SSE). "
        "The complete notice is also saved to `notices/{property_id}.txt`.\n\n"
        "**notice_type** must be one of: `Reminder`, `Payment Due`, `Final Demand`."
    ),
)
async def generate_notice_endpoint(
    body: NoticeRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Look up the defaulter
    defaulter = await defaulter_service.get_defaulter_by_id(db, body.property_id)
    if defaulter is None:
        raise HTTPException(
            status_code=404,
            detail=f"Property {body.property_id} not found.",
        )

    # 2. Stream the LLM response via SSE
    async def event_generator():
        full_text = []

        async for token in stream_notice(defaulter, body.notice_type):
            full_text.append(token)
            yield {"data": token}

        # 3. After streaming is done, save the notice to file
        NOTICES_DIR.mkdir(parents=True, exist_ok=True)
        notice_path = NOTICES_DIR / f"{body.property_id}.txt"
        notice_path.write_text("".join(full_text), encoding="utf-8")

    return EventSourceResponse(
        event_generator(),
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
        },
    )


# ------------------------------------------------------------------ #
# GET /notices/{property_id}/pdf                                       #
# ------------------------------------------------------------------ #
@router.get(
    "/{property_id}/pdf",
    summary="Download notice as PDF",
    description=(
        "Retrieves a saved notice in text/markdown, renders it into a "
        "legally formatted PDF template, and serves it as a downloadable file. "
        "If no pre-generated notice exists, generates it on-the-fly via LLM."
    ),
)
async def download_notice_pdf(
    property_id: int,
    db: AsyncSession = Depends(get_db),
):
    # 1. Look up the defaulter
    defaulter = await defaulter_service.get_defaulter_by_id(db, property_id)
    if defaulter is None:
        raise HTTPException(
            status_code=404,
            detail=f"Property {property_id} not found.",
        )

    # 2. Check if a saved notice exists (notices/{property_id}.txt)
    notice_path = NOTICES_DIR / f"{property_id}.txt"
    notice_body = ""
    
    if notice_path.exists():
        try:
            notice_body = notice_path.read_text(encoding="utf-8")
        except Exception:
            pass
            
    # 3. If it doesn't exist, generate it via LLM and save it
    if not notice_body:
        try:
            # We default to 'Reminder' type as specified in the prompt
            notice_body = await generate_notice(defaulter, "Reminder")
            NOTICES_DIR.mkdir(parents=True, exist_ok=True)
            notice_path.write_text(notice_body, encoding="utf-8")
        except Exception as e:
            # Fallback to a basic reminder notice body if LLM fails (e.g. API keys missing)
            notice_body = (
                f"Dear {defaulter['owner_name']},\n\n"
                f"This is a formal Reminder Notice regarding outstanding property tax dues for "
                f"Property ID {defaulter['property_id']} located in Ward {defaulter['ward_id']}.\n\n"
                f"Our records indicate a total outstanding balance of "
                f"₹{defaulter['total_outstanding']:,.2f}. Please clear these dues immediately to avoid "
                f"accrual of further interest or penalty charges.\n\n"
                f"Property Tax Department\n"
                f"Municipal Corporation of Maharashtra.\n"
                f"Notice signed digitally."
            )

    # 4. Render PDF
    try:
        pdf_bytes = render_notice(defaulter, notice_body)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {str(e)}",
        )

    # 5. Return StreamingResponse
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Reminder_Notice_{property_id}.pdf"
        },
    )
