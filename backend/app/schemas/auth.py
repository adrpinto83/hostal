from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RegisterIn(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str = Field(min_length=6, description="Mínimo 6 caracteres")
    full_name: str = Field(min_length=3, description="Nombre completo")
    phone: Optional[str] = None
    document_id: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class GoogleLoginIn(BaseModel):
    """Schema for Google OAuth login"""
    google_token: str  # ID token from Google


class GoogleUserInfo(BaseModel):
    """User info from Google token"""
    id: str
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None


class UserApprovalIn(BaseModel):
    """Schema for user approval - Only admin can modify users"""
    approved: bool
    role: Optional[str] = "recepcionista"  # Default role if not specified
    reason: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        # Validate role is one of the allowed roles
        allowed_roles = ["admin", "gerente", "recepcionista", "mantenimiento", "staff"]
        if self.role and self.role not in allowed_roles:
            raise ValueError(f"Role must be one of: {', '.join(allowed_roles)}")


class RolePermissions:
    """Define permissions for each role - Cannot be modified by users"""
    PERMISSIONS = {
        "admin": {
            "description": "Administrador - Propietario del sistema",
            "users_management": True,  # Can create, edit, delete users
            "approve_users": True,
            "view_all_reports": True,
            "financial_reports": True,
            "system_settings": True,
            "reservations": True,
            "check_in_out": True,
            "maintenance": True,
            "staff_management": True,
            "delete_users": True,
            "assign_roles": True,
        },
        "recepcionista": {
            "description": "Recepcionista - Personal de frente",
            "users_management": False,
            "approve_users": False,
            "view_all_reports": False,
            "financial_reports": False,
            "system_settings": False,
            "reservations": True,  # Can manage reservations
            "check_in_out": True,  # Can process check-in/out
            "maintenance": False,
            "staff_management": False,
            "delete_users": False,
            "assign_roles": False,
            "process_payments": True,  # Can process payments
            "view_guests": True,  # Can view guest information
        },
        "staff": {
            "description": "Empleado - Staff general",
            "users_management": False,
            "approve_users": False,
            "view_all_reports": False,
            "financial_reports": False,
            "system_settings": False,
            "reservations": False,
            "check_in_out": False,
            "maintenance": True,  # Can report maintenance issues
            "staff_management": False,
            "delete_users": False,
            "assign_roles": False,
            "process_payments": False,
            "view_guests": False,
        },
    }
