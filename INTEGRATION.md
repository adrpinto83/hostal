# Integración Backend-Frontend - Sistema de Gestión de Hostal

## Resumen de Cambios

Este documento detalla las correcciones y mejoras realizadas para integrar correctamente el backend (FastAPI) con el frontend (React + TypeScript + Vite).

---

## 🔧 Correcciones Implementadas

### 1. ✅ Endpoint GET /auth/me (CRÍTICO)

**Problema**: El frontend llamaba a `/auth/me` pero el backend no tenía implementado este endpoint, causando que el login fallara.

**Solución**: Implementado endpoint en `backend/app/routers/auth.py`

```python
@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Obtiene los datos del usuario autenticado actualmente.
    Requiere un token JWT válido en el header Authorization.
    """
    return current_user
```

**Archivos modificados**:
- `backend/app/routers/auth.py:61-67` - Nuevo endpoint
- `backend/app/routers/auth.py:12` - Import de `get_current_user`
- `backend/app/routers/auth.py:15` - Import de `UserOut`

---

### 2. ✅ Configuración CORS Mejorada

**Problema**: CORS permitía todos los métodos y headers con `*`, lo cual es inseguro.

**Solución**: Configuración específica de métodos y headers permitidos en `backend/app/main.py`

**Antes**:
```python
allow_methods=["*"],
allow_headers=["*"],
```

**Después**:
```python
allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
allow_headers=["Content-Type", "Authorization", "Accept"],
```

**Archivo modificado**:
- `backend/app/main.py:64-65` - Configuración CORS específica

---

### 3. ✅ Script de Inicio en Desarrollo

**Nuevo archivo**: `start-dev.sh`

Script que automatiza el inicio del proyecto completo:
- ✅ Verifica dependencias de Python y npm
- ✅ Crea entorno virtual si no existe
- ✅ Verifica conexión a PostgreSQL
- ✅ Inicia backend en puerto 8000
- ✅ Inicia frontend en puerto 3000
- ✅ Manejo graceful de cierre con Ctrl+C
- ✅ Genera logs en `backend.log` y `frontend.log`

**Uso**:
```bash
./start-dev.sh
```

---

## ✅ Verificaciones Realizadas

### Autenticación
- ✅ JWT con expiración automática (validado en `security.py`)
- ✅ Persistencia de sesión con Zustand + localStorage
- ✅ Interceptor axios agrega token automáticamente
- ✅ Redirección a login en 401

### Protección de Rutas
- ✅ Layout verifica token antes de renderizar
- ✅ Redirección automática a `/login` si no autenticado
- ✅ Logout funcional en Header

### Configuración de Red
- ✅ Backend en `http://localhost:8000`
- ✅ Frontend en `http://localhost:3000`
- ✅ CORS configurado para ambos puertos
- ✅ Variables de entorno correctamente configuradas

---

## 📋 Configuración de Variables de Entorno

### Backend (.env)
```bash
APP_ENV=dev
DEBUG=True
SECRET_KEY=change-me-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

CORS_ORIGINS=http://localhost:3000,http://localhost:5173

POSTGRES_USER=hostal
POSTGRES_PASSWORD=hostal_pass
POSTGRES_DB=hostal_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🔄 Flujo de Autenticación

```
1. Usuario ingresa credenciales en /login
2. POST /auth/login → Backend valida y retorna JWT
3. Frontend guarda token en localStorage
4. GET /auth/me → Backend retorna datos del usuario
5. Frontend guarda usuario en Zustand (persistido)
6. Redirección a /dashboard
7. Todas las requests incluyen token en header Authorization
8. Backend valida token en cada request protegida
```

---

## 📊 Endpoints API

**Base URL**: `http://localhost:8000/api/v1`

### Autenticación
- `POST /auth/login` - Login con email/password
- `GET /auth/me` - Obtener usuario actual (requiere token)

### Estadísticas (Dashboard)
- `GET /rooms/stats/summary` - Resumen de habitaciones
- `GET /occupancy/stats/summary` - Resumen de ocupaciones
- `GET /maintenance/stats/summary` - Resumen de mantenimiento
- `GET /staff/stats/summary` - Resumen de personal

---

## 🧪 Testing de Integración

### Verificar Backend
```bash
# En una terminal
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Verificar API docs
curl http://localhost:8000/docs
```

### Verificar Frontend
```bash
# En otra terminal
cd frontend
npm run dev

# Abrir navegador
open http://localhost:3000
```

### Test de Login
1. Ir a `http://localhost:3000/login`
2. Ingresar credenciales de usuario existente
3. Verificar redirección a dashboard
4. Verificar que se cargan las estadísticas
5. Verificar logout

---

## 🏗️ Estructura del Proyecto

```
hostal/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── auth.py          ← Modificado: +endpoint /me
│   │   │   ├── rooms.py
│   │   │   ├── occupancy.py
│   │   │   └── ...
│   │   ├── core/
│   │   │   ├── security.py      ← get_current_user
│   │   │   ├── config.py        ← Configuración CORS
│   │   │   └── ...
│   │   └── main.py              ← Modificado: CORS específico
│   ├── .env
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── client.ts    ← Axios + interceptores
│   │   │   │   └── auth.ts      ← getCurrentUser()
│   │   │   └── hooks/
│   │   │       └── useAuth.ts   ← Zustand + persist
│   │   ├── pages/
│   │   │   ├── auth/Login.tsx
│   │   │   └── dashboard/Dashboard.tsx
│   │   └── components/
│   │       └── layout/
│   │           ├── Layout.tsx   ← Protección de rutas
│   │           └── Header.tsx   ← Logout
│   ├── .env
│   └── package.json
│
├── start-dev.sh                  ← Nuevo: Script de inicio
└── INTEGRATION.md                ← Este archivo
```

---

## 🚀 Próximos Pasos Sugeridos

### Prioridad Alta
- [ ] Crear usuario administrador inicial (seed)
- [ ] Implementar refresh token mechanism
- [ ] Agregar validación de roles en rutas específicas
- [ ] Implementar páginas de Guests y Rooms

### Prioridad Media
- [ ] Agregar error boundaries en React
- [ ] Implementar caché para estadísticas
- [ ] Mejorar loading states globales
- [ ] Agregar tests de integración

### Prioridad Baja
- [ ] Documentación de API con ejemplos
- [ ] Docker Compose para desarrollo
- [ ] CI/CD pipeline
- [ ] Monitoreo y alertas

---

## 🐛 Debugging

### Backend no inicia
```bash
# Verificar logs
tail -f backend.log

# Verificar PostgreSQL
pg_isready -h localhost -p 5432

# Verificar puerto
lsof -i :8000
```

### Frontend no inicia
```bash
# Verificar logs
tail -f frontend.log

# Limpiar cache
cd frontend
rm -rf node_modules package-lock.json
npm install

# Verificar puerto
lsof -i :3000
```

### Errores de CORS
```bash
# Verificar configuración en backend
grep CORS backend/.env

# Verificar que frontend usa el puerto correcto
grep VITE_API frontend/.env
```

---

## 📝 Notas Importantes

1. **Seguridad**: Cambiar `SECRET_KEY` en producción
2. **Base de Datos**: Ejecutar migraciones antes del primer uso
3. **Tokens**: Los JWT expiran en 120 minutos (configurable)
4. **CORS**: Ajustar origins para producción
5. **Logs**: Revisar `backend.log` y `frontend.log` para debugging

---

## ✅ Estado de la Integración

| Componente | Estado | Notas |
|------------|--------|-------|
| Autenticación | ✅ Completo | Login, logout, persistencia |
| Protección de rutas | ✅ Completo | Layout verifica token |
| CORS | ✅ Configurado | Específico para dev |
| API Client | ✅ Completo | Axios con interceptores |
| Dashboard | ✅ Funcional | 4 KPIs estadísticos |
| Staff | ✅ Funcional | CRUD completo |
| Occupancy | ✅ Funcional | Check-in/check-out |
| Maintenance | ✅ Funcional | Gestión de mantenimiento |
| Guests | ⚠️ Placeholder | Por implementar |
| Rooms | ⚠️ Placeholder | Por implementar |

---

**Última actualización**: 2025-11-10
**Autor**: Claude Code
