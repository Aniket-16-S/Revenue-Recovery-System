"""
generate_notice.py
-------------------
Standalone CLI script to generate a property tax defaulter notice.

Usage:
    python generate_notice.py

Connects to the database, picks the first defaulter, generates a
notice using the LLM, prints it to the terminal, and saves it to
notices/{property_id}.txt.
"""

import asyncio
from pathlib import Path

from sqlalchemy import text

from app.database import engine
from app.notice_generator import stream_notice


NOTICES_DIR = Path(__file__).resolve().parent / "notices"


async def main():
    # 1. Pick a defaulter from the database
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT property_id, owner_name, ward_id, district_id, "
                "property_type, annual_tax, arrears, penalty, interest, "
                "years_pending, total_outstanding, risk_level "
                "FROM defaulters "
                "ORDER BY total_outstanding DESC "
                "LIMIT 1"
            )
        )
        row = result.fetchone()

    if row is None:
        print("No defaulters found in the database.")
        return

    defaulter = dict(row._mapping)

    print("=" * 60)
    print(f"Defaulter: {defaulter['owner_name']} (Property #{defaulter['property_id']})")
    print(f"Outstanding: ₹{defaulter['total_outstanding']:,.2f}")
    print("=" * 60)

    # 2. Generate the notice (try all 3 types, pick Final Demand for demo)
    notice_type = "Final Demand"
    print(f"\nGenerating '{notice_type}' notice...\n")

    # 3. Stream to terminal in real-time
    print("-" * 60)
    full_text_chunks = []
    async for chunk in stream_notice(defaulter, notice_type):
        print(chunk, end="", flush=True)
        full_text_chunks.append(chunk)
    print()
    print("-" * 60)
    notice_text = "".join(full_text_chunks)

    # 4. Save to file
    NOTICES_DIR.mkdir(parents=True, exist_ok=True)
    filepath = NOTICES_DIR / f"{defaulter['property_id']}.txt"
    filepath.write_text(notice_text, encoding="utf-8")
    print(f"\nNotice saved to: {filepath}")

    # 5. Clean up
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
