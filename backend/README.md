# Backend - Sistema de Gestión de Hostal

API REST construida con FastAPI para gestión completa de hostales.

## 🚀 Tecnologías

- **FastAPI 0.104+** - Framework web
- **SQLAlchemy 2.0** - ORM
- **Alembic** - Migraciones
- **Pydantic v2** - Validación
- **JWT** - Autenticación
- **Structlog** - Logging
- **Prometheus** - Métricas

## 📦 Instalación

```bash
# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar migraciones
alembic upgrade head

# Iniciar servidor
uvicorn app.main:app --reload
```

## ⚙️ Configuración

### Variables de Entorno Requeridas

```bash
# .env
APP_ENV=dev
DEBUG=true
DATABASE_URL=sqlite:///./hostal.db
SECRET_KEY=tu-clave-secreta-cambiar
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Variables Opcionales

```bash
# Tasas de cambio
EXCHANGE_RATE_API_KEY=tu-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-password
```

## 🗂️ Estructura

```
backend/
├── app/
│   ├── core/              # Configuración central
│   │   ├── config.py      # Settings
│   │   ├── security.py    # JWT, auth
│   │   ├── db.py          # Database session
│   │   └── audit.py       # Audit logging
│   ├── models/            # SQLAlchemy models (25+)
│   ├── routers/           # API endpoints (21 routers)
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic
│   │   ├── payment_gateway.py
│   │   ├── payment_validators.py
│   │   └── exchange_rate.py
│   └── main.py            # FastAPI app
├── alembic/               # Database migrations
├── tests/                 # Unit tests
└── uploads/               # Uploaded files
```

## 📚 API Endpoints

### 21 Routers / 150+ Endpoints

1. **auth** - Autenticación y registro
2. **users** - Gestión de usuarios
3. **guests** - Gestión de huéspedes
4. **rooms** - Gestión de habitaciones
5. **reservations** - Reservas
6. **room_rates** - Tarifas por habitación
7. **payments** - Pagos (legacy)
8. **payments_v2** - Pagos avanzados + Pago Móvil
9. **invoices** - Facturación SENIAT
10. **staff** - Personal
11. **occupancy** - Check-in/Check-out
12. **maintenance** - Mantenimiento
13. **devices** - Dispositivos de red
14. **internet_control** - Control de internet
15. **network_devices** - Routers/Switches
16. **exchange_rates** - Tasas de cambio
17. **media** - Upload de archivos
18. **audit** - Logs de auditoría
19. **backup** - Backups
20. **webhooks** - Webhooks externos
21. **health** - Health checks

Ver documentación completa: http://localhost:8000/docs

## 🧪 Testing

```bash
# Ejecutar todos los tests
pytest

# Con cobertura
pytest --cov=app --cov-report=html

# Tests específicos
pytest tests/test_auth.py -v

# Ver reporte HTML
open htmlcov/index.html
```

## 🗄️ Base de Datos

### Migraciones

```bash
# Crear migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Ver historial
alembic history
```

### Modelos Principales

- **User** - Usuarios del sistema
- **Guest** - Huéspedes
- **Room** - Habitaciones
- **Reservation** - Reservas
- **Payment** - Pagos
- **Invoice** - Facturas
- **Staff** - Personal
- **Occupancy** - Check-in/out
- **Maintenance** - Mantenimiento
- **Device** - Dispositivos de red

## 🔐 Seguridad

### Autenticación

- JWT tokens con expiración configurable
- Rate limiting en endpoints sensibles
- CORS configurado por entorno
- Passwords hasheados con bcrypt

### Roles

- **admin** - Acceso total
- **gerente** - Gestión operativa
- **recepcionista** - Operaciones diarias
- **mantenimiento** - Tareas de mantenimiento
- **staff** - Acceso limitado

## 📊 Monitoreo

### Métricas Prometheus

Disponibles en: http://localhost:8000/metrics

```
# Métricas disponibles
- http_requests_total
- http_request_duration_seconds
- active_sessions
- database_connections
```

### Health Checks

- **Liveness**: `GET /api/v1/healthz`
- **Readiness**: `GET /api/v1/readyz` (verifica DB)

## 🔧 Servicios

### PaymentGatewayService

Maneja procesamiento de pagos:
- Pago móvil venezolano
- Validaciones bancarias
- Conversión de monedas

### ExchangeRateService

- Actualización automática de tasas
- Cache de tasas
- Conversión multi-moneda

### BackupService

- Backups programados
- Backup manual
- Restauración

## 🚀 Despliegue

### Producción

```bash
# Usar Gunicorn con workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# O con Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
```

## 📝 Logging

Logs estructurados con Structlog:

```python
import structlog
log = structlog.get_logger()

log.info("payment_created",
    payment_id=payment.id,
    amount=payment.amount,
    currency=payment.currency
)
```

## 🐛 Debug

```bash
# Activar debug mode
export DEBUG=true

# Ver queries SQL
export SQLALCHEMY_ECHO=true

# Logs detallados
export LOG_LEVEL=DEBUG
```

## 📞 Soporte

Ver [README principal](../README.md) para más información.

---

**Desarrollado por JADS Software - Venezuela**
**Ing. Adrian Pinto** | WhatsApp: [+58 412-4797466](https://wa.me/584124797466)

*© 2025 JADS Software. Todos los derechos reservados.*
