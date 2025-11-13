# SISTEMA DE AUTENTICACIÓN - ANÁLISIS COMPLETO

## 1. ENDPOINTS DE AUTENTICACIÓN (Backend)

### Archivo: `/home/adrpinto/hostal/backend/app/routers/auth.py`

#### POST /auth/login
- **Descripción**: Inicia sesión y devuelve un token JWT
- **Limitación**: 5 intentos por minuto por IP (rate limiting)
- **Entrada**: OAuth2PasswordRequestForm (username, password)
- **Salida**: 
  ```json
  {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer"
  }
  ```
- **Lógica**:
  1. Busca usuario por email (username)
  2. Verifica contraseña contra hash bcrypt
  3. Registra intentos fallidos en auditoria
  4. Si es exitoso, crea token JWT con user_id y role
  5. Token expira en 120 minutos (configurable)

#### GET /auth/me
- **Descripción**: Obtiene datos del usuario autenticado
- **Autenticación**: Requiere token JWT válido
- **Salida**: Objeto UserOut con id, email, role

#### POST /users/bootstrap
- **Descripción**: Crea el PRIMER usuario admin (solo si no existe)
- **Sin autenticación requerida**: Endpoint especial para inicialización
- **Uso**: Para el primer setup del sistema

---

## 2. MODELO DE USUARIO (Backend)

### Archivo: `/home/adrpinto/hostal/backend/app/models/user.py`

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int]              # PK, auto-increment
    email: Mapped[str]           # UNIQUE, indexed
    hashed_password: Mapped[str] # bcrypt hash
    role: Mapped[str]            # Default: "user"
```

**Roles disponibles**:
- `admin` - Acceso total al sistema
- `gerente` - Gestión operativa (no mostrado en endpoints)
- `recepcionista` - Acceso limitado a operaciones específicas
- `mantenimiento` - Acceso solo a mantenimiento (no mostrado en endpoints)
- `user` - Usuario básico (por defecto)

---

## 3. SCHEMAS DE AUTENTICACIÓN

### Archivo: `/home/adrpinto/hostal/backend/app/schemas/auth.py`

```python
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

### Archivo: `/home/adrpinto/hostal/backend/app/schemas/user.py`

```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = "user"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    model_config = ConfigDict(from_attributes=True)
```

---

## 4. MANEJO DE SEGURIDAD (Backend)

### Archivo: `/home/adrpinto/hostal/backend/app/core/security.py`

#### Funciones principales:

**hash_password(password: str) -> str**
- Usa bcrypt con CryptContext
- Convierte contraseña plana a hash seguro
- Alias: get_password_hash()

**verify_password(plain_password: str, hashed_password: str) -> bool**
- Verifica contraseña contra hash
- Usa bcrypt para comparación segura

**create_access_token(data: dict, expires_delta: timedelta | None) -> str**
- Crea JWT con payload personalizado
- Incluye claims: "sub" (user_id), "role", "exp" (expiración)
- Usa algoritmo HS256 (HMAC-SHA256)
- Expiración por defecto: 15 min (pero en auth.py se configura a 120 min)

**get_current_user(token: str, db: Session) -> User**
- Dependency injection de FastAPI
- Extrae user_id del token
- Busca usuario en BD
- Retorna User o lanza HTTPException 401
- Incluye logging estructurado

**require_roles(*roles: str)**
- Crea dependencia que valida roles
- Verifica que user.role esté en la lista permitida
- Lanza HTTPException 403 si no tiene permisos

#### Configuración JWT:
- **Algorithm**: HS256 (configurable en .env)
- **Secret Key**: Se define en config (DEBE ser segura en producción)
- **Token URL**: "/auth/login"

---

## 5. CONFIGURACIÓN (Backend)

### Archivo: `/home/adrpinto/hostal/backend/app/core/config.py`

```python
class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str = "change-me-in-production"  # Debe ser >= 32 chars en prod
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
```

**Validaciones**:
- En producción, SECRET_KEY debe tener >= 32 caracteres
- No acepta valores por defecto en producción

---

## 6. PÁGINA DE LOGIN (Frontend)

### Archivo: `/home/adrpinto/hostal/frontend/src/pages/auth/Login.tsx`

#### Estructura:
- Componente funcional con React hooks
- Split layout: Lado izquierdo (testimonio), lado derecho (form)
- Pre-cargado con credenciales demo: `admin@example.com` / `string`

#### Funcionalidades:
1. **Inputs**:
   - Email (type="email")
   - Password (type="password" con toggle mostrar/ocultar)

2. **Estados**:
   - loading: Muestra spinner mientras procesa
   - error: Muestra alerta roja con mensaje
   - showPassword: Toggle mostrar/ocultar contraseña

3. **Flujo de login**:
   ```
   handleSubmit()
   ├─ authApi.login({ username: email, password })
   │  └─ POST /auth/login (OAuth2 format)
   ├─ localStorage.setItem('access_token', token)
   ├─ authApi.getCurrentUser()
   │  └─ GET /auth/me
   ├─ setAuth(user, token)
   │  └─ Zustand state + localStorage
   └─ navigate('/dashboard')
   ```

4. **Manejo de errores**:
   - Captura excepciones con try/catch
   - Usa handleApiError() para formatear mensajes
   - Muestra ErrorAlert component

#### Componentes usados:
- Card, CardHeader, CardContent (UI primitivos)
- Input, Label, Button (Form controls)
- Eye/EyeOff icons (Lucide React)
- AlertCircle icon (Lucide React)

---

## 7. AUTENTICACIÓN EN FRONTEND

### Archivo: `/home/adrpinto/hostal/frontend/src/lib/hooks/useAuth.ts`

```typescript
interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
}
```

**Implementación**:
- Usa Zustand para state management
- Middleware `persist`: Guarda en localStorage bajo clave "auth-storage"
- setAuth: Guarda token en localStorage Y en estado
- logout: Limpia ambos

### Archivo: `/home/adrpinto/hostal/frontend/src/lib/api/auth.ts`

```typescript
authApi.login(credentials)
├─ Convierte a URLSearchParams (OAuth2 format)
└─ POST /auth/login

authApi.getCurrentUser()
└─ GET /auth/me (incluyendo token en header)

authApi.logout()
└─ localStorage.removeItem('access_token')
```

### Archivo: `/home/adrpinto/hostal/frontend/src/lib/api/client.ts`

**Axios setup**:
- Base URL: http://localhost:8000/api/v1
- Interceptor request: Agrega token en Authorization header
- Interceptor response: Si 401, limpia localStorage y redirige a /login

---

## 8. AUTORIZACIÓN (ROLES/PERMISOS)

### Sistema de Roles en Endpoints:

**Roles usados**:
1. `admin` - Acceso total
2. `recepcionista` - Acceso limitado
3. `mantenimiento` - Acceso específico

### Ejemplo de uso en routers:

```python
@router.post("/")
@dependencies=[Depends(require_roles("admin"))]
def create_user(...):  # Solo admin

@router.get("/")
@dependencies=[Depends(require_roles("admin", "recepcionista"))]
def list_rooms(...):  # Admin o recepcionista

@router.delete("/{id}")
@dependencies=[Depends(require_roles("admin"))]
def delete_guest(...):  # Solo admin
```

### Endpoint sin autenticación requerida:
- POST /users/bootstrap (inicialización)
- POST /auth/login (login)

---

## 9. FLUJO COMPLETO DE AUTENTICACIÓN

```
Usuario entra a /login
↓
Completa email + password
↓
Frontend POST /auth/login (OAuth2PasswordRequestForm)
↓
Backend:
├─ Busca usuario por email
├─ Verifica contraseña con bcrypt
├─ Registra intento en auditoría
├─ Crea JWT con user_id + role + exp
└─ Retorna {access_token, token_type}
↓
Frontend:
├─ Guarda token en localStorage
├─ GET /auth/me para obtener datos usuario
├─ Actualiza Zustand state
└─ Navega a /dashboard
↓
Para próximas requests:
├─ Axios interceptor agrega "Authorization: Bearer <token>"
├─ Si 401: limpia localStorage y redirige a /login
└─ get_current_user() valida token en cada endpoint protegido
```

---

## 10. CONFIGURACIÓN DE AUTENTICACIÓN (Frontend)

### Archivo: `/home/adrpinto/hostal/frontend/src/types/index.ts`

```typescript
export interface User {
  id: number
  email: string
  role: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface UserCreate {
  email: string
  password: string
  role: 'admin' | 'gerente' | 'recepcionista' | 'mantenimiento'
}
```

---

## 11. AUDIT LOGGING

### Archivo: `/home/adrpinto/hostal/backend/app/core/audit.py` (usado en auth.py)

Cada intento de login (exitoso o fallido) registra:
- Email del usuario
- Éxito/Fallo
- IP del cliente
- ID del usuario (si exitoso)
- Rol del usuario (si exitoso)
- Razón del fallo (si aplica)

---

## 12. PUNTOS CLAVE PARA ENTENDER

1. **OAuth2 con Password Flow**: Backend espera `username` y `password` en formato x-www-form-urlencoded
2. **JWT Stateless**: Tokens no se almacenan en backend, validación mediante firma
3. **Dual Storage Frontend**: Token en localStorage + Zustand state
4. **Role-Based Access Control (RBAC)**: Sistema de roles simple en columna "role"
5. **Rate Limiting**: Login limitado a 5 intentos/minuto por IP
6. **Interceptores**: Axios auto-inserta token y maneja 401 automáticamente
7. **Bootstrap Pattern**: Primer admin se crea sin autenticación

---

## 13. RUTAS DE ARCHIVOS CLAVE

**Backend**:
- `/home/adrpinto/hostal/backend/app/routers/auth.py` - Endpoints login/me
- `/home/adrpinto/hostal/backend/app/routers/users.py` - Gestión usuarios + bootstrap
- `/home/adrpinto/hostal/backend/app/models/user.py` - Modelo User
- `/home/adrpinto/hostal/backend/app/schemas/auth.py` - Schemas LoginIn/TokenOut
- `/home/adrpinto/hostal/backend/app/schemas/user.py` - Schemas User
- `/home/adrpinto/hostal/backend/app/core/security.py` - JWT + password utils
- `/home/adrpinto/hostal/backend/app/core/config.py` - Configuración

**Frontend**:
- `/home/adrpinto/hostal/frontend/src/pages/auth/Login.tsx` - Página login UI
- `/home/adrpinto/hostal/frontend/src/lib/hooks/useAuth.ts` - Zustand store
- `/home/adrpinto/hostal/frontend/src/lib/api/auth.ts` - API calls
- `/home/adrpinto/hostal/frontend/src/lib/api/client.ts` - Axios setup + interceptores
- `/home/adrpinto/hostal/frontend/src/types/index.ts` - TypeScript types

