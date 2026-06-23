"""
app/routers/defaulters.py
--------------------------
All /defaulters routes.

Route registration order matters:
  /defaulters/summary/ward  MUST be registered before /defaulters/{property_id}
  so FastAPI does not interpret the literal string "summary" as a property_id.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services import defaulter_service

router = APIRouter(prefix="/defaulters", tags=["Defaulters"])


@router.get(
    "/summary/ward",
    summary="Ward-level aggregation summary",
    description=(
        "Reads from the **mv_ward_summary** materialized view. "
        "The view is refreshed concurrently on every API call. "
        "Optionally filter by ward_number."
    ),
)
async def ward_summary(
    ward_number: Optional[int] = Query(
        None,
        description="Filter by ward number (e.g., 101, 201). Omit for all wards.",
        ge=1,
    ),
    db: AsyncSession = Depends(get_db),
):
    return await defaulter_service.get_ward_summary(db, ward_number)


@router.get(
    "/top",
    summary="Top defaulters",
    description="Returns the top-n defaulters sorted by total outstanding descending across all districts.",
)
async def top_defaulters(
    limit: int = Query(5, description="Number of results to return", ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    return await defaulter_service.get_top_defaulters(db, limit)


@router.get(
    "/{property_id}",
    summary="Single defaulter lookup",
    description="Lookup a defaulter by property_id.",
)
async def get_defaulter(
    property_id: int,
    db: AsyncSession = Depends(get_db),
):
    record = await defaulter_service.get_defaulter_by_id(db, property_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Property {property_id} not found.",
        )
    return record


@router.get(
    "",
    summary="List defaulters",
    description=(
        "Returns defaulters ordered by `total_outstanding DESC`. "
        "\n\n**With `ward_id`**: uses the composite B-tree index "
        "`(ward_id, total_outstanding DESC)` — fast index seek. "
        "\n\n**Without `ward_id`**: cross-district full scan across both "
        "partitions (Pune + Mumbai). Use for reporting/export only."
    ),
)
async def list_defaulters(
    ward_id: Optional[int] = Query(
        None,
        description="Filter by ward ID (1–20). Omit to return all wards.",
        ge=1,
        le=20,
    ),
    db: AsyncSession = Depends(get_db),
):
    return await defaulter_service.get_defaulters(db, ward_id)
