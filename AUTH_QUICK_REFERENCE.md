# REFERENCIA RÁPIDA - AUTENTICACIÓN

## TABLA: Endpoints de Autenticación

| Endpoint | Método | Auth Required | Rate Limit | Descripción |
|----------|--------|---------------|-----------|-------------|
| /auth/login | POST | NO | 5/min | Obtener JWT token |
| /auth/me | GET | YES | - | Datos usuario actual |
| /users/ | GET | YES (admin) | - | Listar usuarios |
| /users/ | POST | YES (admin) | - | Crear usuario |
| /users/bootstrap | POST | NO | - | Crear primer admin |
| /users/me | GET | YES | - | Datos usuario (alt) |

---

## TABLA: Roles y Permisos

| Rol | Admin | Recepcionista | Mantenimiento | Descripción |
|-----|-------|---------------|---------------|-------------|
| admin | ✓ | ✓ | ✓ | Acceso total |
| gerente | - | - | - | Gestión operativa (definido) |
| recepcionista | - | ✓ | - | Operaciones limitadas |
| mantenimiento | - | - | ✓ | Solo mantenimiento |
| user | - | - | - | Usuario básico |

---

## TABLA: Protección de Endpoints por Rol

| Endpoint | Admin | Recepcionista | Mantenimiento |
|----------|-------|---------------|---------------|
| POST /guests | ✓ | ✓ | - |
| DELETE /guests/{id} | ✓ | - | - |
| GET /rooms | ✓ | ✓ | - |
| POST /rooms | ✓ | - | - |
| DELETE /rooms/{id} | ✓ | - | - |
| POST /media | ✓ | ✓ | - |
| DELETE /media/{id} | ✓ | - | - |
| GET /maintenance | ✓ | ✓ | ✓ |
| POST /room-rates | ✓ | ✓ | - |
| POST /exchange-rates | ✓ | - | - |
| POST /users | ✓ | - | - |

---

## TABLA: Estructura JWT Token

| Campo | Contenido | Ejemplo |
|-------|-----------|---------|
| Header.alg | HS256 | `{"alg":"HS256","typ":"JWT"}` |
| Payload.sub | User ID | `"123"` |
| Payload.role | User role | `"admin"` |
| Payload.exp | Expiration Unix | `1700000000` |
| Signature | HMAC-SHA256 | `xxx...xxx` |

---

## TABLA: Estado de Errores de Autenticación

| Status | Situación | Respuesta |
|--------|-----------|-----------|
| 200 | Login exitoso | `{"access_token": "...", "token_type": "bearer"}` |
| 401 | Credenciales inválidas | `{"detail": "Credenciales inválidas"}` |
| 401 | Token inválido/expirado | `{"detail": "No se pudieron validar las credenciales"}` |
| 403 | Rol insuficiente | `{"detail": "Operation not permitted for this user role"}` |
| 429 | Rate limit excedido | `{"detail": "5 per 1 minute"}` |
| 400 | Email duplicado | `{"detail": "Email already registered"}` |

---

## DIAGRAMA: Flujo de Autenticación

```
┌──────────────────────────────────────────────────────────┐
│                    PÁGINA DE LOGIN                        │
│  Email: admin@example.com                                │
│  Password: ••••••••                                       │
│  [Iniciar Sesión]                                        │
└──────────┬───────────────────────────────────────────────┘
           │
           ├─ handleSubmit()
           │  ├─ preventDefault()
           │  ├─ setLoading(true)
           │  └─ setError('')
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│              FRONTEND - authApi.login()                   │
│                                                           │
│  POST /auth/login                                        │
│  Content-Type: application/x-www-form-urlencoded        │
│  Body: username=admin@example.com&password=string       │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│         BACKEND - POST /auth/login                        │
│                                                           │
│ 1. form_data = OAuth2PasswordRequestForm                 │
│ 2. user = db.query(User).filter(email == username)       │
│ 3. verify_password(password, user.hashed_password)       │
│ 4. log_login(success=True, ip=...)                       │
│ 5. create_access_token({                                 │
│      sub: str(user.id),                                  │
│      role: user.role,                                    │
│      exp: now + 120min                                   │
│    })                                                     │
│ 6. return TokenOut(access_token, token_type)             │
└──────────┬───────────────────────────────────────────────┘
           │
           ├─ Response: {
           │    "access_token": "eyJ0eXAi...",
           │    "token_type": "bearer"
           │  }
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│         FRONTEND - authApi.getCurrentUser()              │
│                                                           │
│  GET /auth/me                                            │
│  Authorization: Bearer eyJ0eXAi...                       │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│      BACKEND - GET /auth/me                              │
│                                                           │
│ 1. get_current_user(token)                               │
│    ├─ jwt.decode(token, SECRET_KEY)                      │
│    ├─ user_id = payload.get('sub')                       │
│    └─ user = db.get(User, user_id)                       │
│ 2. return UserOut(id, email, role)                       │
└──────────┬───────────────────────────────────────────────┘
           │
           ├─ Response: {
           │    "id": 1,
           │    "email": "admin@example.com",
           │    "role": "admin"
           │  }
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│         FRONTEND - setAuth()                             │
│                                                           │
│ 1. localStorage.setItem('access_token', token)           │
│ 2. useAuth.setState({user, token})                       │
│    └─ Zustand guardará en localStorage bajo              │
│       'auth-storage'                                     │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│    FRONTEND - navigate('/dashboard')                     │
│                                                           │
│    Usuario es redirigido al dashboard                   │
└──────────────────────────────────────────────────────────┘
           │
           ▼
     AUTENTICADO EXITOSO


═══════════════════════════════════════════════════════════

PRÓXIMAS REQUESTS:
────────────────────────────────────────────────────────────

  Axios Request Interceptor:
  ├─ token = localStorage.getItem('access_token')
  ├─ config.headers.Authorization = `Bearer ${token}`
  └─ return config

  ▼

  Backend get_current_user():
  ├─ token = Depends(oauth2_scheme)
  ├─ payload = jwt.decode(token, SECRET_KEY)
  ├─ user = db.get(User, payload['sub'])
  └─ return user

  ▼

  Response Interceptor (en caso de 401):
  ├─ localStorage.removeItem('access_token')
  └─ window.location.href = '/login'
```

---

## DIAGRAMA: Estructura de Archivos

```
hostal/
├── backend/
│   └── app/
│       ├── core/
│       │   ├── security.py          [JWT, password utils]
│       │   ├── config.py            [Settings, SECRET_KEY]
│       │   ├── audit.py             [log_login]
│       │   └── db.py                [get_db]
│       ├── models/
│       │   └── user.py              [User model]
│       ├── schemas/
│       │   ├── auth.py              [LoginIn, TokenOut]
│       │   └── user.py              [UserCreate, UserOut]
│       └── routers/
│           ├── auth.py              [login, me endpoints]
│           ├── users.py             [create, list, bootstrap]
│           └── [otros].py           [@require_roles()]
│
└── frontend/
    └── src/
        ├── pages/
        │   └── auth/
        │       └── Login.tsx         [Login page UI]
        ├── lib/
        │   ├── hooks/
        │   │   └── useAuth.ts        [Zustand store]
        │   └── api/
        │       ├── client.ts         [Axios + interceptors]
        │       └── auth.ts           [authApi methods]
        └── types/
            └── index.ts              [User, LoginRequest types]
```

---

## VARIABLES DE ENTORNO IMPORTANTES

```bash
# Backend (.env)
SECRET_KEY=<64+ chars random string>        # CRÍTICO
ALGORITHM=HS256                             # Por defecto
ACCESS_TOKEN_EXPIRE_MINUTES=120             # Expiración token
CORS_ORIGINS=http://localhost:3000          # Orígenes CORS
DEBUG=true                                  # Dev only
APP_ENV=dev                                 # dev o prod

# Frontend (.env.local)
VITE_API_BASE_URL=http://localhost:8000     # URL del API
```

---

## CHECKLIST: Verificaciones de Seguridad

- [ ] SECRET_KEY en producción tiene >= 32 caracteres
- [ ] SECRET_KEY no es un valor por defecto
- [ ] Rate limiting está activo (5/min en login)
- [ ] Contraseñas se almacenan como hash bcrypt
- [ ] Tokens incluyen expiración (120 min)
- [ ] CORS origins están limitados
- [ ] No hay credenciales de test en producción
- [ ] Logs de auditoria se registran correctamente
- [ ] get_current_user() valida en cada endpoint protegido
- [ ] Roles se validan en endpoints sensibles

---

## OPERACIONES COMUNES

### Crear usuario admin (primera vez):
```bash
curl -X POST http://localhost:8000/api/v1/users/bootstrap \
  -H "Content-Type: application/json" \
  -d {
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "role": "admin"
  }
```

### Login:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@example.com&password=SecurePassword123!"
```

### Obtener datos usuario actual:
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

### Crear nuevo usuario (admin only):
```bash
curl -X POST http://localhost:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d {
    "email": "recepcionista@example.com",
    "password": "Pass123!",
    "role": "recepcionista"
  }
```

---

## GENERACIÓN DE SECRET_KEY SEGURO

```bash
# Linux/Mac
openssl rand -base64 32

# Python
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Python (alternativa)
python -c 'import secrets; print(secrets.token_hex(32))'
```

