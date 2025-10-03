from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, hash_password, require_roles
from ..models.user import User
from ..schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/",
    response_model=UserOut,
    dependencies=[Depends(require_roles("admin"))],
    summary="Crear un nuevo usuario",
    description="Crea un nuevo usuario en el sistema (ej. un recepcionista). Solo los administradores pueden realizar esta acción.",
)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )
    user = User(email=data.email, hashed_password=hash_password(data.password), role=data.role)
    db.add(user)
    db.commit()
    db.refresh(user)
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
    user = User(email=data.email, hashed_password=hash_password(data.password), role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
