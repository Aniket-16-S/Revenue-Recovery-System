"""
app/notice_generator.py
------------------------
Prompt builder and LLM integration for generating property tax
defaulter notices using LangChain.

Uses Gemini (primary) with Groq as fallback.
Supports both full generation and token-by-token streaming.
"""

import os
import datetime
from typing import AsyncIterator

import dotenv
from langchain_core.messages import HumanMessage

# Load .env from project root
dotenv.load_dotenv()

VALID_NOTICE_TYPES = {"Reminder", "Payment Due", "Final Demand"}


def _get_llm():
    """
    Return a LangChain chat model.
    Tries Gemini first; falls back to Groq if the Gemini key is missing.
    """
    gemini_api = (os.getenv("Google_AI_Studio") or os.getenv("GOOGLE_API_KEY") or "").strip()
    groq_key = (os.getenv("Groq") or os.getenv("GROQ_API_KEY") or "").strip()

    if gemini_api:
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=gemini_api,
            temperature=0.4,
        )

    if groq_key:
        from langchain_groq import ChatGroq

        return ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=groq_key,
            temperature=0.4,
        )

    raise RuntimeError(
        "No LLM API key found. Set Google_AI_Studio or Groq in .env"
    )


def build_prompt(defaulter: dict, notice_type: str) -> str:
    """
    Build a structured prompt for the LLM to generate a formal
    property tax notice.

    Parameters
    ----------
    defaulter   : dict with keys from the defaulters table
    notice_type : one of "Reminder", "Payment Due", "Final Demand"

    Returns
    -------
    str : the full prompt string
    """
    if notice_type not in VALID_NOTICE_TYPES:
        raise ValueError(
            f"Invalid notice_type '{notice_type}'. "
            f"Must be one of: {', '.join(sorted(VALID_NOTICE_TYPES))}"
        )

    today_str = datetime.date.today().strftime("%B %d, %Y")

    return (
        f"You are an official property tax notice writer for a municipal corporation.\n"
        f"\n"
        f"Generate a formal, respectful notice in English. Keep it under 200 words. You can use markdown for formatting.\n"
        f"The notice type is: {notice_type}\n"
        f"Today's Date: {today_str}\n"
        f"\n"
        f"Defaulter details:\n"
        f"- Owner Name      : {defaulter['owner_name']}\n"
        f"- Property ID     : {defaulter['property_id']}\n"
        f"- Ward ID         : {defaulter['ward_id']}\n"
        f"- District ID     : {defaulter['district_id']}\n"
        f"- Property Type   : {defaulter['property_type']}\n"
        f"- Annual Tax      : ₹{defaulter['annual_tax']:,.2f}\n"
        f"- Arrears         : ₹{defaulter['arrears']:,.2f}\n"
        f"- Penalty         : ₹{defaulter['penalty']:,.2f}\n"
        f"- Interest        : ₹{defaulter['interest']:,.2f}\n"
        f"- Years Pending   : {defaulter['years_pending']}\n"
        f"- Total Outstanding: ₹{defaulter['total_outstanding']:,.2f}\n"
        f"- Risk Level      : {defaulter['risk_level']}\n"
        f"\n"
        f"Instructions:\n"
        f"- Address the notice to the owner by name.\n"
        f"- Mention the property ID, ward and annual tax.\n"
        f"- State the total outstanding amount clearly.\n"
        f"- Use the provided Today's Date ({today_str}) as the date of the notice. Do NOT output placeholders like '[Current Date]' or '[Date]'.\n"
        f"- If this is a 'Reminder', keep the tone gentle.\n"
        f"- If this is a 'Payment Due', be firm but polite.\n"
        f"- If this is a 'Final Demand', use a strict and urgent tone warning of legal consequences.\n"
        f"- Do NOT use any placeholders like '[Authorized Signatory Name/Title]', '[Name]', or any other bracketed placeholders.\n"
        f"- End the notice EXACTLY with these three lines:\n"
        f"Property Tax Department\n"
        f"Municipal Corporation of Maharashtra.\n"
        f"Notice signed digitally.\n"
        f"\n"
        f"Generate only the notice text, no extra commentary."
    )


async def generate_notice(defaulter: dict, notice_type: str) -> str:
    """
    Generate a complete notice and return the full text.
    Used by the standalone CLI script.
    """
    llm = _get_llm()
    prompt = build_prompt(defaulter, notice_type)
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content


async def stream_notice(
    defaulter: dict, notice_type: str
) -> AsyncIterator[str]:
    """
    Yield notice tokens one-by-one as the LLM generates them.
    Used by the FastAPI SSE endpoint for real-time streaming.
    """
    llm = _get_llm()
    prompt = build_prompt(defaulter, notice_type)

    for chunk in llm.stream([HumanMessage(content=prompt)]):
        if chunk.content:
            yield chunk.content
