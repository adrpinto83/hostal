# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from ..models.user import User

# Debe apuntar a tu endpoint real de login (que emite el token)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    # Si quieres tolerancia de reloj: options={"leeway": 10}
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        try:
            user_id = int(sub)
        except (TypeError, ValueError):
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    def _dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return _dep

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Devuelve el hash bcrypt de la contraseña."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compara contraseña en texto plano con su hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)
def hash_password(password: str) -> str:
    # Alias para compatibilidad con código existente
    return get_password_hash(password)
