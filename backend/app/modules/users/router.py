from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    display_name: str
    avatar_url: str | None
    virtual_balance: float
    level: int
    xp: int
    is_verified: bool

    class Config:
        from_attributes = True


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me")
async def update_me(
    display_name: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if display_name:
        current_user.display_name = display_name
        await db.flush()
    return {"message": "Updated"}
