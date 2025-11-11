from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class GuestBase(BaseModel):
    full_name: str = Field(..., description="Nombre completo del huésped", examples=["Juan Pérez"])
    document_id: str = Field(..., description="Número de documento de identidad", examples=["V-12345678"])
    phone: Optional[str] = Field(None, description="Número de teléfono", examples=["+58412-1234567"])
    email: Optional[EmailStr] = Field(None, description="Correo electrónico", examples=["juan.perez@example.com"])
    notes: Optional[str] = Field(None, description="Notas adicionales", examples=["Cliente frecuente"])


class GuestCreate(GuestBase):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "full_name": "Juan Pérez",
                    "document_id": "V-12345678",
                    "phone": "+58412-1234567",
                    "email": "juan.perez@example.com",
                    "notes": "Cliente frecuente"
                }
            ]
        }
    )


class GuestUpdate(BaseModel):
    full_name: Optional[str] = None
    document_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    notes: Optional[str] = None


class GuestOut(GuestBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
