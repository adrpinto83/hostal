# Sistema de Gestión de Hostal

Sistema completo de gestión para hostales con backend FastAPI y frontend React + TypeScript.

## 🚀 Stack Tecnológico

### Backend
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy 2.0** - ORM
- **Alembic** - Migraciones de base de datos
- **Pydantic** - Validación de datos
- **JWT** - Autenticación
- **PostgreSQL/SQLite** - Base de datos

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navegación
- **TanStack Query** - Estado del servidor
- **Tailwind CSS** - Estilos
- **Zustand** - Estado global

## 📦 Instalación Rápida

```bash
# Configuración automática completa
./setup.sh

# Crear datos de prueba
./create_test_data.sh

# Iniciar backend (terminal 1)
./start_backend.sh

# Iniciar frontend (terminal 2)
./start_frontend.sh
```

Acceder a: http://localhost:3000

## 🔑 Credenciales

```
Email: admin@hostal.com
Password: admin123
```

## 📚 Documentación

- [Inicio Rápido](QUICK_START.md)
- [Guía de Pruebas](README_TESTING.md)
- [Guía de Despliegue](DEPLOYMENT_GUIDE.md)
- [Inicio Local Paso a Paso](START_LOCAL.md)

## 🎯 Características

### Backend
- ✅ Autenticación JWT con roles
- ✅ Gestión de huéspedes
- ✅ Gestión de habitaciones
- ✅ Sistema de reservas
- ✅ Check-in/Check-out
- ✅ Gestión de personal
- ✅ Sistema de mantenimiento
- ✅ Control de internet para dispositivos
- ✅ Pagos multimoneda (EUR/USD/VES)
- ✅ Gestión de archivos multimedia
- ✅ Tasas de cambio con API externa
- ✅ Logs de auditoría

### Frontend
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de personal
- ✅ Gestión de ocupación
- ✅ Gestión de mantenimiento
- ✅ Interfaz responsive
- ✅ Type-safe con TypeScript

## 📊 Arquitectura

```
hostal2/
├── backend/              # API FastAPI
│   ├── app/
│   │   ├── models/      # 14 modelos de BD
│   │   ├── routers/     # 14 routers (70+ endpoints)
│   │   ├── core/        # Config, seguridad, DB
│   │   └── services/    # Lógica de negocio
│   ├── alembic/         # Migraciones
│   └── tests/           # Tests
├── frontend/            # React + TypeScript
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Páginas
│   │   ├── lib/         # API client, hooks
│   │   └── types/       # TypeScript types
│   └── public/
├── setup.sh             # Script de configuración
├── start_backend.sh     # Iniciar backend
├── start_frontend.sh    # Iniciar frontend
└── create_test_data.sh  # Crear datos de prueba
```

## 🌐 Endpoints Principales

- `POST /api/v1/auth/login` - Login
- `GET /api/v1/staff` - Listar personal
- `POST /api/v1/occupancy/check-in` - Check-in
- `POST /api/v1/occupancy/{id}/check-out` - Check-out
- `GET /api/v1/maintenance` - Listar mantenimientos
- `GET /api/v1/rooms/stats/summary` - Estadísticas

Documentación completa: http://localhost:8000/docs

## 📝 Licencia

Copyright © 2024
