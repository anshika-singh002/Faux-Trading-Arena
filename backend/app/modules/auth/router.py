from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, hash_password
from app.modules.users.service import UserService
from app.core.config import settings

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    display_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    display_name: str
    virtual_balance: float


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicates
    if await UserService.get_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await UserService.get_by_username(db, payload.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    user = await UserService.create(
        db,
        email=payload.email,
        username=payload.username,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
        virtual_balance=settings.INITIAL_VIRTUAL_BALANCE,
    )

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        virtual_balance=user.virtual_balance,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await UserService.get_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")

    await UserService.update_last_login(db, user.id)

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        display_name=user.display_name,
        virtual_balance=user.virtual_balance,
    )


@router.post("/logout")
async def logout():
    # JWT is stateless — client discards token
    # For token blacklisting, add Redis-based revocation here
    return {"message": "Logged out"}
