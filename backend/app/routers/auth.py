# app/routers/auth.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.audit import log_login
from app.core.config import settings
from app.core.db import get_db
from app.core.limiter import limiter
from app.core.security import create_access_token, get_current_user, verify_password
from app.models.user import User
from app.schemas.auth import TokenOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Inicia sesión y devuelve un token JWT.
    Limitado a 5 intentos por minuto por IP.
    """

    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log intento de login fallido
        log_login(
            user_email=form_data.username,
            success=False,
            details={"ip": request.client.host, "reason": "invalid_credentials"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Log login exitoso
    log_login(
        user_email=user.email,
        success=True,
        details={"ip": request.client.host, "user_id": user.id, "role": user.role},
    )

    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data, expires_delta=expires)

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Obtiene los datos del usuario autenticado actualmente.
    Requiere un token JWT válido en el header Authorization.
    """
    return current_user
