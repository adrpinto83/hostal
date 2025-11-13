# Inicio Rápido - Google OAuth y Aprobación de Usuarios

## 1. Obtener Credenciales de Google (5 minutos)

### Paso 1: Ir a Google Cloud Console
1. Ve a https://console.cloud.google.com/
2. Si no tienes una cuenta de Google, crea una
3. Si no tienes un proyecto, crea uno nuevo:
   - Haz clic en "Crear Proyecto"
   - Nombre: "Hostal Starlight"
   - Haz clic en "Crear"

### Paso 2: Habilitar Google+ API
1. En el menú izquierdo, ve a "APIs y servicios" → "Biblioteca"
2. Busca "Google+ API"
3. Haz clic en "Google+ API"
4. Haz clic en el botón "Habilitar"

### Paso 3: Crear Credenciales OAuth
1. Ve a "APIs y servicios" → "Credenciales"
2. Haz clic en "Crear credenciales" → "ID de cliente de OAuth"
3. Si te pide crear pantalla de consentimiento:
   - Selecciona "Externo"
   - Llena los campos requeridos
   - En "Alcances", busca "email", "profile", "openid"
   - Completa el formulario
4. De vuelta en "Crear ID de cliente":
   - Tipo: "Aplicación web"
   - Nombre: "Hostal Frontend"
   - En "URI autorizados de JavaScript":
     - Agrega: `http://localhost:3000`
     - Agrega: `http://localhost:5173`
   - En "URI de redirección autorizados":
     - Agrega: `http://localhost:8000/auth/callback` (para futuro)
   - Haz clic en "Crear"

### Paso 4: Copiar Credenciales
En la pantalla que aparece:
- Copia el **"ID de cliente"** (es el `GOOGLE_CLIENT_ID`)
- Copia el **"Contraseña de cliente"** (es el `GOOGLE_CLIENT_SECRET`)

## 2. Configurar Backend (2 minutos)

### Actualizar el archivo .env

Abre `/home/adrpinto/hostal/backend/.env` y actualiza:

```env
GOOGLE_CLIENT_ID=PEGA_TU_ID_AQUI
GOOGLE_CLIENT_SECRET=PEGA_TU_SECRET_AQUI
```

Ejemplo:
```env
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_key_here
```

## 3. Configurar Frontend (1 minuto)

### Crear archivo .env.local

Crea un archivo en `/home/adrpinto/hostal/frontend/.env.local`:

```env
VITE_GOOGLE_CLIENT_ID=PEGA_TU_ID_AQUI
```

Debe ser el **MISMO ID** que usaste en el backend.

## 4. Instalar Dependencias (esperar 2-3 minutos)

### Backend
```bash
cd /home/adrpinto/hostal/backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend
```bash
cd /home/adrpinto/hostal/frontend
npm install
```

## 5. Migrar Base de Datos (1 minuto)

```bash
cd /home/adrpinto/hostal/backend
python -m alembic upgrade head
```

## 6. Iniciar Servidores

### Terminal 1 - Backend
```bash
cd /home/adrpinto/hostal/backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2 - Frontend
```bash
cd /home/adrpinto/hostal/frontend
npm run dev
```

### Terminal 3 - Base de Datos (si es necesario)
```bash
# PostgreSQL debe estar ejecutándose
# Si usas Docker:
docker run --name postgres -e POSTGRES_PASSWORD=hostal_pass \
  -e POSTGRES_DB=hostal_db -p 5432:5432 -d postgres
```

## 7. Probar la Funcionalidad

### Acceder a la aplicación
1. Abre http://localhost:5173/login en tu navegador

### Probar Login con Google
1. Haz clic en "Continúa con Google"
2. Completa el login con tu cuenta de Google
3. Deberías ver el mensaje: "Tu cuenta ha sido registrada. Espera a que el administrador te apruebe."

### Aprobar Usuario (Como Admin)
1. Abre una pestaña incógnita/privada
2. Ve a http://localhost:5173/login
3. Loguea con las credenciales admin:
   - Email: `admin@example.com`
   - Contraseña: `string`
4. Ve a "Administración" → "Aprobaciones" en la barra lateral izquierda
5. Deberías ver al usuario que se registró con Google
6. Haz clic en "Aprobar"

### Loguear como Usuario Aprobado
1. Vuelve a la pestaña normal (no incógnita)
2. Actualiza la página
3. Haz clic en "Continúa con Google" nuevamente
4. Esta vez deberías loguear exitosamente y ser redirigido al dashboard

## 8. Verificar que Todo Funciona

- ✅ Página de login se carga sin errores de import
- ✅ Botón "Continúa con Google" visible
- ✅ Nuevo usuario puede registrarse con Google
- ✅ Admin ve al nuevo usuario en panel de aprobaciones
- ✅ Admin puede aprobar el usuario
- ✅ Usuario aprobado puede loguear y acceder a dashboard

## Solución de Problemas

### Error: "Failed to resolve import"
**Solución**: Asegúrate de haber ejecutado `npm install` en la carpeta frontend

### Error: "Google Client ID not configured"
**Solución**: Verifica que `VITE_GOOGLE_CLIENT_ID` está en `.env.local` en frontend

### Error: "Token de Google inválido"
**Solución**: Verifica que `GOOGLE_CLIENT_ID` en backend es correcto

### Migración no funciona
```bash
cd backend
python -m alembic current  # Ver estado actual
python -m alembic upgrade head  # Aplicar migraciones
```

### PostgreSQL no está corriendo
```bash
# Ver si está corriendo
pg_isready -h localhost -p 5432

# Si no está, iniciar:
sudo systemctl start postgresql
# o con Docker:
docker start postgres
```

## Comandos Útiles

```bash
# Limpiar node_modules si hay problemas
cd frontend
rm -rf node_modules package-lock.json
npm install

# Ver logs del backend
tail -f backend.log

# Resetear base de datos (cuidado!)
cd backend
python -m alembic downgrade base  # Reviertir todas las migraciones
python -m alembic upgrade head    # Aplicar todas nuevamente
```

## Próximos Pasos

1. Integra notificaciones por email cuando un usuario es aprobado
2. Agrega página de confirmación mientras espera aprobación
3. Implementa más OAuth providers (GitHub, Microsoft)
4. Configura entorno de producción con HTTPS

## Referencias

- Documentación completa: `GOOGLE_OAUTH_SETUP.md`
- Google Cloud Console: https://console.cloud.google.com/
- Documentación de FastAPI: https://fastapi.tiangolo.com/
- Documentación de React OAuth: https://www.npmjs.com/package/@react-oauth/google
