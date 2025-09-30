# app/core/deps.py
from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from ..models.user import User
from .db import get_db
from .security import get_current_user, require_roles  # usa las dependencias existentes


def current_user(user: User = Depends(get_current_user)) -> User:
    """Atajo reutilizable en routers."""
    return user


def db_session(db: Session = Depends(get_db)) -> Session:
    """Atajo para inyectar la sesión."""
    return db


# Ejemplos de roles reusables (opcionales)
def role_admin(user: User = Depends(require_roles("admin"))) -> User:
    return user


def role_staff(user: User = Depends(require_roles("admin", "recepcionista"))) -> User:
    return user
