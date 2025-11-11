# 🚀 Guía de Despliegue Completa - Sistema de Gestión de Hostal

Sistema completo de gestión de hostal con backend FastAPI y frontend React + TypeScript.

## 📋 Requisitos Previos

### Backend
- Python 3.11+
- PostgreSQL 14+ o SQLite
- pip / virtualenv

### Frontend
- Node.js 18+
- npm / yarn / pnpm

## 🛠 Instalación y Configuración

### 1. Backend Setup

```bash
# Navegar al directorio backend
cd backend

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus configuraciones
nano .env
```

#### Configuración del .env

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/hostal_db
# O para desarrollo con SQLite:
# DATABASE_URL=sqlite:///./hostal.db

# Seguridad
SECRET_KEY=your-super-secret-key-change-this-in-production
APP_ENV=dev

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Ejecutar Migraciones

```bash
# Crear/actualizar base de datos
alembic upgrade head

# Verificar migraciones
alembic current
alembic history
```

#### Crear Usuario Inicial

```bash
# Iniciar Python REPL
python

>>> from app.core.db import SessionLocal
>>> from app.models.user import User
>>> from app.core.security import get_password_hash
>>> 
>>> db = SessionLocal()
>>> admin = User(
...     email="admin@hostal.com",
...     hashed_password=get_password_hash("admin123"),
...     role="admin"
... )
>>> db.add(admin)
>>> db.commit()
>>> exit()
```

#### Iniciar Backend

```bash
# Desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

El backend estará disponible en:
- API: http://localhost:8000
- Documentación: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

### 2. Frontend Setup

```bash
# Navegar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env

# Editar .env
nano .env
```

#### Configuración del .env

```env
VITE_API_BASE_URL=http://localhost:8000
```

#### Iniciar Frontend

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

El frontend estará disponible en: http://localhost:3000

## 🔐 Credenciales Iniciales

```
Email: admin@hostal.com
Contraseña: admin123
```

**⚠️ IMPORTANTE:** Cambiar estas credenciales en producción.

## 📊 Estructura de la Base de Datos

### Tablas Principales

1. **users** - Usuarios del sistema
2. **guests** - Huéspedes
3. **rooms** - Habitaciones
4. **room_rates** - Tarifas de habitaciones
5. **reservations** - Reservas
6. **staff** - Personal del hostal
7. **occupancies** - Check-in/Check-out
8. **maintenances** - Tareas de mantenimiento
9. **devices** - Dispositivos de huéspedes
10. **network_activities** - Logs de actividad de red
11. **payments** - Pagos multimoneda
12. **exchange_rates** - Tasas de cambio
13. **media** - Archivos multimedia

## 🌐 Endpoints Principales del API

### Autenticación
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Usuario actual

### Staff
- `GET /api/v1/staff` - Listar personal
- `POST /api/v1/staff` - Crear empleado
- `GET /api/v1/staff/{id}` - Obtener empleado
- `PATCH /api/v1/staff/{id}` - Actualizar empleado
- `GET /api/v1/staff/stats/summary` - Estadísticas

### Occupancy
- `POST /api/v1/occupancy/check-in` - Registrar check-in
- `POST /api/v1/occupancy/{id}/check-out` - Registrar check-out
- `GET /api/v1/occupancy` - Listar ocupaciones
- `GET /api/v1/occupancy/active` - Ocupaciones activas
- `GET /api/v1/occupancy/stats/summary` - Estadísticas

### Maintenance
- `GET /api/v1/maintenance` - Listar mantenimientos
- `POST /api/v1/maintenance` - Crear tarea
- `POST /api/v1/maintenance/{id}/start` - Iniciar tarea
- `POST /api/v1/maintenance/{id}/complete` - Completar tarea
- `GET /api/v1/maintenance/stats/summary` - Estadísticas

### Rooms, Guests, Reservations
- Similar CRUD para cada módulo

## 🚀 Despliegue en Producción

### Backend (con Docker)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build y Run
docker build -t hostal-backend .
docker run -p 8000:8000 --env-file .env hostal-backend
```

### Frontend (con Docker)

```dockerfile
# Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build y Run
docker build -t hostal-frontend .
docker run -p 3000:80 hostal-frontend
```

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: hostal_db
      POSTGRES_USER: hostal
      POSTGRES_PASSWORD: hostal123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://hostal:hostal123@db:5432/hostal_db
      SECRET_KEY: ${SECRET_KEY}
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    ports:
      - "3000:80"

volumes:
  postgres_data:
```

```bash
# Iniciar todo el stack
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## 🔧 Troubleshooting

### Backend no inicia

```bash
# Verificar dependencias
pip list

# Verificar base de datos
psql -U hostal -d hostal_db -c "SELECT 1"

# Verificar logs
tail -f logs/app.log
```

### Frontend no conecta al backend

1. Verificar CORS en backend (.env)
2. Verificar VITE_API_BASE_URL en frontend
3. Verificar que backend esté corriendo
4. Revisar consola del navegador

### Errores de migración

```bash
# Rollback a versión anterior
alembic downgrade -1

# Aplicar de nuevo
alembic upgrade head

# Ver estado
alembic current
```

## 📈 Monitoreo y Logs

### Backend Logs

Los logs se guardan en `backend/logs/` con rotación diaria.

```bash
# Ver logs en tiempo real
tail -f backend/logs/app.log

# Buscar errores
grep ERROR backend/logs/app.log
```

### Health Checks

```bash
# Backend health
curl http://localhost:8000/api/v1/health

# Respuesta esperada:
{
  "status": "healthy",
  "database": "connected",
  "db_latency_ms": 5.2
}
```

## 🛡 Seguridad

### Checklist de Producción

- [ ] Cambiar SECRET_KEY a valor aleatorio fuerte
- [ ] Cambiar credenciales de admin
- [ ] Configurar CORS correctamente
- [ ] Usar HTTPS (certificado SSL)
- [ ] Configurar firewall
- [ ] Habilitar rate limiting
- [ ] Configurar backups de base de datos
- [ ] Revisar logs regularmente
- [ ] Actualizar dependencias

### Generar SECRET_KEY

```python
import secrets
print(secrets.token_urlsafe(32))
```

## 📚 Recursos Adicionales

- **Backend Docs**: http://localhost:8000/docs
- **Backend README**: backend/README.md
- **Frontend README**: frontend/README.md
- **API Schemas**: Disponibles en /docs

## 🤝 Soporte

Para problemas o preguntas:
1. Revisar logs del backend y frontend
2. Verificar configuración de .env
3. Consultar documentación técnica
4. Revisar issues en el repositorio

---

Sistema desarrollado con FastAPI + React + TypeScript
