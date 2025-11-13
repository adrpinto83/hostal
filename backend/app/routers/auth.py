# app/routers/auth.py
from datetime import datetime, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.audit import log_login, log_action
from app.core.config import settings
from app.core.db import get_db
from app.core.limiter import limiter
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import TokenOut, UserApprovalIn, RegisterIn, ForgotPasswordIn, ResetPasswordIn
from app.schemas.user import UserOut, UserPendingApprovalOut
from app.core.email_service import send_email

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

    if not user.approved:
        log_login(
            user_email=user.email,
            success=False,
            details={"ip": request.client.host, "reason": "user_not_approved"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario no aprobado. Contacta al administrador.",
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


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register(
    request: Request,
    data: RegisterIn,
    db: Session = Depends(get_db),
):
    """
    Registra un nuevo usuario (empleado).
    El usuario necesita ser aprobado por un administrador antes de poder iniciar sesión.
    Limitado a 3 intentos por minuto por IP.
    """
    # Verificar si el email ya existe
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado",
        )

    # Crear nuevo usuario con rol de "staff" por defecto
    new_user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role="staff",  # Rol por defecto para nuevos registros
        approved=False,  # Requiere aprobación del administrador
        full_name=data.full_name,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Log del registro
    log_login(
        user_email=data.email,
        success=True,
        details={
            "ip": request.client.host,
            "action": "user_registration",
            "status": "pending_approval",
            "full_name": data.full_name,
        },
    )

    return {
        "message": "Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.",
        "user_id": new_user.id,
        "email": new_user.email,
        "status": "pending_approval",
    }


@router.post("/password/forgot", response_model=dict)
def forgot_password(
    payload: ForgotPasswordIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Genera un token temporal y envía un enlace de recuperación."""
    email = payload.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if user:
        token = secrets.token_urlsafe(48)
        user.reset_password_token = hash_password(token)
        user.reset_password_expires_at = datetime.utcnow() + timedelta(
            minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        )
        db.commit()

        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}&email={user.email}"
        subject = "Recupera tu contraseña"
        text_body = (
            f"Hola {user.full_name or 'usuario'},\n\n"
            "Recibimos una solicitud para restablecer tu contraseña en Hostal App.\n"
            f"Abre el siguiente enlace para continuar: {reset_link}\n\n"
            "Si no realizaste esta solicitud, puedes ignorar este correo."
        )
        html_body = (
            f"<p>Hola <strong>{user.full_name or 'usuario'}</strong>,</p>"
            "<p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>"
            f"<p><a href='{reset_link}' target='_blank'>Restablecer contraseña</a></p>"
            "<p>Si no fuiste tú quien solicitó el cambio, simplemente ignora este mensaje.</p>"
        )
        background_tasks.add_task(send_email, subject, user.email, text_body, html_body)

    return {
        "message": "Si el correo corresponde a un usuario registrado, enviaremos las instrucciones para restablecer la contraseña."
    }


@router.post("/password/reset", response_model=dict)
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    """Permite definir una nueva contraseña utilizando el token enviado por correo."""
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if (
        not user
        or not user.reset_password_token
        or not user.reset_password_expires_at
        or user.reset_password_expires_at < datetime.utcnow()
        or not verify_password(payload.token, user.reset_password_token)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token inválido o expirado")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_password_token = None
    user.reset_password_expires_at = None
    db.commit()

    log_action("password_reset", "user", user.id, user, details={"email": user.email})

    return {"message": "Contraseña actualizada correctamente"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Obtiene los datos del usuario autenticado actualmente.
    Requiere un token JWT válido en el header Authorization.
    """
    return current_user


@router.get("/pending-users", response_model=list[UserPendingApprovalOut])
def get_pending_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Obtiene lista de usuarios pendientes de aprobación.
    Solo disponible para administradores.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden ver usuarios pendientes",
        )

    pending_users = db.query(User).filter(User.approved == False).all()
    return pending_users


@router.post("/approve-user/{user_id}")
def approve_user(
    user_id: int,
    payload: UserApprovalIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Aprueba o rechaza un usuario pendiente.
    Solo administradores pueden hacer esto - SEGURIDAD: No se pueden hacer trampas.

    Validaciones:
    - Solo admin puede aprobar usuarios
    - No se puede eliminar el último admin
    - No se puede cambiar el rol de sí mismo
    - Solo admin puede crear otros admins
    - Todas las acciones se registran en auditoría
    """
    # SEGURIDAD: Verificar que solo admin puede ejecutar esta acción
    if current_user.role != "admin":
        log_action(
            "unauthorized_user_approval_attempt",
            "user",
            user_id,
            current_user,
            details={"attempted_role": payload.role},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden aprobar usuarios",
        )

    # SEGURIDAD: Validar que el rol sea válido
    allowed_roles = ["admin", "gerente", "recepcionista", "mantenimiento", "staff"]
    if payload.role and payload.role not in allowed_roles:
        log_action(
            "invalid_role_assignment",
            "user",
            user_id,
            current_user,
            details={"attempted_role": payload.role},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rol inválido. Roles permitidos: {', '.join(allowed_roles)}",
        )

    # SEGURIDAD: Buscar el usuario y validar que existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    # SEGURIDAD: No permitir que un admin se cambie a sí mismo
    if user_id == current_user.id:
        log_action(
            "self_modification_attempt",
            "user",
            user_id,
            current_user,
            details={"action": "self_approval_or_role_change"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes modificar tu propia cuenta",
        )

    if payload.approved:
        user.approved = True
        old_role = user.role
        assigned_role = payload.role or "recepcionista"

        # SEGURIDAD: Si se intenta crear otro admin, registrarlo especialmente
        if assigned_role == "admin":
            log_action(
                "admin_role_assigned",
                "user",
                user_id,
                current_user,
                details={
                    "old_role": old_role,
                    "new_role": assigned_role,
                    "assigned_by": current_user.email,
                },
            )

        user.role = assigned_role
        message = f"Usuario {user.email} aprobado como {assigned_role}"

        log_action(
            "user_approved",
            "user",
            user_id,
            current_user,
            details={"role": assigned_role, "email": user.email},
        )
    else:
        # SEGURIDAD: Registrar el rechazo/eliminación
        user_email = user.email
        db.delete(user)
        message = f"Usuario {user_email} rechazado y eliminado"

        log_action(
            "user_rejected",
            "user",
            user_id,
            current_user,
            details={"email": user_email},
        )

    db.commit()

    return {
        "message": message,
        "user_id": user_id,
        "approved": payload.approved,
        "role": payload.role if payload.approved else None,
    }
