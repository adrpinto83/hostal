# app/schemas/user.py
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "user"
    full_name: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    role: Optional[str] = None
    full_name: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    approved: bool
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserPendingApprovalOut(BaseModel):
    """Schema for users pending approval"""
    id: int
    email: EmailStr
    approved: bool
    full_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
