"""
app/routers/users.py
--------------------
FastAPI endpoints for authentication and user management database requests.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.database import get_db
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class UserRequest(BaseModel):
    username: str
    password: str


class RemoveUserRequest(BaseModel):
    username: str


class RecoverRequest(BaseModel):
    username: str
    user_mail: str


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    username = body.username.strip()
    password = body.password

    # Hardcoded admin login
    if username == "admin" and password == "admin1234":
        return {"status": "success", "role": "admin", "username": "admin"}

    # Normal user database authenticate
    authenticated = await user_service.authenticate_user(db, username, password)
    if authenticated:
        return {"status": "success", "role": "user", "username": username}

    # Display generic Invalid Credentials as requested
    raise HTTPException(status_code=400, detail="Invalid Credentials")


@router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    try:
        users = await user_service.list_users(db)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/add")
async def add_user_route(
    body: UserRequest, db: AsyncSession = Depends(get_db)
):
    username = body.username.strip()
    password = body.password

    if not username or not password:
        raise HTTPException(
            status_code=400, detail="Username and password are required"
        )

    if username.lower() == "admin":
        raise HTTPException(
            status_code=400, detail="Cannot register/add admin user"
        )

    try:
        await user_service.add_user(db, username, password)
        return {
            "status": "success",
            "message": f"User {username} added successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/remove")
async def remove_user_route(
    body: RemoveUserRequest, db: AsyncSession = Depends(get_db)
):
    username = body.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")

    try:
        await user_service.remove_user(db, username)
        return {
            "status": "success",
            "message": f"User {username} removed successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/users/recover-password")
async def recover_password_route(
    body: RecoverRequest, db: AsyncSession = Depends(get_db)
):
    username = body.username.strip()
    user_mail = body.user_mail.strip()

    if not username or not user_mail:
        raise HTTPException(
            status_code=400, detail="Username and email address are required"
        )

    try:
        await user_service.recover_user_password(db, username, user_mail)
        return {
            "status": "success",
            "message": f"Recovery email sent to {user_mail}.",
        }
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to recover password: {str(exc)}"
        )
