# ÍNDICE DE DOCUMENTACIÓN - SISTEMA DE AUTENTICACIÓN

Este índice contiene referencias a toda la documentación sobre el sistema de autenticación del proyecto Hostal.

## Archivos de Documentación

### 1. RESUMEN_AUTENTICACION.txt (COMIENZA AQUÍ)
**Ubicación**: `/home/adrpinto/hostal/RESUMEN_AUTENTICACION.txt`

Documento principal con el análisis completo en formato texto puro. Incluye:
- Ubicación de archivos clave (Backend y Frontend)
- Estructura del modelo de usuario
- Endpoints de autenticación (login, me, bootstrap)
- Flujo completo de autenticación con diagrama ASCII
- Detalles de seguridad: JWT, hashing, roles
- Consideraciones de seguridad
- Variables de entorno
- Errores comunes
- Testing manual con curl

**Cuándo usar**: Cuando necesitas una visión general completa y acceso rápido a información

---

### 2. AUTH_SYSTEM_ANALYSIS.md (ANÁLISIS TÉCNICO DETALLADO)
**Ubicación**: `/home/adrpinto/hostal/AUTH_SYSTEM_ANALYSIS.md`

Análisis técnico profundo del sistema en 13 secciones:

1. **Endpoints de Autenticación** - POST /auth/login, GET /auth/me, POST /users/bootstrap
2. **Modelo de Usuario** - Estructura BD, roles disponibles
3. **Schemas de Autenticación** - LoginIn, TokenOut, UserCreate, UserOut
4. **Manejo de Seguridad** - Funciones de security.py con explicaciones
5. **Configuración** - Settings, variables de entorno
6. **Página de Login** - Estructura React, funcionalidades
7. **Autenticación Frontend** - Zustand store, API calls, Axios setup
8. **Autorización (Roles)** - Sistema de RBAC en endpoints
9. **Flujo Completo** - Diagrama ASCII del flujo de autenticación
10. **Configuración Frontend** - TypeScript types
11. **Audit Logging** - Cómo funciona la auditoria
12. **Puntos Clave** - Resumen de conceptos importantes
13. **Rutas de Archivos** - Ubicación de todos los archivos relevantes

**Cuándo usar**: Cuando necesitas entender la arquitectura completa con detalles técnicos

---

### 3. AUTH_QUICK_REFERENCE.md (REFERENCIA RÁPIDA)
**Ubicación**: `/home/adrpinto/hostal/AUTH_QUICK_REFERENCE.md`

Guía de referencia rápida con tablas y diagramas:

- **TABLA: Endpoints de Autenticación** - Métodos, auth, rate limit
- **TABLA: Roles y Permisos** - Matriz de roles
- **TABLA: Protección de Endpoints** - Qué rol accede a qué
- **TABLA: Estructura JWT Token** - Campos del token
- **TABLA: Estados de Error** - HTTP status codes y respuestas
- **DIAGRAMA: Flujo de Autenticación** - ASCII art detallado
- **DIAGRAMA: Estructura de Archivos** - Árbol de directorios
- **Variables de Entorno** - Lista de configuración
- **Checklist de Seguridad** - Verificaciones importantes
- **Operaciones Comunes** - curl examples
- **Generación de SECRET_KEY** - Cómo generar claves seguras

**Cuándo usar**: Cuando necesitas consultas rápidas, tablas de referencia, ejemplos curl

---

### 4. AUTH_CODE_EXAMPLES.md (EJEMPLOS DE CÓDIGO)
**Ubicación**: `/home/adrpinto/hostal/AUTH_CODE_EXAMPLES.md`

Ejemplos de código comentados:

**Backend**:
1. Router - Endpoint POST /auth/login
2. Modelo User - Estructura SQLAlchemy
3. Hashing - hash_password(), verify_password()
4. JWT Token - create_access_token(), get_current_user()
5. Validación de Roles - require_roles()
6. Uso en Endpoint - Ejemplo con @require_roles
7. Bootstrap - Crear primer admin
8. Password Hashing - Detalle de bcrypt

**Frontend**:
1. Componente Login - Flujo completo
2. Zustand Store - useAuth hook
3. API Auth Service - authApi object
4. Axios Setup - Interceptores
5. TypeScript Types - Interfaces

**Patrones Avanzados**:
- ProtectedRoute component
- Router configuration
- API requests con token automático
- curl examples para testing
- JWT decoding

**Cuándo usar**: Cuando necesitas ver código real y ejemplos prácticos

---

## Mapa de Ubicación de Archivos

### Backend

```
backend/app/
├── core/
│   ├── security.py        → hash_password, verify_password, create_access_token, get_current_user, require_roles
│   ├── config.py          → Settings, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
│   ├── audit.py           → log_login (auditoría)
│   └── db.py              → get_db
│
├── models/
│   └── user.py            → User (id, email, hashed_password, role)
│
├── schemas/
│   ├── auth.py            → LoginIn, TokenOut
│   └── user.py            → UserCreate, UserOut
│
└── routers/
    ├── auth.py            → POST /auth/login, GET /auth/me
    └── users.py           → POST /users/bootstrap, POST /users/, GET /users/
```

### Frontend

```
frontend/src/
├── pages/
│   └── auth/
│       └── Login.tsx      → Página de login UI
│
├── lib/
│   ├── hooks/
│   │   └── useAuth.ts     → Zustand store (auth state)
│   └── api/
│       ├── client.ts      → Axios instance + interceptores
│       └── auth.ts        → authApi methods
│
└── types/
    └── index.ts           → User, LoginRequest, LoginResponse types
```

---

## Conceptos Clave Explicados Brevemente

### OAuth2 Password Flow
El backend espera `username` y `password` en formato `application/x-www-form-urlencoded`. Es el flujo estándar de OAuth2.

### JWT (JSON Web Token)
- **Header**: Algoritmo y tipo
- **Payload**: Sub (user_id), role, exp (expiración)
- **Signature**: HMAC-SHA256 con SECRET_KEY
- Stateless: no se almacena en backend, se valida por firma

### bcrypt Hashing
- Contraseñas nunca se almacenan en texto plano
- Salt incluido en el hash
- Función lenta por diseño (resiste fuerza bruta)
- Verificación: `bcrypt.verify(plain, hash)` → True/False

### RBAC (Role-Based Access Control)
- Modelo simple: columna `role` en tabla users
- Roles: admin, gerente, recepcionista, mantenimiento, user
- Validación: `@require_roles("admin", "recepcionista")`
- Errores: 401 (no autenticado), 403 (rol insuficiente)

### Token Storage en Frontend
- localStorage: accesible vía JavaScript (vulnerable a XSS)
- Zustand state: persistido en localStorage
- Axios interceptor: agrega automáticamente `Authorization: Bearer <token>`

### Rate Limiting
- POST /auth/login: 5 intentos por minuto por IP
- Implementado con limiter de FastAPI
- Protege contra ataques de fuerza bruta

---

## Flujo de Autenticación en 7 Pasos

1. **Usuario accede a /login** → Componente Login.tsx se renderiza
2. **Completa credentials** → handleSubmit() ejecuta
3. **Frontend POST /auth/login** → Envía username/password
4. **Backend valida** → Busca usuario, verifica password, crea JWT
5. **Frontend recibe token** → Guarda en localStorage + Zustand
6. **Obtiene datos usuario** → GET /auth/me
7. **Navega a /dashboard** → Token se agrega automáticamente a requests

---

## Consideraciones de Seguridad

### Protecciones Implementadas
- Rate limiting en login (5/min)
- Hashing bcrypt de contraseñas
- JWT con expiración (120 min)
- Auditoria de intentos de login
- CORS restringido
- Validación de roles en endpoints sensibles

### Mejoras Posibles
- Usar httpOnly cookies en lugar de localStorage
- Implementar refresh tokens
- Validar enum de roles en modelo
- 2FA (two-factor authentication)
- Detección de anomalías
- Mecanismo de password reset
- Login con OAuth2 (Google, GitHub)

---

## Endpoints Protegidos por Rol

| Endpoint | Admin | Recepcionista | Mantenimiento | Notes |
|----------|:-----:|:-------------:|:-------------:|-------|
| POST /guests | ✓ | ✓ | | |
| DELETE /guests/{id} | ✓ | | | |
| GET /rooms | ✓ | ✓ | | |
| POST /rooms | ✓ | | | |
| DELETE /rooms/{id} | ✓ | | | |
| POST /media | ✓ | ✓ | | |
| DELETE /media/{id} | ✓ | | | |
| GET /maintenance | ✓ | ✓ | ✓ | |
| POST /room-rates | ✓ | ✓ | | |
| POST /exchange-rates | ✓ | | | |
| POST /users | ✓ | | | |
| GET /users | ✓ | | | |

---

## Variables de Entorno

### Backend (.env)
```bash
SECRET_KEY=<64+ chars random>   # CRÍTICO
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
CORS_ORIGINS=http://localhost:3000
DEBUG=true
APP_ENV=dev
```

### Frontend (.env.local)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## Testing Rápido

### Con Curl
```bash
# 1. Bootstrap admin
curl -X POST http://localhost:8000/api/v1/users/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test123!","role":"admin"}'

# 2. Login
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@test.com&password=Test123!" | jq -r '.access_token')

# 3. Obtener datos usuario
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### En Frontend
```typescript
import { useAuth } from '@/lib/hooks/useAuth';

const { user, token, setAuth, logout } = useAuth();

// Hacer login: ver pages/auth/Login.tsx
// Acceso a datos usuario: user?.email, user?.role
// Logout: logout()
```

---

## Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| "Credenciales inválidas" | Usuario no existe o password incorrecto | Verificar email y password |
| "No se pudieron validar las credenciales" | Token inválido/expirado | Hacer login nuevamente |
| "Operation not permitted for this user role" | Rol insuficiente | Usar usuario con rol apropiado |
| "5 per 1 minute" | Rate limit excedido | Esperar 1 minuto |
| "Email already registered" | Email duplicado | Usar otro email |
| "Admin already exists" | Bootstrap después de admin creado | Solo funciona primera vez |

---

## Referencias Rápidas

- **Para entender TODO**: Leer `RESUMEN_AUTENTICACION.txt` primero
- **Para detalles técnicos**: `AUTH_SYSTEM_ANALYSIS.md`
- **Para referencias rápidas**: `AUTH_QUICK_REFERENCE.md`
- **Para ejemplos de código**: `AUTH_CODE_EXAMPLES.md`

---

## Contacto / Preguntas

Si tienes preguntas sobre el sistema de autenticación, revisa primero:
1. El documento más relevante de arriba
2. Los ejemplos de código en `AUTH_CODE_EXAMPLES.md`
3. Los errores comunes en la tabla de soluciones

