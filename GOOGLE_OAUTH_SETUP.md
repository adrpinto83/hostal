# Configuración de Google OAuth y Sistema de Aprobación de Usuarios

Este documento describe cómo configurar e implementar la autenticación con Google OAuth y el sistema de aprobación de usuarios en tu aplicación Hostal Starlight.

## Descripción General

El sistema permite que los usuarios se registren y logueen usando sus cuentas de Google. Sin embargo, para garantizar control sobre quién puede acceder al sistema, todos los nuevos usuarios registrados con Google deben ser aprobados por un administrador antes de poder acceder completamente a la aplicación.

### Flujo de Autenticación con Google

1. **Usuario intenta login con Google**
   - El usuario hace clic en "Continúa con Google" en la página de login
   - Google autentica al usuario y devuelve un token de identidad

2. **Verificación del token en el backend**
   - El backend verifica que el token de Google es válido
   - Se extrae la información del usuario (email, nombre, foto de perfil)

3. **Creación del usuario (si es nuevo)**
   - Si es la primera vez que el usuario se loguea con Google:
     - Se crea un nuevo usuario en la base de datos
     - El usuario se marca como **NO APROBADO** (`approved = false`)
     - Se envía un mensaje al usuario indicando que espere a la aprobación del admin

4. **Aprobación del administrador**
   - El administrador ve la solicitud en el panel "Aprobación de Usuarios"
   - Puede aprobar o rechazar al usuario
   - Una vez aprobado, el usuario puede loguear y acceder a la aplicación

5. **Login exitoso**
   - El usuario loguea nuevamente
   - El backend verifica que está aprobado
   - Se emite un token JWT
   - El usuario puede acceder a toda la aplicación

## Configuración del Backend

### 1. Instalar Dependencias

Las siguientes dependencias ya se han agregado a `requirements.txt`:
- `google-auth==2.25.2`
- `google-auth-oauthlib==1.1.0`
- `google-auth-httplib2==0.2.0`

Instálalas con:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en el directorio `backend/` con las siguientes variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
```

Para obtener estas credenciales:
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto
3. Habilita la API de Google+ o Google Identity
4. Crea credenciales OAuth 2.0:
   - Ve a "Credenciales"
   - Haz clic en "Crear credenciales" → "ID de cliente de OAuth"
   - Selecciona "Aplicación web"
   - Agrega URIs autorizados:
     - `http://localhost:3000`
     - `http://localhost:5173`
     - `https://tu-dominio.com` (para producción)
   - Copia el Client ID y Client Secret

### 3. Ejecutar Migraciones de Base de Datos

La migración `264c79f6c947_add_google_oauth_support.py` ha sido creada. Ejecuta:

```bash
cd backend
python -m alembic upgrade head
```

Esto agregará las siguientes columnas a la tabla `users`:
- `approved` (boolean): Indica si el usuario ha sido aprobado
- `google_id` (string): ID único de Google
- `auth_provider` (string): Método de autenticación (email o google)
- `created_at` (datetime): Fecha de creación
- `updated_at` (datetime): Fecha de actualización
- `full_name` (string): Nombre completo del usuario
- `profile_picture` (string): URL de la foto de perfil de Google

### 4. Nuevos Endpoints de API

Se han agregado los siguientes endpoints:

#### POST `/auth/google-login`
Autentica a un usuario usando un token de Google.

**Request:**
```json
{
  "google_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjExNDY4ZmY4NDc2..."
}
```

**Responses:**
- `200 OK`: Retorna token JWT (usuario aprobado)
- `202 ACCEPTED`: Usuario registrado pero pendiente de aprobación
- `403 FORBIDDEN`: Usuario no aprobado
- `401 UNAUTHORIZED`: Token de Google inválido

#### GET `/auth/pending-users`
Obtiene lista de usuarios pendientes de aprobación.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (solo para admins)

**Response:**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Juan Pérez",
    "profile_picture": "https://...",
    "auth_provider": "google",
    "created_at": "2024-11-12T10:30:00",
    "approved": false
  }
]
```

#### POST `/auth/approve-user/{user_id}`
Aprueba o rechaza un usuario.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (solo para admins)

**Request:**
```json
{
  "approved": true,
  "reason": "Motivo opcional"
}
```

**Response:**
```json
{
  "message": "Usuario example@email.com aprobado",
  "user_id": 1,
  "approved": true
}
```

## Configuración del Frontend

### 1. Instalar Dependencias

Se ha agregado `@react-oauth/google` a `package.json`. Instála con:

```bash
cd frontend
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en el directorio `frontend/` con:

```env
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

Usa el mismo Client ID que configuraste en el backend.

### 3. Interfaz de Usuario

#### Página de Login Mejorada
- La página de login ahora incluye un botón "Continúa con Google"
- Los usuarios pueden loguear con email/contraseña o Google
- Mensajes claros cuando el usuario está pendiente de aprobación
- Mejor diseño visual con gradientes y alertas mejoradas

#### Panel de Aprobación de Usuarios (Admin)
- Ubicado en: `/admin/user-approvals`
- Solo visible para administradores
- Muestra lista de usuarios pendientes de aprobación
- Botones para aprobar o rechazar usuarios
- Información del usuario (email, nombre, fecha de registro, foto de perfil)

## Flujo de Uso

### Para Usuarios Nuevos

1. Accede a la página de login
2. Haz clic en "Continúa con Google"
3. Completa el proceso de autenticación con Google
4. Recibirás un mensaje indicando que tu cuenta está pendiente de aprobación
5. Espera a que el administrador apruebe tu solicitud
6. Una vez aprobado, podrás loguear y acceder a la aplicación

### Para Administradores

1. Accede a la dashboard
2. En la barra lateral (lado izquierdo), ve a "Administración" → "Aprobaciones"
3. Verás una lista de usuarios pendientes de aprobación
4. Haz clic en "Aprobar" para permitir el acceso del usuario
5. Haz clic en "Rechazar" para eliminar la solicitud

## Cambios en la Base de Datos

### Tabla `users`

Nuevas columnas:
- `approved` (BOOLEAN, DEFAULT FALSE): Estado de aprobación del usuario
- `google_id` (VARCHAR(255), UNIQUE, NULLABLE): ID único de Google
- `auth_provider` (VARCHAR(50), DEFAULT 'email'): Método de autenticación
- `created_at` (TIMESTAMP, DEFAULT NOW()): Fecha de creación
- `updated_at` (TIMESTAMP, DEFAULT NOW()): Fecha de última actualización
- `full_name` (VARCHAR(255), NULLABLE): Nombre completo
- `profile_picture` (VARCHAR(255), NULLABLE): URL de la foto de perfil

Cambios:
- `hashed_password` ahora es NULLABLE (para usuarios de Google OAuth)

## Cambios en el Código

### Backend

**Archivos Modificados:**
- `app/models/user.py`: Agregados nuevos campos al modelo User
- `app/routers/auth.py`: Agregados nuevos endpoints de Google OAuth
- `app/schemas/auth.py`: Agregados nuevos esquemas Pydantic
- `app/schemas/user.py`: Actualizado esquema UserOut
- `app/core/config.py`: Agregadas configuraciones de Google OAuth
- `requirements.txt`: Agregadas dependencias de Google

**Archivos Nuevos:**
- `app/core/google_oauth.py`: Utilidades para verificar tokens de Google

### Frontend

**Archivos Modificados:**
- `src/pages/auth/Login.tsx`: Mejorada página de login con Google OAuth
- `src/lib/api/auth.ts`: Agregados métodos para Google login y aprobaciones
- `src/types/index.ts`: Actualizado tipo User
- `src/components/layout/Sidebar.tsx`: Agregada sección de administración
- `package.json`: Agregada dependencia @react-oauth/google

**Archivos Nuevos:**
- `src/pages/admin/UserApprovals.tsx`: Panel de aprobación de usuarios

## Testing

### Probar Google Login en Desarrollo

1. **Backend corriendo:**
   ```bash
   cd backend
   source venv/bin/activate
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend corriendo:**
   ```bash
   cd frontend
   npm run dev  # Accesible en http://localhost:5173
   ```

3. **Probar login:**
   - Ve a http://localhost:5173/login
   - Haz clic en "Continúa con Google"
   - Completa la autenticación
   - Verás mensaje de "pendiente de aprobación"

4. **Aprobar usuario (como admin):**
   - Loguea con la cuenta admin existente (admin@example.com / string)
   - Ve a "Administración" → "Aprobaciones"
   - Busca el usuario nuevo
   - Haz clic en "Aprobar"

5. **Loguear como usuario aprobado:**
   - Loguea con Google nuevamente
   - Deberías recibir un token JWT y ser redirigido al dashboard

### Probar con cURL

```bash
# 1. Obtener token de Google (manualmente desde el frontend)
# Copiar el token recibido en la consola del navegador

# 2. Enviar al backend
curl -X POST http://localhost:8000/api/v1/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{"google_token": "YOUR_GOOGLE_TOKEN"}'

# 3. Ver usuarios pendientes
curl -X GET http://localhost:8000/api/v1/auth/pending-users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 4. Aprobar usuario
curl -X POST http://localhost:8000/api/v1/auth/approve-user/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"approved": true}'
```

## Seguridad

### Consideraciones de Seguridad

1. **Verificación de Token**: Los tokens de Google se verifican en el servidor usando `google.auth.transport.requests`
2. **Rate Limiting**: El endpoint de login tiene rate limiting de 5 intentos/minuto por IP
3. **Contraseñas**: Los usuarios de Google OAuth no tienen contraseñas
4. **Aprobación**: Requiere autenticación y rol de admin
5. **HTTPS**: En producción, siempre usa HTTPS para comunicaciones con Google

### Variables Sensibles

Asegúrate de:
- Nunca commitear el `.env` a git
- Usar variables de entorno en producción
- Proteger el `GOOGLE_CLIENT_SECRET` (solo backend)
- El `GOOGLE_CLIENT_ID` puede estar en el frontend (es público)

## Solución de Problemas

### Error: "Token de Google inválido"

**Causa**: El token no es válido o está expirado

**Solución**:
- Asegúrate de que `GOOGLE_CLIENT_ID` en el backend es correcto
- Los tokens de Google expiran después de 1 hora
- Verifica que estés usando el ID token, no el access token

### Error: "Usuario no aprobado"

**Causa**: El usuario fue registrado pero aún no aprobado

**Solución**:
- Como admin, ve a "Administración" → "Aprobaciones"
- Busca al usuario en la lista
- Haz clic en "Aprobar"

### Google Sign-In no funciona en el frontend

**Causa**: `VITE_GOOGLE_CLIENT_ID` no está configurado

**Solución**:
- Crea `.env` en la carpeta frontend
- Agrega: `VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID`
- Reinicia el servidor de desarrollo

### Migración no funciona

**Causa**: Cambios en el modelo no coinciden con la base de datos

**Solución**:
```bash
# Ver estado actual
python -m alembic current

# Revertir última migración (si es necesario)
python -m alembic downgrade -1

# Aplicar migraciones nuevamente
python -m alembic upgrade head
```

## Referencias

- [Google Identity Services](https://developers.google.com/identity)
- [Google Cloud Console](https://console.cloud.google.com/)
- [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

## Próximas Mejoras

- [ ] Notificaciones por email cuando un usuario es aprobado
- [ ] Página de confirmación cuando está pendiente de aprobación
- [ ] Opción de enviar mensaje personalizado al rechazar un usuario
- [ ] Auditoría de aprobaciones/rechazos
- [ ] Integración con otros OAuth providers (GitHub, Microsoft, etc.)
