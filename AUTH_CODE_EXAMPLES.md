# EJEMPLOS DE CÓDIGO - AUTENTICACIÓN

## BACKEND - Flujo de Login Completo

### 1. Router (auth.py)
```python
@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    # 1. Buscar usuario por email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. Verificar credenciales
    if not user or not verify_password(form_data.password, user.hashed_password):
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
    
    # 3. Registrar login exitoso
    log_login(
        user_email=user.email,
        success=True,
        details={"ip": request.client.host, "user_id": user.id, "role": user.role},
    )
    
    # 4. Crear token JWT
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data, expires_delta=expires)
    
    # 5. Retornar token
    return {"access_token": access_token, "token_type": "bearer"}
```

### 2. Modelo User (models/user.py)
```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from ..core.db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="user")
```

### 3. Seguridad - Crear y Verificar Password (core/security.py)
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashea la contraseña con bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica contraseña contra hash"""
    return pwd_context.verify(plain_password, hashed_password)
```

### 4. Seguridad - JWT Token (core/security.py)
```python
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Crea JWT token con expiración"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt
```

### 5. Seguridad - Validar Token (core/security.py)
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> User:
    """Valida token JWT y retorna usuario autenticado"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    
    return user
```

### 6. Seguridad - Validar Roles (core/security.py)
```python
def require_roles(*roles: str):
    """
    Dependency que valida que usuario tenga uno de los roles especificados.
    Uso: @router.get("/", dependencies=[Depends(require_roles("admin", "gerente"))])
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this user role",
            )
        return current_user
    
    return role_checker
```

### 7. Uso en Endpoint (routers/guests.py)
```python
@router.post(
    "/",
    response_model=GuestOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
)
def create_guest(data: GuestCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo huésped.
    Solo accesible por admin o recepcionista.
    """
    guest = Guest(**data.model_dump())
    db.add(guest)
    db.commit()
    db.refresh(guest)
    return guest
```

### 8. Bootstrap - Crear Primer Admin (routers/users.py)
```python
@router.post("/bootstrap", response_model=UserOut)
def bootstrap_admin(data: UserCreate, db: Session = Depends(get_db)):
    """
    Crea el PRIMER usuario admin sin requerer autenticación.
    Falla si ya existe un administrador.
    """
    # Verificar que no exista admin previo
    has_admin = db.query(User).filter(User.role == "admin").first()
    if has_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Admin already exists"
        )
    
    # Verificar que email no esté registrado
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered"
        )
    
    # Crear usuario admin
    user = User(
        email=data.email, 
        hashed_password=hash_password(data.password), 
        role="admin"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

---

## FRONTEND - Flujo de Login Completo

### 1. Componente Login (pages/auth/Login.tsx)
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { handleApiError } from '@/lib/api/client';

export default function Login() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('string');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Hacer login
      const response = await authApi.login({ 
        username: email, 
        password 
      });
      
      // 2. Guardar token en localStorage
      localStorage.setItem('access_token', response.access_token);
      
      // 3. Obtener datos usuario actual
      const user = await authApi.getCurrentUser();
      
      // 4. Actualizar Zustand state
      setAuth(user, response.access_token);
      
      // 5. Navegar al dashboard
      navigate('/dashboard');
    } catch (err) {
      // Mostrar error al usuario
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="email">Correo Electrónico</label>
        <input
          id="email"
          type="email"
          placeholder="nombre@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      
      <div className="grid gap-2">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <button 
        type="submit" 
        disabled={loading}
        className="btn btn-primary w-full"
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

### 2. Zustand Auth Store (lib/hooks/useAuth.ts)
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      // Establecer usuario y token
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token);
        set({ user, token });
      },
      
      // Limpiar al logout
      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage', // Nombre en localStorage
    }
  )
);
```

### 3. API Auth Service (lib/api/auth.ts)
```typescript
import { api } from './client';
import type { LoginRequest, LoginResponse, User } from '@/types';

export const authApi = {
  // POST /auth/login - Obtener token
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Convertir a URLSearchParams (OAuth2PasswordRequestForm)
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await api.post<LoginResponse>(
      '/auth/login',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return response.data;
  },

  // GET /auth/me - Obtener datos usuario actual
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  // Logout local (sin request al backend)
  logout: () => {
    localStorage.removeItem('access_token');
  },
};
```

### 4. Axios Setup con Interceptores (lib/api/client.ts)
```typescript
import axios, { AxiosError, AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor Request - Agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor Response - Manejo de errores 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Si 401, limpiar token y redirigir a login
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Utilidad para formatear errores
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return typeof error.response.data.detail === 'string'
        ? error.response.data.detail
        : JSON.stringify(error.response.data.detail);
    }
    return error.message;
  }
  return 'Error desconocido';
};
```

### 5. TypeScript Types (types/index.ts)
```typescript
export interface User {
  id: number;
  email: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  email: string;
  password: string;
  role: 'admin' | 'gerente' | 'recepcionista' | 'mantenimiento';
}
```

---

## EJEMPLOS DE USO - Protecting Routes

### Componente ProtectedRoute (frontend)
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [] 
}: ProtectedRouteProps) {
  const { user, token } = useAuth();

  // Si no hay token, redirigir a login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles requeridos y usuario no los tiene
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

### Uso en Router
```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Login from '@/pages/auth/Login';
import Dashboard from '@/pages/dashboard/Dashboard';
import UserManagement from '@/pages/admin/UserManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## EJEMPLOS DE USO - Consumir API Protegida

### Hacer request con token automático
```typescript
import { api } from '@/lib/api/client';

// GET /api/v1/rooms (token se agrega automáticamente)
const rooms = await api.get('/rooms');

// POST /api/v1/occupancy (token se agrega automáticamente)
await api.post('/occupancy', {
  room_id: 1,
  guest_id: 2,
  check_in: new Date().toISOString(),
});

// DELETE /api/v1/guests/5 (token se agrega automáticamente)
await api.delete('/guests/5');
```

---

## PRUEBAS MANUALES CON CURL

### 1. Bootstrap (crear primer admin)
```bash
curl -X POST http://localhost:8000/api/v1/users/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hostal.com",
    "password": "SuperSecure123!",
    "role": "admin"
  }'
```

### 2. Login
```bash
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@hostal.com&password=SuperSecure123!" \
  | jq -r '.access_token')

echo "Token: $TOKEN"
```

### 3. Obtener datos usuario
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Crear recepcionista (solo admin)
```bash
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "recepcionista@hostal.com",
    "password": "Secure456!",
    "role": "recepcionista"
  }'
```

### 5. Listar usuarios (solo admin)
```bash
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## DEBUGGING - Ver Contenido JWT

```bash
# Decodificar JWT (en bash)
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3MDAwMDAwMDB9.xxx"

# Extraer y decodificar payload
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq

# Resultado:
# {
#   "sub": "123",
#   "role": "admin",
#   "exp": 1700000000
# }
```

