"""
app/services/user_service.py
----------------------------
Service handling user logins, user management DB actions, password recovery,
and SHA-256 password hashing.
"""

import hashlib
import string
import random
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.email_service import send_notice_email


def hash_password(password: str) -> str:
    """
    Computes the SHA-256 hex digest of a password.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def generate_random_password(length: int = 6) -> str:
    """
    Generates a random alphanumeric password of specified length.
    """
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))


async def authenticate_user(
    db: AsyncSession, user_id: str, password_plain: str
) -> bool:
    """
    Check if user_id exists in the database and password matches its hash.
    """
    h = hash_password(password_plain)
    result = await db.execute(
        text("SELECT password_hash FROM user_login WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    row = result.fetchone()
    if row is None:
        return False
    # row[0] accesses the password_hash column value
    return row[0] == h


async def add_user(db: AsyncSession, user_id: str, password_plain: str):
    """
    Adds a new user row to user_login (or updates password hash on conflict).
    """
    h = hash_password(password_plain)
    await db.execute(
        text(
            """
            INSERT INTO user_login (user_id, password_hash)
            VALUES (:user_id, :password_hash)
            ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
            """
        ),
        {"user_id": user_id, "password_hash": h},
    )
    await db.commit()


async def remove_user(db: AsyncSession, user_id: str):
    """
    Deletes a user row from user_login by user_id.
    """
    await db.execute(
        text("DELETE FROM user_login WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    await db.commit()


async def list_users(db: AsyncSession) -> list[str]:
    """
    Lists all usernames/user_ids in user_login.
    """
    result = await db.execute(
        text("SELECT user_id FROM user_login ORDER BY user_id")
    )
    return [row[0] for row in result.fetchall()]


async def recover_user_password(
    db: AsyncSession, user_id: str, user_mail: str
) -> str:
    """
    Generates a new random password, updates the user's password_hash,
    and sends the new password in a recovery email.
    """
    # 1. Verify user exists
    result = await db.execute(
        text("SELECT 1 FROM user_login WHERE user_id = :user_id"),
        {"user_id": user_id},
    )
    if result.fetchone() is None:
        raise ValueError(f"User '{user_id}' does not exist.")

    # 2. Generate random 6-character string password
    new_password = generate_random_password(6)

    # 3. Hash the new password
    h = hash_password(new_password)

    # 4. Update password hash in the DB
    await db.execute(
        text(
            "UPDATE user_login SET password_hash = :password_hash WHERE user_id = :user_id"
        ),
        {"user_id": user_id, "password_hash": h},
    )
    await db.commit()

    # 5. Send recovery email
    subject = "Your Account Password Recovery"
    content = (
        f"Hello {user_id},\n\n"
        f"Your password has been successfully reset by the Admin.\n"
        f"Your new password is: {new_password}\n\n"
        f"Please use this password to log in next time.\n\n"
        f"Property Tax Department\n"
        f"Municipal Corporation of Maharashtra.\n"
        f"Notice signed digitally."
    )
    await send_notice_email(
        to_email=user_mail, subject=subject, content=content
    )

    return new_password
