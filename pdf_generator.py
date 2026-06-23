"""
pdf_generator.py
----------------
Generates a legally formatted PDF notice for property tax defaulters.
Converts notice body from Markdown to HTML and compiles the entire document
using Jinja2 and WeasyPrint.
"""

import os
import datetime
from pathlib import Path
from typing import Dict, Any

from jinja2 import Environment, FileSystemLoader
import markdown
try:
    from weasyprint import HTML
    WEASYPRINT_AVAILABLE = True
    WEASYPRINT_ERROR = None
except Exception as e:
    HTML = None
    WEASYPRINT_AVAILABLE = False
    WEASYPRINT_ERROR = str(e)

# Resolve paths relative to this file
BASE_DIR = Path(__file__).resolve().parent
TEMPLATE_DIR = BASE_DIR / "templates"
NOTICES_DIR = BASE_DIR / "notices"


def format_indian_currency(amount: Any) -> str:
    """
    Format numeric values into the Indian Rupee numbering format (Lakhs/Crores).
    E.g. 150000 -> ₹1,50,000.00
    """
    if amount is None:
        return "₹0.00"
    
    try:
        amount_float = float(amount)
        s = f"{amount_float:.2f}"
        parts = s.split('.')
        int_part = parts[0]
        dec_part = parts[1]
        
        # Indian currency formatting logic
        if len(int_part) <= 3:
            formatted = int_part
        else:
            last_three = int_part[-3:]
            remaining = int_part[:-3]
            groups = []
            while remaining:
                groups.append(remaining[-2:])
                remaining = remaining[:-2]
            groups.reverse()
            formatted = ",".join(groups) + "," + last_three
            
        return f"₹{formatted}.{dec_part}"
    except (ValueError, TypeError):
        return f"₹{amount}"


def render_notice(defaulter: Dict[str, Any], notice_body: str) -> bytes:
    """
    Renders a Reminder Notice HTML template with defaulter data,
    converts notice body markdown to HTML, and compiles to PDF bytes.

    Parameters
    ----------
    defaulter   : dict containing defaulter attributes
    notice_body : notice body content (in Markdown)

    Returns
    -------
    bytes : Compiled PDF data
    """
    # Ensure WeasyPrint libraries are loaded on Windows
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError(
            f"WeasyPrint is not available: {WEASYPRINT_ERROR}. "
            "Please ensure you install the GTK+ libraries (GObject, Pango, Cairo) on Windows. "
            "Refer to the WeasyPrint documentation: https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows"
        )

    # 1. Ensure templates and output directories exist
    TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
    NOTICES_DIR.mkdir(parents=True, exist_ok=True)
    
    # 2. Date calculations
    today = datetime.date.today()
    due_date = today + datetime.timedelta(days=30)
    
    today_str = today.strftime("%B %d, %Y")
    due_date_str = due_date.strftime("%B %d, %Y")
    
    # 3. Convert markdown notice body to HTML
    # We clean up common spacing issues and render HTML
    html_body = markdown.markdown(
        notice_body,
        extensions=['extra', 'nl2br']
    )
    
    # Check if LLM already output a sign-off footer
    has_custom_signoff = any(
        phrase in notice_body 
        for phrase in ["Municipal Corporation of Maharashtra", "Property Tax Department", "Notice signed digitally"]
    )
    
    # 4. Load Jinja2 template
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("reminder_notice.html")
    
    # 5. Build context & render
    context = {
        "defaulter": defaulter,
        "notice_body": html_body,
        "today_date": today_str,
        "due_date": due_date_str,
        "formatted_outstanding": format_indian_currency(defaulter.get("total_outstanding", 0.0)),
        "has_custom_signoff": has_custom_signoff
    }
    
    rendered_html = template.render(context)
    
    # 6. Compile to PDF using WeasyPrint
    pdf_bytes = HTML(string=rendered_html).write_pdf()
    return pdf_bytes


async def run_standalone_test():
    """
    Query one dummy defaulter from the database (or fallback to mock),
    generate a PDF notice, and save to notices/_reminder.pdf.
    """
    import asyncio
    from sqlalchemy import text
    from app.database import engine
    
    print("Running PDF Generator standalone test...")
    
    defaulter = None
    # Try fetching a real defaulter from the database
    try:
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
            if row:
                defaulter = dict(row._mapping)
                print(f"Loaded real defaulter: {defaulter['owner_name']} (Property ID: {defaulter['property_id']})")
    except Exception as e:
        print(f"Could not load defaulter from database: {e}. Using fallback mock data.")
    
    # Fallback mock data if DB is unavailable or empty
    if not defaulter:
        defaulter = {
            "property_id": 99999,
            "owner_name": "Aditya Sharma",
            "ward_id": 12,
            "district_id": 3,
            "property_type": "Commercial",
            "annual_tax": 45000.0,
            "arrears": 120000.0,
            "penalty": 15000.0,
            "interest": 8500.0,
            "years_pending": 3,
            "total_outstanding": 143500.0,
            "risk_level": "High"
        }
        print("Using dummy defaulter.")

    # 1. Define dummy/pre-existing markdown notice body
    sample_markdown = (
        "Dear **Aditya Sharma**,\n\n"
        "This is an official **Reminder Notice** regarding outstanding property tax on your "
        "Commercial property (Property ID: **99999**) located in Ward 12. "
        "Our records show that your property tax has been pending for **3 years**, resulting in "
        "a total outstanding balance of **₹1,43,500.00** (including arrears, penalty, and interest charges).\n\n"
        "### Breakup of Dues:\n"
        "- **Arrears**: ₹1,20,000.00\n"
        "- **Penalty**: ₹15,000.00\n"
        "- **Accumulated Interest**: ₹8,500.00\n\n"
        "Please pay the total outstanding amount before the due date to avoid further penalties or legal action. "
        "You can make payments online at our official municipal portal or visit the Ward 12 office.\n\n"
        "Thank you for your prompt attention to this matter."
    )
    
    # Check if a generated notice text file exists for this property
    saved_notice_path = NOTICES_DIR / f"{defaulter['property_id']}.txt"
    if saved_notice_path.exists():
        try:
            sample_markdown = saved_notice_path.read_text(encoding="utf-8")
            print(f"Found pre-existing notice at {saved_notice_path}. Using it.")
        except Exception as e:
            print(f"Error reading {saved_notice_path}: {e}")
            
    # 2. Render notice
    try:
        pdf_data = render_notice(defaulter, sample_markdown)
        output_path = NOTICES_DIR / "_reminder.pdf"
        output_path.write_bytes(pdf_data)
        print(f"Success! PDF Notice successfully written to: {output_path}")
    except Exception as e:
        print(f"PDF Rendering failed: {e}")
        import traceback
        traceback.print_exc()

    # Clean up DB engine if initialized
    try:
        await engine.dispose()
    except Exception:
        pass


if __name__ == "__main__":
    import asyncio
    asyncio.run(run_standalone_test())
