# app/routers/auth.py
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.config import settings
from ..core.security import create_access_token, verify_password
from ..models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    # 1) Buscar usuario por email
    user = db.execute(
        select(User).where(User.email == data.email)
    ).scalar_one_or_none()

    # 2) Validar existencia y password
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # 3) Construir JWT
    expires = timedelta(minutes=settings.jwt_expire_minutes)
    token = create_access_token({"sub": str(user.id), "role": user.role}, expires_delta=expires)

    return TokenOut(access_token=token)
