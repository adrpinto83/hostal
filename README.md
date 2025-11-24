# 🏨 Sistema de Gestión de Hostal

Sistema completo de gestión para hostales con autenticación, reservas, pagos multimoneda, facturación venezolana, control de internet y más.

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-React+TypeScript-61DAFB?style=flat-square)
![Stack](https://img.shields.io/badge/Database-SQLite/PostgreSQL-336791?style=flat-square)
![Stack](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Stack](https://img.shields.io/badge/Made_in-Venezuela_🇻🇪-FFD700?style=flat-square)
![Stack](https://img.shields.io/badge/Version-1.0.0-green?style=flat-square)

**Desarrollado por:** [JADS Software](https://wa.me/584124797466) - Venezuela
**Autor:** Ing. Adrian Pinto | **Contacto:** [+58 412-4797466](https://wa.me/584124797466)

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación Rápida](#-instalación-rápida)
- [Configuración](#-configuración)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Despliegue](#-despliegue)
- [Contribuir](#-contribuir)

---

## ✨ Características

### 🔐 Autenticación y Usuarios
- Sistema de autenticación JWT
- Roles de usuario (admin, gerente, recepcionista, mantenimiento, staff)
- Aprobación de usuarios pendientes
- Recuperación de contraseña

### 🏠 Gestión de Habitaciones
- CRUD completo de habitaciones
- Estados: Disponible, Ocupada, Mantenimiento, Limpieza
- Tipos personalizables
- Tarifas dinámicas por habitación
- Estadísticas en tiempo real

### 👥 Gestión de Huéspedes
- Perfil completo de huéspedes
- Historial de reservas y pagos
- Gestión de dispositivos de red
- Fotografías y documentos

### 📅 Reservas
- Sistema de reservaciones con estados
- Confirmación y cancelación
- Integración con habitaciones y pagos
- Resumen de estado

### 💰 Sistema de Pagos Multimoneda
- **Monedas soportadas**: USD, EUR, VES (Bolívares)
- **Métodos de pago**:
  - Efectivo (con código de billete obligatorio para USD/EUR)
  - Pago Móvil Venezolano (con validación de teléfono, cédula, banco)
  - Transferencia bancaria
  - Tarjeta débito/crédito
  - Zelle
  - Criptomonedas
- Conversión automática de monedas
- Tasas de cambio actualizables
- 30 bancos venezolanos integrados
- Validación en tiempo real de datos bancarios

### 🧾 Facturación Venezolana
- Cumplimiento con normativas SENIAT
- Numeración automática de facturas
- Estados: Borrador, Emitida, Cancelada, Pagada
- Líneas de detalle con IVA
- Impresión y envío por email
- Control de números de factura

### 🛠️ Gestión de Mantenimiento
- Solicitudes de mantenimiento
- Estados: Pendiente, En Progreso, Completado
- Prioridades y tipos
- Asignación a personal
- Historial completo

### 👔 Gestión de Personal
- CRUD de empleados
- Roles y estados
- Asignación a tareas
- Estadísticas de personal

### 🌐 Control de Internet
- Gestión de dispositivos de red
- Suspensión/activación por dispositivo o huésped
- Monitoreo de ancho de banda
- Bloqueo por dirección MAC
- Actividad de red reciente
- Integración con routers (MikroTik/Ubiquiti)

### 📊 Dashboard y Reportes
- Métricas en tiempo real
- Estadísticas de ocupación
- Reportes de pagos por fecha
- Reportes por huésped
- Exportación a CSV

### 🔍 Auditoría
- Log completo de acciones
- Filtros por usuario y acción
- Trazabilidad de cambios

### 💾 Backup y Restauración
- Respaldos automáticos programados
- Backup manual on-demand
- Restauración desde archivo
- Estado de salud del sistema

---

## 🚀 Stack Tecnológico

### Backend
- **FastAPI 0.104+** - Framework web moderno y rápido
- **SQLAlchemy 2.0** - ORM con soporte async
- **Alembic** - Migraciones de base de datos
- **Pydantic v2** - Validación de datos y serialización
- **JWT** - Autenticación segura con tokens
- **SQLite/PostgreSQL** - Base de datos (SQLite por defecto, PostgreSQL en producción)
- **Structlog** - Logging estructurado
- **SlowAPI** - Rate limiting
- **Prometheus** - Métricas y observabilidad
- **APScheduler** - Tareas programadas (backups, exchange rates)

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Type safety
- **Vite 5** - Build tool ultrarrápido
- **React Router v6** - Navegación SPA
- **TanStack Query v5** - Estado del servidor y caching
- **Tailwind CSS** - Utility-first CSS
- **Zustand** - Estado global ligero
- **Axios** - Cliente HTTP
- **React Hook Form** - Formularios performantes
- **Sonner** - Notificaciones toast
- **Lucide React** - Iconos modernos

### DevOps
- **Docker & Docker Compose** - Containerización
- **Nginx** - Reverse proxy y servidor estático
- **Supervisor** - Gestión de procesos
- **GitHub Actions** - CI/CD (opcional)

---

## 📦 Instalación Rápida

### Prerrequisitos
- Python 3.12+
- Node.js 18+ y npm/yarn
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/hostal.git
cd hostal
```

### 2. Configuración Automática

```bash
# Da permisos de ejecución a los scripts
chmod +x setup.sh create_test_data.sh start_backend.sh start_frontend.sh

# Ejecutar setup completo (instala dependencias backend + frontend)
./setup.sh

# Crear datos de prueba (opcional)
./create_test_data.sh
```

### 3. Iniciar el Sistema

**Opción A: Dos terminales**

```bash
# Terminal 1 - Backend
./start_backend.sh

# Terminal 2 - Frontend
./start_frontend.sh
```

**Opción B: Docker Compose (Recomendado para producción)**

```bash
docker-compose up -d
```

### 4. Acceder a la Aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentación API**: http://localhost:8000/docs
- **Métricas**: http://localhost:8000/metrics

### 🔑 Credenciales por Defecto

```
Email: admin@hostal.com
Password: admin123
```

---

## ⚙️ Configuración

### Backend

Crear archivo `.env` en `/backend`:

```bash
# Entorno
APP_ENV=dev  # dev | prod
DEBUG=true

# Base de datos
DATABASE_URL=sqlite:///./hostal.db
# O para PostgreSQL en producción:
# DATABASE_URL=postgresql://user:password@localhost/hostal

# Seguridad
SECRET_KEY=tu-clave-secreta-muy-segura-cambiar-en-produccion
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (separados por comas)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Tasas de cambio (opcional)
EXCHANGE_RATE_API_KEY=tu-api-key-de-exchangerate-api

# Email (opcional - para envío de facturas)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
```

### Frontend

Crear archivo `.env` en `/frontend`:

```bash
# API URL
VITE_API_URL=http://localhost:8000

# Nombre de la aplicación (opcional)
VITE_APP_NAME=Sistema Hostal
```

---

## 📁 Estructura del Proyecto

```
hostal/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuración, seguridad, DB
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── routers/        # Endpoints de API (21 routers)
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── services/       # Lógica de negocio
│   │   └── main.py         # Aplicación FastAPI
│   ├── alembic/            # Migraciones
│   ├── tests/              # Tests unitarios
│   └── uploads/            # Archivos subidos
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas principales
│   │   ├── lib/            # Utilidades y API client
│   │   ├── hooks/          # Custom hooks
│   │   └── types/          # TypeScript types
│   └── public/
├── docs/                   # Documentación adicional
├── docker-compose.yml      # Configuración Docker
└── README.md
```

---

## 📚 API Documentation

### Endpoints Principales

El sistema cuenta con **150+ endpoints** organizados en 21 módulos:

#### Autenticación (`/api/v1/auth`)
- `POST /login` - Iniciar sesión
- `POST /register` - Registrar usuario
- `POST /password/forgot` - Recuperar contraseña
- `GET /me` - Usuario actual

#### Habitaciones (`/api/v1/rooms`)
- `GET /rooms/paginated` - Listar con paginación
- `POST /rooms/` - Crear habitación
- `GET /rooms/stats/summary` - Estadísticas

#### Pagos (`/api/v1/payments-v2`)
- `POST /mobile-venezuela` - Pago móvil venezolano
- `GET /mobile-venezuela/banks` - Lista de 30 bancos
- `POST /validate/phone` - Validar teléfono
- `POST /validate/cedula` - Validar cédula

#### Facturas (`/api/v1/invoices`)
- `POST /` - Crear factura
- `POST /{id}/issue` - Emitir factura
- `GET /{id}/printable` - Versión imprimible
- `POST /{id}/send-email` - Enviar por correo

#### Internet Control (`/api/v1/internet-control`)
- `POST /devices/{id}/suspend` - Suspender dispositivo
- `GET /bandwidth/summary` - Resumen de ancho de banda

**Ver documentación completa:** http://localhost:8000/docs (Swagger UI)

---

## 🧪 Testing

### Backend

```bash
cd backend
source venv/bin/activate

# Ejecutar todos los tests
pytest

# Con cobertura
pytest --cov=app --cov-report=html

# Tests específicos
pytest tests/test_auth.py -v
```

### Frontend

```bash
cd frontend

# Tests unitarios
npm test

# Tests E2E con Cypress (si configurado)
npm run test:e2e

# Linting
npm run lint
```

---

## 🚀 Despliegue

### Opción 1: Docker Compose (Recomendado)

```bash
# Construir y levantar servicios
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Opción 2: VPS Manual

Ver guía completa en: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Resumen:**
1. Configurar servidor (Ubuntu 22.04+)
2. Instalar dependencias (Python, Node, Nginx)
3. Configurar Nginx como reverse proxy
4. Usar Supervisor para gestión de procesos
5. Configurar SSL con Let's Encrypt

### Variables de Entorno en Producción

**Crítico:**
- Cambiar `SECRET_KEY` a valor aleatorio seguro
- Usar PostgreSQL en lugar de SQLite
- Configurar CORS específico (no usar `*`)
- Establecer `DEBUG=false`
- Configurar backup automático

---

## 🐛 Solución de Problemas

### Backend no inicia

```bash
# Verificar que el venv está activado
source venv/bin/activate

# Reinstalar dependencias
pip install -r requirements.txt

# Verificar migraciones
alembic current
alembic upgrade head
```

### Frontend no compila

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar versión de Node
node --version  # Debe ser 18+
```

### Errores de CORS

Verificar que `CORS_ORIGINS` en backend incluye la URL del frontend:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guía de Estilo

- **Backend**: Seguir PEP 8, usar type hints
- **Frontend**: ESLint + Prettier configurados
- Escribir tests para nuevas funcionalidades
- Documentar endpoints en docstrings

---

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo [LICENSE](LICENSE) para más detalles.

---

## 👥 Autor

**Ing. Adrian Pinto**
*JADS Software - Venezuela*

- 📧 Email: adrianpinto@jadssoftware.com
- 📱 WhatsApp: [+58 412-4797466](https://wa.me/584124797466)
- 🌐 Web: JADS Software
- 📍 Ubicación: Venezuela

---

## 🙏 Agradecimientos

- FastAPI por su excelente framework
- React Team por React 18
- Comunidad de código abierto de Venezuela
- Clientes y usuarios del sistema

---

## 📞 Soporte y Contacto

### Soporte Técnico
- 📱 WhatsApp: [+58 412-4797466](https://wa.me/584124797466)
- 📧 Email: soporte@jadssoftware.com
- 💬 Telegram: @jadssoftware

### Empresa
- 🏢 **JADS Software**
- 🇻🇪 Venezuela
- 🌐 Desarrollo de Software a Medida
- 💼 Soluciones Empresariales

---

## 🗺️ Roadmap

- [ ] Integración con sistemas de reservas online (Booking, Airbnb)
- [ ] App móvil (React Native)
- [ ] Sistema de puntos de fidelidad
- [ ] Multi-idioma (i18n)
- [ ] Dashboard analytics avanzado
- [ ] Integración con WhatsApp Business API
- [ ] Sistema de check-in automático con QR

---

## 📊 Estado del Proyecto

**Versión Actual:** 1.0.0
**Estado:** Producción ✅
**Última Actualización:** 24 de Noviembre 2025
**Desarrollado por:** JADS Software - Venezuela
**Autor:** Ing. Adrian Pinto

### Módulos Implementados

✅ Autenticación y usuarios
✅ Gestión de habitaciones
✅ Reservas
✅ Pagos multimoneda
✅ Pago móvil venezolano (30 bancos)
✅ Facturación SENIAT
✅ Control de internet
✅ Mantenimiento
✅ Personal/Staff
✅ Auditoría
✅ Backups automáticos
✅ Dashboard y reportes

### Eliminado

❌ Integración con Stripe (eliminada por preferencia de pago móvil local)

---

---

## 💼 Sobre JADS Software

**JADS Software** es una empresa venezolana especializada en desarrollo de software a medida, con enfoque en soluciones empresariales modernas y escalables.

### Servicios
- 🎯 Desarrollo de Software a Medida
- 🏢 Sistemas de Gestión Empresarial
- 🌐 Aplicaciones Web y Móviles
- ☁️ Soluciones en la Nube
- 🔧 Mantenimiento y Soporte
- 📊 Consultoría Tecnológica

### Tecnologías
- Python, FastAPI, Django
- React, TypeScript, Next.js
- PostgreSQL, MongoDB, SQLite
- Docker, AWS, DigitalOcean
- CI/CD, DevOps

### Contacto Comercial
- 📱 WhatsApp: [+58 412-4797466](https://wa.me/584124797466)
- 📧 Email: contacto@jadssoftware.com
- 🇻🇪 Venezuela

---

**⭐ Si este proyecto te fue útil, considera darle una estrella en GitHub!**

---

*Desarrollado con ❤️ en Venezuela por JADS Software*
*© 2025 JADS Software. Todos los derechos reservados.*
