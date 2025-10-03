from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class GuestBase(BaseModel):
    full_name: str
    document_id: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None


class GuestCreate(GuestBase):
    pass


class GuestUpdate(BaseModel):
    full_name: Optional[str] = None
    document_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None


class GuestOut(GuestBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
