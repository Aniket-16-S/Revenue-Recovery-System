"""
app/services/email_service.py
------------------------------
Service for validating email formats and sending emails asynchronously using smtplib.
"""

import os
import re
import smtplib
import asyncio
from email.message import EmailMessage
import dotenv

# Ensure environment variables are loaded
dotenv.load_dotenv()

# Simple regex for basic email format validation
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email_format(email: str) -> bool:
    """
    Validate that an email address has a valid syntax format.
    """
    return bool(EMAIL_REGEX.match(email))


async def send_notice_email(to_email: str, subject: str, content: str):
    """
    Validates the recipient's email, constructs the email message,
    and sends it via SMTP_SSL in a non-blocking thread executor.
    """
    to_email = to_email.strip()

    if not validate_email_format(to_email):
        raise ValueError(f"Invalid email address: '{to_email}'")

    email_sender = os.getenv("EMAIL")
    email_pass = os.getenv("EMAIL_PASS")

    if not email_sender or not email_pass:
        raise RuntimeError(
            "SMTP credentials not configured in environment (EMAIL or EMAIL_PASS missing)."
        )

    # Construct the message
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = email_sender
    msg["To"] = to_email
    msg.set_content(content)

    # Define the blocking SMTP operation
    def _send_sync():
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(email_sender, email_pass)
            smtp.send_message(msg)

    # Run in the default executor (thread pool)
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _send_sync)
