from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.db import get_db
from ..core.security import get_current_user, hash_password, require_roles
from ..core.audit import log_action, log_delete
from ..models.user import User
from ..models.staff import Staff
from ..schemas.user import UserCreate, UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


class AssignStaffRequest(BaseModel):
    staff_id: int


@router.post(
    "/",
    response_model=UserOut,
    dependencies=[Depends(require_roles("admin"))],
    summary="Crear un nuevo usuario",
    description="Crea un nuevo usuario en el sistema (ej. un recepcionista). Solo los administradores pueden realizar esta acción.",
)
def create_user(data: UserCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Validar rol
    ALLOWED_ROLES = ["admin", "gerente", "recepcionista", "mantenimiento", "staff"]
    if data.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed roles: {', '.join(ALLOWED_ROLES)}"
        )

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        approved=True,
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auditoría
    log_action(
        "create",
        "user",
        user.id,
        current_user,
        details={"email": user.email, "role": user.role, "full_name": user.full_name}
    )

    return user


@router.get(
    "/me",
    response_model=UserOut,
    summary="Obtener datos del usuario actual",
    description="Devuelve la información del usuario que está actualmente autenticado a través del token JWT.",
)
def me(current: User = Depends(get_current_user)):
    return current


@router.get(
    "/",
    response_model=list[UserOut],
    dependencies=[Depends(require_roles("admin"))],
    summary="Listar todos los usuarios",
    description="Obtiene una lista de todos los usuarios registrados en el sistema. Solo para administradores.",
)
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.get(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles("admin"))],
    summary="Obtener un usuario por ID",
    description="Obtiene la información de un usuario específico. Solo administradores.",
)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return user


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles("admin"))],
    summary="Actualizar un usuario",
    description="Actualiza la información de un usuario existente. Solo administradores.",
)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Prevenir auto-modificación
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify your own user account. Contact another admin."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Validar rol si se proporciona
    ALLOWED_ROLES = ["admin", "gerente", "recepcionista", "mantenimiento", "staff"]
    if data.role and data.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed roles: {', '.join(ALLOWED_ROLES)}"
        )

    # Registrar cambios anteriores para auditoría
    changes = {}
    if data.email and data.email != user.email:
        changes["email"] = {"old": user.email, "new": data.email}
        user.email = data.email
    if data.password:
        changes["password"] = "changed"
        user.hashed_password = hash_password(data.password)
    if data.role and data.role != user.role:
        changes["role"] = {"old": user.role, "new": data.role}
        user.role = data.role
    if data.full_name is not None and data.full_name != user.full_name:
        changes["full_name"] = {"old": user.full_name, "new": data.full_name}
        user.full_name = data.full_name

    db.commit()
    db.refresh(user)

    # Auditoría
    if changes:
        log_action(
            "update",
            "user",
            user.id,
            current_user,
            details={"changes": changes, "email": user.email}
        )

    return user


@router.delete(
    "/{user_id}",
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar un usuario",
    description="Elimina un usuario del sistema. Solo administradores.",
)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Prevenir auto-eliminación
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own user account. Contact another admin."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Auditoría antes de eliminar
    log_delete(
        "user",
        user.id,
        current_user,
        details={"email": user.email, "role": user.role, "full_name": user.full_name}
    )

    db.delete(user)
    db.commit()

    return {"success": True, "message": f"User {user.email} deleted"}


@router.post(
    "/{user_id}/assign-staff",
    response_model=dict,
    dependencies=[Depends(require_roles("admin"))],
    summary="Asignar un empleado a un usuario",
    description="Asigna un empleado del personal del hostal a una cuenta de usuario del sistema. Solo administradores.",
)
def assign_staff_to_user(
    user_id: int,
    request: AssignStaffRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Asigna un empleado (staff) a una cuenta de usuario del sistema.

    Si el usuario ya tiene un empleado asignado, se desasigna automáticamente.
    Si el empleado ya está asignado a otro usuario, se desasigna de ese usuario.
    """
    # Validar que el usuario existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # Validar que el staff existe
    staff = db.query(Staff).filter(Staff.id == request.staff_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )

    # Si el usuario ya tiene un staff asignado, desasignarlo
    old_staff = db.query(Staff).filter(Staff.user_id == user_id).first()
    if old_staff:
        old_staff.user_id = None
        log_action(
            "unassign_staff",
            "user",
            user_id,
            current_user,
            details={"unassigned_staff_id": old_staff.id, "staff_name": old_staff.full_name}
        )

    # Si el staff ya está asignado a otro usuario, desasignarlo
    if staff.user_id and staff.user_id != user_id:
        previous_user_id = staff.user_id
        log_action(
            "staff_reassigned",
            "user",
            previous_user_id,
            current_user,
            details={"staff_id": staff.id, "staff_name": staff.full_name, "reassigned_to_user": user_id}
        )

    # Asignar el staff al usuario
    staff.user_id = user_id
    db.commit()

    # Auditoría
    log_action(
        "assign_staff",
        "user",
        user_id,
        current_user,
        details={"staff_id": staff.id, "staff_name": staff.full_name, "user_email": user.email}
    )

    return {
        "success": True,
        "message": f"Empleado {staff.full_name} asignado a usuario {user.email}",
        "user_id": user_id,
        "staff_id": staff.id
    }


@router.post(
    "/{user_id}/unassign-staff",
    response_model=dict,
    dependencies=[Depends(require_roles("admin"))],
    summary="Desasignar un empleado de un usuario",
    description="Desasigna el empleado actual de una cuenta de usuario del sistema. Solo administradores.",
)
def unassign_staff_from_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Desasigna el empleado asignado a una cuenta de usuario del sistema.
    """
    # Validar que el usuario existe
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    # Buscar el staff asignado a este usuario
    staff = db.query(Staff).filter(Staff.user_id == user_id).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este usuario no tiene ningún empleado asignado"
        )

    # Desasignar
    staff_name = staff.full_name
    staff.user_id = None
    db.commit()

    # Auditoría
    log_action(
        "unassign_staff",
        "user",
        user_id,
        current_user,
        details={"staff_id": staff.id, "staff_name": staff_name, "user_email": user.email}
    )

    return {
        "success": True,
        "message": f"Empleado {staff_name} desasignado de usuario {user.email}",
        "user_id": user_id,
        "staff_id": staff.id
    }


@router.post(
    "/bootstrap",
    response_model=UserOut,
    summary="Crear el primer usuario administrador",
    description="Endpoint especial para crear el primer usuario administrador si no existe ninguno. Falla si ya existe un administrador.",
)
def bootstrap_admin(data: UserCreate, db: Session = Depends(get_db)):
    has_admin = db.query(User).filter(User.role == "admin").first()
    if has_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin already exists")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role="admin",
        approved=True,
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
