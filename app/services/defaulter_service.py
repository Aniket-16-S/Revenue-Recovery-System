"""
app/services/defaulter_service.py
----------------------------------
All database query logic lives here.  Every query is a hand-written
SQL string executed via db.execute(text("...")).

No ORM models — results are returned as plain dicts.
"""

from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine


async def get_defaulters(
    db: AsyncSession,
    ward_id: Optional[int] = None,
) -> list[dict]:
    """
    Return all defaulters ordered by total_outstanding DESC.
    Optionally filter by ward_id.
    """
    if ward_id is not None:
        result = await db.execute(
            text(
                "SELECT property_id, owner_name, ward_id, district_id, "
                "property_type, annual_tax, arrears, penalty, interest, "
                "years_pending, total_outstanding, risk_level "
                "FROM defaulters "
                "WHERE ward_id = :ward_id "
                "ORDER BY total_outstanding DESC"
            ),
            {"ward_id": ward_id},
        )
    else:
        result = await db.execute(
            text(
                "SELECT property_id, owner_name, ward_id, district_id, "
                "property_type, annual_tax, arrears, penalty, interest, "
                "years_pending, total_outstanding, risk_level "
                "FROM defaulters "
                "ORDER BY total_outstanding DESC"
            )
        )

    return [dict(row._mapping) for row in result.fetchall()]


async def get_top_defaulters(db: AsyncSession, limit: int) -> list[dict]:
    """Return top-n defaulters ordered by total_outstanding DESC."""
    result = await db.execute(
        text(
            "SELECT property_id, owner_name, ward_id, district_id, "
            "property_type, annual_tax, arrears, penalty, interest, "
            "years_pending, total_outstanding, risk_level "
            "FROM defaulters "
            "ORDER BY total_outstanding DESC "
            "LIMIT :limit"
        ),
        {"limit": limit},
    )

    return [dict(row._mapping) for row in result.fetchall()]


async def get_defaulter_by_id(
    db: AsyncSession,
    property_id: int,
) -> Optional[dict]:
    """
    Lookup by property_id.
    Returns a dict or None.
    """
    result = await db.execute(
        text(
            "SELECT property_id, owner_name, ward_id, district_id, "
            "property_type, annual_tax, arrears, penalty, interest, "
            "years_pending, total_outstanding, risk_level "
            "FROM defaulters "
            "WHERE property_id = :property_id"
        ),
        {"property_id": property_id},
    )

    row = result.fetchone()
    if row is None:
        return None
    return dict(row._mapping)


async def _refresh_mv() -> None:
    """
    Refresh mv_ward_summary concurrently.
    Runs in AUTOCOMMIT mode (required by PostgreSQL for REFRESH CONCURRENTLY).
    """
    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        await conn.execute(
            text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ward_summary")
        )


async def get_ward_summary(
    db: AsyncSession,
    ward_number: Optional[int] = None,
) -> list[dict] | dict:
    """
    Read ward-level aggregation from mv_ward_summary.
    Refreshes the materialized view first, then queries it.
    If ward_number is provided, returns data for that ward or a 'not found' message.
    If ward_number is omitted, returns all wards.
    """
    await _refresh_mv()

    sql = (
        "SELECT ward_id, ward_number, ulb_name, district_id, district_name, "
        "total_defaulters, total_outstanding, avg_outstanding, "
        "critical_count, high_count, medium_count, low_count "
        "FROM mv_ward_summary"
    )

    if ward_number is not None:
        sql += " WHERE ward_number = :ward_number"
        result = await db.execute(text(sql), {"ward_number": ward_number})
    else:
        result = await db.execute(text(sql))

    rows = result.fetchall()

    if not rows:
        return {"message": f"Ward {ward_number} not found"}

    return [dict(r._mapping) for r in rows]




