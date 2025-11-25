# app/core/security.py
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings  # Asegúrate de que importa de config
from app.core.db import get_db
from app.models.user import User

pwd_context = CryptContext(
    schemes=["bcrypt", "pbkdf2_sha256"],
    deprecated="auto",
    bcrypt__rounds=12
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

ROLE_HIERARCHY = {
    "admin": 4,
    "gerente": 3,
    "recepcionista": 2,
    "mantenimiento": 1,
    "auditor": 2,
    "user": 0,
}

ROLE_PERMISSIONS = {
    "admin": {"*"},
    "gerente": {
        "finance:read",
        "inventory:read",
        "inventory:write",
        "inventory:consume",
        "maintenance:manage",
        "reports:read",
        "staff:read",
    },
    "recepcionista": {
        "finance:read",
        "finance:write",
        "inventory:read",
        "inventory:consume",
        "maintenance:create",
        "guests:manage",
        "reservations:manage",
    },
    "mantenimiento": {"inventory:read", "inventory:consume", "maintenance:execute"},
    "auditor": {"finance:read", "reports:read"},
    "user": set(),
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncate password to 72 bytes for bcrypt compatibility
    truncated_password = plain_password[:72]
    return pwd_context.verify(truncated_password, hashed_password)


def hash_password(password: str) -> str:
    # Truncate password to 72 bytes for bcrypt compatibility
    truncated_password = password[:72]
    return pwd_context.hash(truncated_password)


# Alias para compatibilidad
get_password_hash = hash_password


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})

    # Usa los nombres en MAYÚSCULAS
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    import structlog
    log = structlog.get_logger()

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        log.info("Validating token", token_preview=token[:50] if token else "None")
        # Usa los nombres en MAYÚSCULAS
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        log.info("Token decoded", payload=payload)
        user_id = payload.get("sub")
        if user_id is None:
            log.warning("No user_id in token payload")
            raise credentials_exception
    except JWTError as e:
        log.error("JWT decode error", error=str(e))
        raise credentials_exception from None

    user = db.get(User, user_id)
    if user is None:
        log.warning("User not found in database", user_id=user_id)
        raise credentials_exception
    log.info("User authenticated successfully", user_id=user.id, email=user.email)
    return user


def require_roles(*roles: str):
    """
    Crea una dependencia de FastAPI que verifica si el usuario actual
    tiene uno de los roles especificados.
    """

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this user role",
            )
        return current_user

    return role_checker


def _has_permission(role: str, permission: str) -> bool:
    if role == "admin":
        return True
    permissions = ROLE_PERMISSIONS.get(role, set())
    return "*" in permissions or permission in permissions


def require_permission(*permissions: str):
    """
    Dependencia que valida permisos de alto nivel.
    El administrador general siempre tiene acceso.
    """

    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        for perm in permissions:
            if not _has_permission(current_user.role, perm):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{current_user.role}' lacks permission '{perm}'",
                )
        return current_user

    return permission_checker
