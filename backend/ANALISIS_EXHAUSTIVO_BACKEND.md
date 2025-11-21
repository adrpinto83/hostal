# ANÁLISIS EXHAUSTIVO DEL BACKEND - SISTEMA DE GESTIÓN DE HOSTAL

## INFORMACIÓN GENERAL
- **Total de archivos Python**: 56
- **Total de líneas de código**: 4,498 líneas
- **Framework**: FastAPI 0.115.0
- **ORM**: SQLAlchemy 2.0.35
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT (PyJWT 2.9.0)
- **Hashing de contraseñas**: bcrypt (passlib)
- **Logging**: structlog (logs estructurados)
- **Rate Limiting**: slowapi

---

# 1. MODELOS DE BASE DE DATOS - ANÁLISIS DETALLADO

## 1.1 MODELOS PRINCIPALES

### User (app/models/user.py)
**Estado**: ✅ BÁSICO PERO FUNCIONAL
```python
Campos:
- id: PK (Primary Key)
- email: VARCHAR(255), UNIQUE, INDEXED
- hashed_password: VARCHAR(255)
- role: VARCHAR(50), default="user"
```

**Fortalezas**:
- Único para email
- Indexado para búsquedas rápidas
- Soporte para roles

**Debilidades Identificadas**:
- ❌ Sin campo `created_at` para auditoría de cuándo se creó la cuenta
- ❌ Sin campo `updated_at` para auditoría de cambios
- ❌ Sin campo `last_login` para análisis de actividad
- ❌ Sin campo `is_active` para suspender usuarios sin eliminarlos
- ❌ Sin campo `failed_login_attempts` para protección contra fuerza bruta
- ❌ Sin relaciones explícitas a audit logs

**Mejoras Recomendadas**:
```python
from datetime import datetime
from sqlalchemy import Boolean, DateTime

class User(Base):
    # ... campos existentes ...
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
```

**Impacto de Severidad**: MEDIA

---

### Guest (app/models/guest.py)
**Estado**: ✅ BIEN DISEÑADO

```python
Campos:
- id: PK
- full_name: VARCHAR(255), INDEXED
- document_id: VARCHAR(100), INDEXED (identificación única)
- phone: VARCHAR(50)
- email: VARCHAR(255)
- notes: VARCHAR(500)
- devices: Relación one-to-many con cascade delete
```

**Fortalezas**:
- Índices en campos de búsqueda frecuente
- Relación bidireccional con Device
- Cascade delete configurable

**Debilidades Identificadas**:
- ❌ Sin constraint UNIQUE en email (permite duplicados)
- ❌ Sin validación de formato de documento_id (varía por país)
- ❌ Sin campo `country_code` para dispositivos internacionales
- ❌ Sin campo `date_of_birth` para datos demográficos
- ❌ Sin field `created_at`, `updated_at` para auditoría

**Mejoras Recomendadas**:
- Agregar UNIQUE constraint en email
- Agregar campos de auditoría (created_at, updated_at)
- Agregar country_code para gestión internacional
- Considerar normalización de números telefónicos

**Impacto de Severidad**: BAJA-MEDIA

---

### Room (app/models/room.py)
**Estado**: ✅ MUY BIEN DISEÑADO - EXCELENTE

```python
Enums:
- RoomType: single, double, suite
- RoomStatus: available, occupied, cleaning, maintenance, out_of_service

Campos:
- id: PK
- number: VARCHAR(20), UNIQUE, INDEXED
- type: SAEnum RoomType
- status: SAEnum RoomStatus, default=available
- notes: TEXT

Relaciones:
- rates: one-to-many RoomRate (selectin lazy loading)
- reservations: one-to-many Reservation (selectin lazy loading)
- occupancies: one-to-many Occupancy
- maintenances: one-to-many Maintenance
```

**Fortalezas**:
- Enum bien definidos para room type y status
- Unique constraint en número de habitación
- Índices adecuados
- Lazy loading selectin en relaciones críticas (optimiza N+1 queries)
- Cascade delete bien configurado

**Debilidades Identificadas**:
- ❌ Sin campo `capacity` (cuántas personas caben)
- ❌ Sin campo `amenities` (servicios especiales: WiFi, AC, etc.)
- ❌ Sin campo `floor_number` para organización física
- ❌ Sin campo `price_per_night_base` (tarifa base sin período)
- ❌ Sin índice compuesto en (type, status) para búsquedas frecuentes

**Mejoras Recomendadas**:
```python
capacity: Mapped[int] = mapped_column(Integer, default=1)
floor_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
amenities: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON o CSV
price_per_night_base: Mapped[float | None] = mapped_column(Float, nullable=True)

# Índice compuesto
__table_args__ = (
    UniqueConstraint("number", name="uq_rooms_number"),
    Index("ix_room_type_status", "type", "status"),
)
```

**Impacto de Severidad**: BAJA (funcional pero podría enriquecerse)

---

### Reservation (app/models/reservation.py)
**Estado**: ✅ BIEN DISEÑADO - BUENA LÓGICA DE FECHAS

```python
Enums:
- Period: day, week, fortnight, month
- ReservationStatus: pending, active, checked_out, cancelled

Campos:
- id: PK
- guest_id: FK guests
- room_id: FK rooms
- start_date: DATE
- end_date: DATE
- period: Enum Period
- periods_count: INTEGER
- price_bs: FLOAT
- status: Enum ReservationStatus
- notes: TEXT

Índices:
- ix_res_room_range (room_id, start_date, end_date) - CRÍTICO para evitar overlaps
```

**Fortalezas**:
- Índice compuesto en rango de fechas para detección de conflictos
- Enum bien definidos
- Relaciones simples a Guest y Room
- Soporte para múltiples períodos

**Debilidades Identificadas**:
- ❌ Sin validación de que `end_date > start_date` a nivel de BD
- ❌ Sin constraint CHECK en periods_count > 0
- ❌ Sin campo `created_at`, `updated_at` para auditoría
- ❌ Sin campo `created_by` (qué usuario creó la reserva)
- ❌ Sin campo `confirmation_code` (referencia única para el cliente)
- ❌ Sin field `cancellation_reason` para análisis de cancelaciones
- ❌ Sin field `actual_price_paid` (puede diferir del precio_bs si hay cambios)
- ❌ Relaciones Guest y Room sin eager loading especificado

**Mejoras Recomendadas**:
```python
from datetime import datetime

confirmation_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
actual_price_paid: Mapped[float | None] = mapped_column(Float, nullable=True)

# Constraints
__table_args__ = (
    UniqueConstraint("confirmation_code"),
    Index("ix_res_room_range", "room_id", "start_date", "end_date"),
    CheckConstraint("end_date > start_date"),
    CheckConstraint("periods_count > 0"),
)
```

**Impacto de Severidad**: MEDIA

---

### Device (app/models/device.py)
**Estado**: ✅ EXCELENTE - MUY COMPLETO PARA CONTROL DE INTERNET

```python
Campos:
- id: PK
- guest_id: FK guests (CASCADE delete)
- mac: VARCHAR(17), UNIQUE, INDEXED - Identificador del dispositivo
- name: VARCHAR(100)
- vendor: VARCHAR(100)
- allowed: BOOLEAN, INDEXED - Whitelist flag
- suspended: BOOLEAN, INDEXED - Manual suspension
- suspension_reason: TEXT
- daily_quota_mb: BIGINT
- monthly_quota_mb: BIGINT
- first_seen: DATETIME
- last_seen: DATETIME - Para tracking online/offline
- last_ip: VARCHAR(45) - IPv4/IPv6
- total_bytes_downloaded: BIGINT
- total_bytes_uploaded: BIGINT

Properties:
- is_online: bool (basado en last_seen hace 5 mins)
- can_access_internet: bool (allowed AND NOT suspended)
- total_usage_mb: float
- total_usage_gb: float
```

**Fortalezas**:
- Excelente tracking de actividad de red
- MAC único para cada dispositivo
- Cuotas configurables por dispositivo
- Properties computed para abstracción
- Índices en campos críticos
- Timestamps para auditoría

**Debilidades Identificadas**:
- ❌ Sin campo `device_type` (smartphone, laptop, tablet, etc.)
- ❌ Sin campo `os_type` (Android, iOS, Windows, etc.)
- ❌ Sin campo `associated_at` para saber cuándo se registró
- ❌ Sin constraint que valide MAC format
- ❌ Sin campo `notes` para razones técnicas
- ❌ Sin tabla de histórico de IPs (solo guarda la última)
- ❌ Sin campo `device_category` para control granular

**Mejoras Recomendadas**:
```python
device_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # smartphone, laptop, tablet
os_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Android, iOS, Windows
associated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
notes: Mapped[str | None] = mapped_column(Text, nullable=True)

# Crear tabla separada para histórico de IPs
class DeviceIPHistory(Base):
    __tablename__ = "device_ip_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"))
    ip_address: Mapped[str] = mapped_column(String(45))
    seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
```

**Impacto de Severidad**: BAJA (funciona bien, mejoras serían nice-to-have)

---

### Payment (app/models/payment.py)
**Estado**: ✅ MUY BIEN DISEÑADO - SISTEMA MULTIMONEDA ROBUSTO

```python
Enums:
- Currency: EUR, USD, VES
- PaymentMethod: cash, card, transfer, mobile_payment, zelle, paypal, crypto, other
- PaymentStatus: pending, completed, failed, refunded, cancelled

Campos Principales:
- id: PK
- guest_id: FK guests, INDEXED
- reservation_id: FK reservations (NULLABLE)
- occupancy_id: FK occupancies (NULLABLE)
- amount: FLOAT (monto en moneda original)
- currency: Enum Currency, INDEXED
- amount_eur, amount_usd, amount_ves: FLOAT (conversiones precalculadas)
- exchange_rate_eur, exchange_rate_usd, exchange_rate_ves: FLOAT (tasas usadas)
- method: Enum PaymentMethod
- status: Enum PaymentStatus, default=pending
- reference_number: VARCHAR(100) (trans ref)
- notes: TEXT
- payment_date: DATETIME, INDEXED
- created_by: FK users (auditoría)
- created_at: DATETIME

Property:
- amount_in_currency(target_currency): float
```

**Fortalezas**:
- Excelente diseño multimoneda
- Precalcula conversiones en el momento del pago (importante para auditoría)
- Guarda las tasas usadas (trazabilidad)
- Soporta múltiples métodos de pago
- Auditoría completa (created_by, created_at)
- Referencia a usuario que registró
- Soporte para pagos parciales (permite NULL en reservation_id/occupancy_id)
- Indices en campos de búsqueda frecuente

**Debilidades Identificadas**:
- ❌ Sin constraint CHECK que valide que amount > 0
- ❌ Sin campo `due_date` para pagos con fecha de vencimiento
- ❌ Sin campo `payment_proof_media_id` (relación a archivos subidos)
- ❌ Sin campo `refund_reason` para pagos reembolsados
- ❌ Sin campo `processed_by` (quién procesó el pago, puede diferir de created_by)
- ❌ Sin tabla de transacciones de pago (para integración con pasarelas)
- ❌ Sin campo `external_transaction_id` (para APIs de pago)
- ❌ Sin índice en guest_id + payment_date para reportes rápidos

**Mejoras Recomendadas**:
```python
due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
refund_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
payment_proof_media_id: Mapped[int | None] = mapped_column(ForeignKey("media.id"), nullable=True)
processed_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
external_transaction_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)

__table_args__ = (
    CheckConstraint("amount > 0"),
    Index("ix_payment_guest_date", "guest_id", "payment_date"),
)
```

**Impacto de Severidad**: BAJA (sistema robusto, mejoras menores)

---

### Media (app/models/media.py)
**Estado**: ✅ BIEN DISEÑADO - FLEXIBLE

```python
Enums:
- MediaType: image, document, video, other
- MediaCategory: room_photo, guest_id, guest_photo, payment_proof, maintenance_photo, other

Campos:
- id: PK
- filename: VARCHAR(255) - nombre original
- stored_filename: VARCHAR(255), UNIQUE - nombre en storage
- file_path: VARCHAR(500) - path local o URL
- file_size: INTEGER - bytes
- mime_type: VARCHAR(100)
- media_type: Enum MediaType, INDEXED
- category: Enum MediaCategory, INDEXED
- guest_id: FK guests (CASCADE), INDEXED
- room_id: FK rooms (CASCADE), INDEXED
- maintenance_id: FK maintenances (CASCADE), INDEXED
- payment_id: FK payments (CASCADE), INDEXED
- title: VARCHAR(200)
- description: TEXT
- alt_text: VARCHAR(200)
- uploaded_by: FK users
- uploaded_at: DATETIME, INDEXED

Properties:
- file_size_mb: float
- is_image: bool
- is_document: bool
- url: str
```

**Fortalezas**:
- Flexible: puede asociarse a múltiples entidades
- Almacenamiento de paths (local o cloud)
- Metadatos completos (alt_text para accesibilidad)
- Auditoría (uploaded_by, uploaded_at)
- Indices en campos de búsqueda

**Debilidades Identificadas**:
- ❌ Sin validación de mime_type contra media_type
- ❌ Sin campo `width`, `height` para imágenes
- ❌ Sin campo `duration_seconds` para videos
- ❌ Sin campo `is_public` para compartir archivos
- ❌ Sin soft delete (archived_at) para documentos legales
- ❌ Sin tabla de versiones de archivos
- ❌ Sin constraint CHECK en file_size > 0
- ❌ Sin índice en stored_filename para búsquedas rápidas

**Mejoras Recomendadas**:
```python
width: Mapped[int | None] = mapped_column(Integer, nullable=True)
height: Mapped[int | None] = mapped_column(Integer, nullable=True)
duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
is_public: Mapped[bool] = mapped_column(Boolean, default=False)
archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
version: Mapped[int] = mapped_column(Integer, default=1)

__table_args__ = (
    CheckConstraint("file_size > 0"),
    Index("ix_stored_filename", "stored_filename"),
)
```

**Impacto de Severidad**: BAJA (funciona bien)

---

### NetworkActivity (app/models/network_activity.py)
**Estado**: ✅ EXCELENTE - TRACKING DETALLADO

```python
Enums:
- ActivityType: connected, disconnected, blocked, unblocked, quota_exceeded

Campos:
- id: PK
- device_id: FK devices (CASCADE), INDEXED
- guest_id: FK guests, INDEXED
- activity_type: Enum ActivityType, INDEXED
- timestamp: DATETIME, INDEXED - crítico para reportes
- ip_address: VARCHAR(45)
- bytes_downloaded: BIGINT
- bytes_uploaded: BIGINT
- session_duration_seconds: INTEGER
- initiated_by_system: BOOLEAN - automático vs manual
- notes: VARCHAR(500)

Properties:
- total_bytes: int
- total_mb: float
- total_gb: float
```

**Fortalezas**:
- Excelente para análisis de uso
- Timestamps indexados para reportes rápidos
- Seguimiento de sesiones
- Diferencia entre automático y manual

**Debilidades Identificadas**:
- ❌ Sin campo `reason_code` (para disconnects)
- ❌ Sin índice compuesto (device_id, timestamp) para análisis por dispositivo
- ❌ Sin retención de datos (datos históricos nunca se limpian)
- ❌ Sin particionamiento temporal recomendado para tabla grande
- ❌ Sin índice en guest_id + timestamp para reportes por huésped

**Mejoras Recomendadas**:
```python
reason_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

__table_args__ = (
    Index("ix_device_timestamp", "device_id", "timestamp"),
    Index("ix_guest_timestamp", "guest_id", "timestamp"),
    Index("ix_activity_type_timestamp", "activity_type", "timestamp"),
)

# Considerar particionamiento temporal (PostgreSQL specific)
# PARTITION BY RANGE (EXTRACT(YEAR FROM timestamp))
```

**Impacto de Severidad**: MEDIA (datos crecen rápidamente)

---

### Occupancy (app/models/occupancy.py)
**Estado**: ✅ BIEN DISEÑADO - CHECK-IN/OUT SIMPLE

```python
Campos:
- id: PK
- room_id: FK rooms, INDEXED
- guest_id: FK guests, INDEXED
- reservation_id: FK reservations (NULLABLE) - permite walk-ins
- check_in: DATETIME, default=now, INDEXED
- check_out: DATETIME (NULLABLE - NULL = actualmente ocupado)
- amount_paid_bs: FLOAT
- amount_paid_usd: FLOAT
- payment_method: VARCHAR(50)
- notes: TEXT

Relaciones:
- room: back_populates
- guest: simple
- reservation: simple

Properties:
- is_active: bool
- duration_hours: float | None
```

**Fortalezas**:
- Simple y efectivo
- Permite walk-ins (sin reserva)
- Soporte multimoneda (bs, usd)
- Timestamps para auditoría

**Debilidades Identificadas**:
- ❌ Sin campo `expected_check_out` (para overbooked prediction)
- ❌ Sin campo `created_by` (quién registró el check-in)
- ❌ Sin campo `status` (active, checked_out, late_checkout, etc.)
- ❌ Sin constraint CHECK que check_out >= check_in o check_out IS NULL
- ❌ Sin índice compuesto (room_id, check_out) para ocupación actual
- ❌ Sin campo `actual_price` para diferencias de precio

**Mejoras Recomendadas**:
```python
from datetime import datetime
from sqlalchemy import CheckConstraint, Index

expected_check_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
actual_price_paid: Mapped[float | None] = mapped_column(Float, nullable=True)

__table_args__ = (
    CheckConstraint("check_out IS NULL OR check_out >= check_in"),
    Index("ix_room_checkout", "room_id", "check_out"),
)
```

**Impacto de Severidad**: BAJA-MEDIA

---

### Maintenance (app/models/maintenance.py)
**Estado**: ✅ EXCELENTE - SISTEMA COMPLETO

```python
Enums:
- MaintenanceType: cleaning, deep_cleaning, plumbing, electrical, carpentry, painting, air_conditioning, furniture, other
- MaintenanceStatus: pending, in_progress, completed, cancelled
- MaintenancePriority: low, medium, high, urgent

Campos:
- id: PK
- room_id: FK rooms, INDEXED
- staff_id: FK staff (NULLABLE)
- type: Enum MaintenanceType
- status: Enum MaintenanceStatus, default=pending
- priority: Enum MaintenancePriority, default=medium
- reported_at: DATETIME, INDEXED
- started_at: DATETIME
- completed_at: DATETIME, INDEXED
- description: TEXT
- notes: TEXT
- reported_by: VARCHAR(255)

Properties:
- duration_hours: float | None
- is_overdue: bool (>24 horas sin completar)
```

**Fortalezas**:
- Enums bien definidos
- Seguimiento de tiempo (reported, started, completed)
- Prioridades para gestión de cola
- Estado completo para workflow

**Debilidades Identificadas**:
- ❌ Sin campo `estimated_duration` para planificación
- ❌ Sin campo `materials_used` (TEXT para lista de materiales)
- ❌ Sin campo `cost` para presupuesto
- ❌ Sin relación a media para fotos before/after
- ❌ Sin índice compuesto (room_id, status) para ocupación
- ❌ Sin índice (status, priority, reported_at) para búsquedas de pendientes

**Mejoras Recomendadas**:
```python
estimated_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
materials_used: Mapped[str | None] = mapped_column(Text, nullable=True)
cost: Mapped[float | None] = mapped_column(Float, nullable=True)

__table_args__ = (
    Index("ix_maintenance_status_priority", "status", "priority"),
    Index("ix_maintenance_room_status", "room_id", "status"),
)
```

**Impacto de Severidad**: BAJA

---

### RoomRate (app/models/room_rate.py)
**Estado**: ✅ SIMPLE Y FUNCIONAL

```python
Campos:
- id: PK
- room_id: FK rooms
- period: Enum Period (day, week, fortnight, month)
- price_bs: FLOAT
- currency_note: VARCHAR(50)

Constraint:
- UNIQUE(room_id, period)
```

**Fortalezas**:
- Simple y directo
- Permite diferentes precios por período
- Unique constraint previene duplicados

**Debilidades Identificadas**:
- ❌ Sin campo `valid_from`, `valid_until` para cambios de precio históricos
- ❌ Sin campo `created_at`, `updated_at`
- ❌ Sin constraint CHECK price_bs > 0
- ❌ Sin soporte para descuentos o surcharges

**Mejoras Recomendadas**:
```python
from datetime import datetime

valid_from: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
valid_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

__table_args__ = (
    CheckConstraint("price_bs > 0"),
    UniqueConstraint("room_id", "period", "valid_from", name="uq_rate_period_valid"),
)
```

**Impacto de Severidad**: BAJA

---

### Staff (app/models/staff.py)
**Estado**: ✅ BIEN DISEÑADO

```python
Enums:
- StaffRole: receptionist, cleaner, maintenance, manager, security
- StaffStatus: active, inactive, on_leave, terminated

Campos:
- id: PK
- full_name: VARCHAR(255), INDEXED
- document_id: VARCHAR(100), UNIQUE, INDEXED
- phone: VARCHAR(50)
- email: VARCHAR(255)
- role: Enum StaffRole, INDEXED
- status: Enum StaffStatus, default=active
- can_access_admin: BOOLEAN
- notes: VARCHAR(500)

Relaciones:
- maintenances: back_populates
```

**Fortalezas**:
- Roles bien definidos
- Estados para gestión de personal

**Debilidades Identificadas**:
- ❌ Sin campo `hire_date` para nómina
- ❌ Sin campo `salary` (encriptado)
- ❌ Sin campo `bank_account` (para pagos)
- ❌ Sin campo `emergency_contact`
- ❌ Sin auditoría (created_at, updated_at)
- ❌ Sin constraint UNIQUE en email

**Mejoras Recomendadas**:
```python
hire_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
emergency_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

**Impacto de Severidad**: BAJA

---

## 1.2 ANÁLISIS DE RELACIONES ENTRE MODELOS

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Admin)                         │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        │          │          │          │
        v          v          v          v
┌──────────────┐ ┌────────┐ ┌───────┐ ┌──────────┐
│  Reservation │ │ Media  │ │Audit  │ │ Payments │
│  (created_by)│ │(upload)│ │ Logs  │ │(created) │
└──────────────┘ └────────┘ └───────┘ └──────────┘

┌──────────────────────────────────────────────────────────┐
│                  GUEST (Huésped)                         │
└──────────┬──────────┬──────────┬──────────────┬──────────┘
           │          │          │              │
           v          v          v              v
      ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
      │Devices │ │Reservat. │ │Occupan.│ │  Payments    │
      └────┬───┘ └────┬─────┘ └───┬────┘ └──────────────┘
           │          │           │
           v          v           v
    ┌──────────┐  ┌──────┐  ┌──────────┐
    │NetworkAct│  │Room  │  │Occupancy │
    │ivity     │  │(FK)  │  │ CheckOut │
    └──────────┘  └──────┘  └──────────┘

┌──────────────────────────────────────────────────────────┐
│                      ROOM                                │
└──────┬──────────┬──────────┬──────────┬──────────────────┘
       │          │          │          │
       v          v          v          v
  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌───────────┐
  │RoomRate│ │Reservat.│ │Occupancy │ │Maintenance│
  └────────┘ └─────────┘ └──────────┘ └───────────┘

┌──────────────────────────────────────────────────────────┐
│                    MAINTENANCE                           │
└──────┬──────────┬──────────┐
       │          │          │
       v          v          v
   ┌────────┐ ┌──────────┐ ┌──────┐
   │  Room  │ │  Staff   │ │Media │
   └────────┘ └──────────┘ └──────┘

┌──────────────────────────────────────────────────────────┐
│                  EXCHANGE_RATE                           │
│             (Tasas de cambio)                            │
└──────────────────────────────────────────────────────────┘
```

**Integridad Referencial**:
- ✅ Foreign Keys bien definidas
- ✅ Cascade delete en cascadas (Guest -> Devices, Room -> Reservations)
- ✅ Relaciones one-to-many bien configuradas

**Debilidades en Relaciones**:
- ❌ Falta relación explícita Device -> User (para auditoría de quién registró el dispositivo)
- ❌ Falta relación de auditoría centralizada
- ⚠️  Muchas relaciones nullable (mejor para flexibilidad pero dificulta queries)

---

## 1.3 CAMPOS QUE NECESITAN ÍNDICES

**Índices que deberían agregarse**:

```sql
-- NetworkActivity (tabla que crece rápidamente)
CREATE INDEX idx_network_activity_device_timestamp 
  ON network_activities(device_id, timestamp);
CREATE INDEX idx_network_activity_guest_timestamp 
  ON network_activities(guest_id, timestamp);

-- Reservation (búsquedas frecuentes por rango)
CREATE INDEX idx_reservation_guest_date 
  ON reservations(guest_id, start_date, end_date);
CREATE INDEX idx_reservation_status 
  ON reservations(status);

-- Occupancy (búsquedas de habitación ocupada)
CREATE INDEX idx_occupancy_room_active 
  ON occupancies(room_id) WHERE check_out IS NULL;

-- Payment (reportes de ingresos)
CREATE INDEX idx_payment_date_currency 
  ON payments(payment_date, currency);

-- Device (búsquedas frecuentes)
CREATE INDEX idx_device_guest_active 
  ON devices(guest_id) WHERE allowed = true AND suspended = false;

-- Maintenance (búsquedas de pendientes)
CREATE INDEX idx_maintenance_status_priority 
  ON maintenances(status, priority)
  WHERE status NOT IN ('completed', 'cancelled');
```

---

# 2. SISTEMA DE DISPOSITIVOS E INTERNET - ANÁLISIS DETALLADO

## 2.1 MODELO DEVICE

**Ubicación**: `/home/adrpinto/hostal/backend/app/models/device.py`

**Características Implementadas**:
- ✅ Registro único de dispositivos por MAC
- ✅ Seguimiento de datos (upload/download)
- ✅ Estados online/offline basado en last_seen
- ✅ Suspensión manual con razón registrada
- ✅ Cuotas de datos (diarias/mensuales)
- ✅ Timestamps de primera/última conexión

**Fortalezas**:
- Completo para análisis de uso
- Propiedades computed para abstracción
- Índices adecuados para búsquedas

**Debilidades**:
- ❌ Sin historial de cuotas (solo almacena actual)
- ❌ Sin alertas cuando se aproxima cuota
- ❌ Sin categorización de dispositios (importante para SLA)
- ❌ Sin soft-limit/hard-limit en cuotas

---

## 2.2 ROUTER DEVICES

**Ubicación**: `/home/adrpinto/hostal/backend/app/routers/devices.py`

**Endpoints Implementados**:
1. `GET /guests/{guest_id}/devices/` - Listar dispositivos
2. `POST /guests/{guest_id}/devices/` - Agregar dispositivo
3. `DELETE /guests/{guest_id}/devices/{device_id}` - Eliminar dispositivo

**Análisis de Seguridad**:

```python
Fortalezas:
- ✅ Requiere roles admin/recepcionista
- ✅ Valida que huésped exista
- ✅ Valida MAC único
- ✅ Convierte MAC a mayúsculas (normalización)
- ✅ Intenta notificar al router (buena intención)

Debilidades:
- ❌ En POST: no valida formato MAC antes de guardar
- ❌ En POST: except Exception: pass sin logging - errores silenciosos
- ❌ En POST: no verifica límite de dispositivos por huésped
- ❌ En DELETE: except Exception: pass sin logging
- ❌ No hay endpoint GET para dispositivo individual
- ❌ No hay endpoint PATCH para actualizar dispositivo
- ❌ No hay endpoints de reportes (uso por dispositivo)
```

**Vulnerabilidades Identificadas**:

1. **Silent Exception Handling (CRÍTICA)**
```python
# ACTUAL - MAL
try:
    from ..core.network import notify_whitelist_add
    notify_whitelist_add(mac, guest, device)
except Exception:
    pass  # ❌ Error silencioso

# RECOMENDADO
import structlog
log = structlog.get_logger()
try:
    from ..core.network import notify_whitelist_add
    notify_whitelist_add(mac, guest, device)
except Exception as e:
    log.warning("Failed to notify router about new device", 
                device_id=device.id, mac=mac, error=str(e))
    # No fallar la solicitud, pero registrar para debugging
```

2. **Falta de Validación de MAC**
```python
# ACTUAL - MAL
mac = data.mac.upper()
exists = db.query(Device).filter(Device.mac == mac).first()

# El validation ocurre en el schema pero sin constraint DB
from schemas.device import MAC  # regex: ^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$

# RECOMENDADO: Agregar constraint a nivel de BD
ALTER TABLE devices ADD CONSTRAINT check_valid_mac
  CHECK (mac ~ '^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$');
```

3. **Falta de Rate Limiting**
```python
# No hay rate limiting en registración de dispositivos
# Un usuario mal intencionado puede:
# - Registrar miles de MACs falsas
# - Consumir almacenamiento

# RECOMENDADO
from app.core.limiter import limiter

@router.post("/", ...)
@limiter.limit("10/minute")  # Max 10 dispositivos por minuto
def add_device(...):
    pass
```

4. **Límite de Dispositivos por Huésped**
```python
# Falta validación
# Un huésped debería poder tener máx 5-10 dispositivos

# RECOMENDADO
MAX_DEVICES_PER_GUEST = 5

devices_count = db.query(Device).filter(Device.guest_id == guest_id).count()
if devices_count >= MAX_DEVICES_PER_GUEST:
    raise HTTPException(status_code=400, 
        detail=f"Cannot register more than {MAX_DEVICES_PER_GUEST} devices per guest")
```

---

## 2.3 ROUTER INTERNET_CONTROL

**Ubicación**: `/home/adrpinto/hostal/backend/app/routers/internet_control.py`

**Endpoints Implementados**:
1. `POST /internet-control/devices/{device_id}/suspend` - Suspender dispositivo
2. `POST /internet-control/devices/{device_id}/resume` - Reanudar dispositivo
3. `POST /internet-control/guests/{guest_id}/suspend-all` - Suspender todos
4. `POST /internet-control/guests/{guest_id}/resume-all` - Reanudar todos
5. `GET /internet-control/status` - Dashboard de estado

**Fortalezas**:
- ✅ Auditoría completa (log_action)
- ✅ Endpoints bulk para eficiencia
- ✅ Validaciones de estado
- ✅ Razones de suspensión registradas
- ✅ Dashboard útil

**Debilidades Identificadas**:

1. **Falta de Integración Real con Router** (CRÍTICA)
```python
# ACTUAL - Comentado
# TODO: Integración real con router/firewall para bloquear MAC
# notify_router_block(device.mac)

# Esto significa que la suspensión es solo en BD
# El usuario puede:
# - Cambiar MAC de su dispositivo
# - Continuar con internet aunque esté "suspendido"

# RECOMENDADO: Implementar integración
from app.core.network import RouterManager

router_mgr = RouterManager(config.ROUTER_IP, config.ROUTER_API_KEY)

device.suspended = True
db.commit()

try:
    router_mgr.block_mac(device.mac)
except Exception as e:
    log.error("Failed to block MAC on router", device_id=device.id, error=str(e))
    # Rollback del cambio en BD
    db.rollback()
    raise HTTPException(status_code=500, detail="Failed to apply suspension")
```

2. **Lógica de online_devices Incorrecta** (BUG)
```python
# ACTUAL - INCORRECTO
online_devices = db.query(Device).filter(Device.last_seen >= cutoff).count()
# ...
"offline_devices": active_devices - online_devices,  # ❌ Resta incorrecta

# Debería contar todos los dispositivos con last_seen >= cutoff
# sin filtrar por active_devices

# CORRECTO
active_online = db.query(Device).filter(
    and_(Device.suspended == False, Device.last_seen >= cutoff)
).count()
active_offline = active_devices - active_online
```

3. **Sin Validación de Timeout**
```python
# El endpoint GET /status hace:
from datetime import datetime, timedelta
cutoff = datetime.utcnow() - timedelta(minutes=5)

# Esto es hardcoded
# RECOMENDADO: configurable
ONLINE_THRESHOLD_MINUTES = 5  # en config

cutoff = datetime.utcnow() - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)
```

4. **Sin Notificación al Dispositivo**
```python
# Cuando se suspende, el dispositivo no se entera
# Debería:
# - Desconectar activamente la sesión del dispositivo
# - Mostrar mensaje al usuario en el navegador
# - Registrar la razón de suspensión

# RECOMENDADO: Implementar portal cautivo
class RouterManager:
    def block_mac(self, mac: str, reason: str):
        # 1. Desconectar sesión activa del dispositivo
        # 2. Redirigir a portal cautivo mostrando razón
        # 3. Log de evento
        pass
```

5. **Sin Límite de Tiempo en Suspensión**
```python
# Una vez suspendido, el dispositivo está suspendido indefinidamente
# RECOMENDADO: Agregar auto-unsuspend
suspension_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

# Y verificar:
if device.suspension_until and datetime.utcnow() > device.suspension_until:
    device.suspended = False
    device.suspension_until = None
    db.commit()
```

---

## 2.4 MODELO NETWORKACTIVITY

**Ubicación**: `/home/adrpinto/hostal/backend/app/models/network_activity.py`

**Estado**: ✅ MUY BIEN para tracking

**Debilidades**:
- ❌ Sin limpieza automática de datos antiguos (tabla crece infinitamente)
- ❌ Sin particionamiento para optimizar queries
- ❌ Sin índices compuestos para reportes

---

## 2.5 RESUMEN: SISTEMA DE DISPOSITIVOS E INTERNET

| Componente | Estado | Críticas | Mejoras Necesarias |
|-----------|--------|----------|------------------|
| Device Model | ✅ Bien | 0 | +5 |
| Devices Router | ⚠️ Funcional | 1 | +4 |
| Internet Control | ⚠️ Funcional | 1 | +5 |
| NetworkActivity | ✅ Bien | 0 | +3 |
| **INTEGRACIÓN** | ❌ **NO IMPLEMENTADA** | **CRÍTICA** | Implementar |

---

# 3. SISTEMA DE PAGOS - ANÁLISIS DETALLADO

## 3.1 MODELO PAYMENT

**Ubicación**: `/home/adrpinto/hostal/backend/app/models/payment.py`

**Estado**: ✅ EXCELENTE - Sistema multimoneda robusto

**Características**:
- ✅ 3 monedas: EUR, USD, VES
- ✅ 8 métodos de pago
- ✅ Precalcula conversiones en BD
- ✅ Guarda tasas usadas para auditoría
- ✅ Estados de pago (pending, completed, etc.)
- ✅ Referencia a usuario que registró
- ✅ Soporte para pagos parciales

**Debilidades Menores**:
- ❌ Sin campo due_date para pagos pendientes
- ❌ Sin constraint CHECK amount > 0
- ❌ Sin campo external_transaction_id para APIs

---

## 3.2 MODELO EXCHANGERATE

**Ubicación**: `/home/adrpinto/hostal/backend/app/models/exchange_rate.py`

**Características**:
- ✅ Almacena tasas históricas
- ✅ Diferencia tasas automáticas vs manuales
- ✅ Método de clase para conversión
- ✅ Conversión indirecta vía USD

**Debilidades**:
- ❌ Sin field `is_active` para invalidar tasas antiguas
- ❌ Sin constraint CHECK rate > 0
- ❌ Sin índice para búsquedas por rango de fechas

---

## 3.3 ROUTER EXCHANGE_RATES

**Ubicación**: `/home/adrpinto/hostal/backend/app/routers/exchange_rates.py`

**Endpoints**:
1. `POST /exchange-rates/update` - Actualizar tasas desde API
2. `GET /exchange-rates/latest` - Obtener tasas actuales
3. `POST /exchange-rates/convert` - Convertir entre monedas
4. `POST /exchange-rates/convert-all` - Convertir a las 3 monedas

**Análisis**:

```python
Fortalezas:
- ✅ Endpoint actualización solo para admin
- ✅ Endpoints de conversión públicos
- ✅ Manejo de errores basic

Debilidades:
- ❌ En /update: no retorna timestamp, retorna "now" como string
- ❌ En /latest: usa "base_currency" hardcoded a USD
- ❌ En /convert: parámetros en query (debería POST body)
- ❌ En /convert-all: mismo issue
- ❌ Sin cache de tasas (cada llamada consulta BD)
- ❌ Sin validación de monedas válidas
- ❌ Sin manejo de cambios de moneda (ej: VES devalúa constantemente)
```

**Vulnerabilidades**:

1. **Parámetros en Query String (NO-REST)**
```python
# ACTUAL - MAL
def convert_currency(amount: float, from_currency: str, to_currency: str, db: Session):
    pass

# GET /exchange-rates/convert?amount=100&from_currency=USD&to_currency=EUR
# ❌ Expone parámetros en logs, historiales del navegador
# ❌ Menos seguro

# RECOMENDADO
from pydantic import BaseModel

class ConvertRequest(BaseModel):
    amount: float = Field(..., gt=0)
    from_currency: str = Field(..., min_length=3, max_length=3)
    to_currency: str = Field(..., min_length=3, max_length=3)

@router.post("/exchange-rates/convert")
def convert_currency(request: ConvertRequest, db: Session):
    # POST body, más seguro
    pass
```

2. **Sin Validación de Monedas**
```python
# ACTUAL - MAL
def convert_currency(amount, from_currency, to_currency, db):
    result = CurrencyService.convert_amount(db, amount, from_currency, to_currency)
    # ¿Qué pasa si from_currency = "XXX"?
    # La función retorna converted_amount=None sin error claro

# RECOMENDADO
from enum import Enum

class CurrencyCode(str, Enum):
    EUR = "EUR"
    USD = "USD"
    VES = "VES"

def convert_currency(
    amount: float = Field(..., gt=0),
    from_currency: CurrencyCode = Field(...),
    to_currency: CurrencyCode = Field(...),
    db: Session = Depends(get_db)
):
    if from_currency == to_currency:
        return {"from": from_currency, "to": to_currency, "rate": 1.0, "result": amount}
    # Resto del código...
```

3. **Sin Cache**
```python
# /exchange-rates/latest consulta BD cada vez
# Si hay 100 requests/segundo, consume recursos

# RECOMENDADO: Redis cache
from aioredis import Redis

@router.get("/exchange-rates/latest", response_model=dict)
async def get_latest_rates(
    base_currency: str = "USD",
    redis: Redis = Depends(get_redis),
    db: Session = Depends(get_db)
):
    cache_key = f"exchange_rates:{base_currency}"
    
    # Intentar obtener del cache
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Si no está en cache, consultar BD
    rates = CurrencyService.get_latest_rates(db, base_currency)
    
    # Cachear por 1 hora
    await redis.setex(cache_key, 3600, json.dumps(rates))
    
    return {"base_currency": base_currency, "rates": rates}
```

4. **Actualización Periódica No Implementada**
```python
# El update de tasas es manual (POST /exchange-rates/update)
# En producción, debería ser automático cada cierto tiempo

# RECOMENDADO: Background task
from apscheduler.schedulers.background import BackgroundScheduler

def update_exchange_rates_task():
    db = SessionLocal()
    try:
        CurrencyService.update_rates_from_api(db, base_currency="USD")
        log.info("Exchange rates updated successfully")
    except Exception as e:
        log.error("Failed to update exchange rates", error=str(e))
    finally:
        db.close()

# En main.py startup
scheduler = BackgroundScheduler()
scheduler.add_job(update_exchange_rates_task, 'interval', hours=24)
scheduler.start()
```

---

## 3.4 SERVICIO CURRENCY

**Ubicación**: `/home/adrpinto/hostal/backend/app/services/currency.py`

**Fortalezas**:
- ✅ API externa para tasas (exchangerate-api.com)
- ✅ Manejo de async/await
- ✅ Conversión indirecta vía USD
- ✅ Método should_update_rates

**Debilidades**:

1. **API Sin Failover** (IMPORTANTE)
```python
API_URL = "https://api.exchangerate-api.com/v4/latest/"
# Solo un provider, sin backup

# RECOMENDADO
EXCHANGE_RATE_PROVIDERS = [
    "https://api.exchangerate-api.com/v4/latest/",  # Primary
    "https://api.exchangerate.host/latest",         # Fallback
    "https://open.er-api.com/v6/latest/",          # Fallback 2
]
```

2. **Filtrado Hardcoded de Monedas**
```python
# ACTUAL
if target_curr in ["EUR", "USD", "VES"]:

# RECOMENDADO: Config
SUPPORTED_CURRENCIES = {"EUR", "USD", "VES"}
```

3. **Sin Handling de Rate Limits de API**
```python
# Si exchangerate-api.com es rate-limited (429), se silencia
try:
    response = await client.get(...)
    if response.status_code == 200:
        return data.get("rates", {})
except Exception:
    return None  # ❌ No diferencia entre error de red y rate limit

# RECOMENDADO
if response.status_code == 429:
    log.warning("API rate limited, using cached rates")
    return None
elif response.status_code >= 500:
    log.error("API server error", status=response.status_code)
```

---

## 3.5 RESUMEN: SISTEMA DE PAGOS

| Componente | Estado | Críticas |
|-----------|--------|----------|
| Payment Model | ✅ Excelente | 0 |
| ExchangeRate Model | ✅ Bien | 0 |
| Exchange Rates Router | ⚠️ Funcional | 2 |
| Currency Service | ⚠️ Funcional | 3 |

---

# 4. SISTEMA DE ARCHIVOS - ANÁLISIS DETALLADO

## 4.1 MODELO MEDIA

**Ubicación**: `/home/adrpinto/hostal/backend/app/models/media.py`

**Estado**: ✅ BIEN - Flexible y complet

o

**Características**:
- ✅ Soporta imágenes, documentos, videos
- ✅ Categorización flexible
- ✅ Asociación a múltiples entidades
- ✅ Metadatos (título, descripción, alt_text)
- ✅ Auditoría (uploaded_by, uploaded_at)

**Debilidades**:
- ❌ Sin validación de mime_type vs media_type
- ❌ Sin soft delete (archived_at)
- ❌ Sin información de dimensiones (width/height)

---

## 4.2 ROUTER MEDIA

**Ubicación**: `/home/adrpinto/hostal/backend/app/routers/media.py`

**Endpoints**:
1. `POST /media/upload` - Subir archivo
2. `GET /media/` - Listar archivos
3. `DELETE /media/{media_id}` - Eliminar archivo

**Validaciones Implementadas**:
```python
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
```

**Análisis Detallado**:

```python
Fortalezas:
- ✅ Validación de tipos de archivo
- ✅ Límite de tamaño (10 MB)
- ✅ Generación de nombre único (UUID)
- ✅ Almacenamiento en directorio específico
- ✅ Registro en BD antes de servir

Debilidades:
- ❌ Validación de tamaño ocurre DESPUÉS de leer en memoria
- ❌ Sin validación de filename (path traversal?)
- ❌ Sin validación del contenido (magic bytes)
- ❌ Sin compresión de imágenes
- ❌ Sin watermark en imágenes sensibles
- ❌ Sin generación de thumbnails
- ❌ Sin escaneo de virus (ClamAV)
- ❌ Sin cuota de almacenamiento por usuario
```

**Vulnerabilidades Críticas**:

1. **Lectura Completa en Memoria ANTES de Validar** (DoS)
```python
# ACTUAL - MAL
async def upload_file(file: UploadFile = File(...), ...):
    validate_file(file)  # Solo valida MIME type
    
    content = await file.read()  # ❌ Lee COMPLETO en memoria
    
    if len(content) > MAX_FILE_SIZE:  # ❌ Valida DESPUÉS
        raise HTTPException(...)

# Esto permite DoS:
# - Subir archivo de 1GB
# - Almacena en memoria
# - Luego rechaza
# - Consume toda la RAM del servidor

# RECOMENDADO
async def upload_file(file: UploadFile = File(...), ...):
    # Validar MIME type temprano
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Leer en chunks y acumular tamaño
    content = b""
    chunk_size = 1024 * 1024  # 1 MB chunks
    
    async for chunk in file.file:
        content += chunk
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
    
    # Ahora procesar
    file_size = len(content)
    # ...
```

2. **Sin Validación de Contenido (Magic Bytes)** (Seguridad)
```python
# ACTUAL - MAL
if file.content_type.startswith("image"):
    media_type = MediaType.image

# Un atacante puede:
# - Subir archivo.exe con MIME type "image/jpeg"
# - El servidor lo marca como imagen
# - Si se sirve directamente, puede ejecutarse

# RECOMENDADO
import magic

def validate_file_content(content: bytes, mime_type: str) -> bool:
    # Detectar tipo real del archivo
    real_type = magic.from_buffer(content, mime=True)
    
    # Whitelist estricta
    allowed_mimes = {
        "image/jpeg": ["image/jpeg"],
        "image/png": ["image/png"],
        "application/pdf": ["application/pdf"],
    }
    
    if mime_type not in allowed_mimes:
        return False
    
    if real_type not in allowed_mimes[mime_type]:
        raise HTTPException(400, "File content doesn't match declared type")
    
    return True
```

3. **Sin Protección contra Path Traversal** (CRÍTICA)
```python
# ACTUAL - MAL
filename = Path(file.filename).suffix
stored_filename = f"{uuid.uuid4()}{filename}"
file_path = UPLOAD_DIR / stored_filename

# El uuid protege, pero aún así:
file_path.parent.mkdir(exist_ok=True, parents=True)  # ❌ Si UPLOAD_DIR es "../../"

# RECOMENDADO
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR = UPLOAD_DIR.resolve()  # Resolver symlinks y ../

stored_filename = str(uuid.uuid4())  # Solo UUID, sin extensión derivada
file_path = UPLOAD_DIR / stored_filename

# Validar que file_path está dentro de UPLOAD_DIR
if not str(file_path.resolve()).startswith(str(UPLOAD_DIR)):
    raise HTTPException(400, "Invalid file path")
```

4. **Sin Limpieza de Metadatos de Imágenes** (Privacidad)
```python
# Imágenes pueden contener:
# - Datos EXIF (GPS, cámara, fecha)
# - Comentarios IPTC
# - Perfil de color embebido

# RECOMENDADO
from PIL import Image
from PIL.Image import Exif

def strip_image_metadata(image_path: Path) -> None:
    """Remove all metadata from image."""
    try:
        image = Image.open(image_path)
        
        # Crear imagen sin metadatos
        image_data = list(image.getdata())
        image_without_metadata = Image.new(image.mode, image.size)
        image_without_metadata.putdata(image_data)
        
        # Guardar
        image_without_metadata.save(image_path, quality=95)
    except Exception as e:
        log.warning(f"Could not strip metadata: {e}")
```

5. **Sin Rate Limiting en Upload** (DoS)
```python
# ACTUAL - MAL: Sin límite de uploads
@router.post("/media/upload", ...)
async def upload_file(...):
    pass

# Un usuario puede:
# - Hacer upload de 1000 archivos/segundo
# - Saturar el almacenamiento

# RECOMENDADO
from app.core.limiter import limiter

@router.post("/media/upload", ...)
@limiter.limit("10/minute")  # Max 10 uploads/minuto
async def upload_file(...):
    pass
```

6. **Sin Cuota de Almacenamiento** (Abuse)
```python
# Falta implementar límite de almacenamiento por usuario/sistema

# RECOMENDADO
MAX_STORAGE_PER_GUEST = 100 * 1024 * 1024  # 100 MB
MAX_STORAGE_TOTAL = 100 * 1024 * 1024 * 1024  # 100 GB

def get_guest_storage_usage(guest_id: int, db: Session) -> int:
    """Retorna bytes usados por huésped."""
    total = db.query(func.sum(Media.file_size)).filter(
        Media.guest_id == guest_id
    ).scalar() or 0
    return total

# En upload, validar cuota
usage = get_guest_storage_usage(guest_id, db)
if usage + file_size > MAX_STORAGE_PER_GUEST:
    raise HTTPException(status_code=413, detail="Storage quota exceeded")
```

7. **Sin Escaneo de Virus** (Malware)
```python
# En producción, debería escanear con ClamAV

# RECOMENDADO
import pyclamd

def scan_file_for_malware(file_path: Path) -> bool:
    """Escanea archivo con ClamAV. Retorna True si clean."""
    try:
        clam = pyclamd.ClamD()
        result = clam.scan_file(str(file_path))
        if result is None:
            return True  # Clean
        else:
            log.error(f"Malware detected: {result}")
            file_path.unlink()  # Eliminar archivo
            return False
    except Exception as e:
        log.warning(f"ClamAV scanning failed: {e}")
        # Decidir si fallar seguro o permitir
        return False  # Failsafe: rechazar si no se puede escanear
```

8. **Sin Generación de Thumbnails**
```python
# Servir imagen original de 20MB es ineficiente

# RECOMENDADO
from PIL import Image

def generate_thumbnail(image_path: Path, thumb_size: tuple = (150, 150)) -> Path:
    """Genera thumbnail de imagen."""
    image = Image.open(image_path)
    image.thumbnail(thumb_size, Image.Resampling.LANCZOS)
    
    thumb_path = image_path.parent / f"thumb_{image_path.name}"
    image.save(thumb_path, quality=85)
    
    return thumb_path
```

9. **Sin Compresión de Imágenes**
```python
# Las imágenes no se comprimen, consumen almacenamiento

# RECOMENDADO
def compress_image(image_path: Path, quality: int = 85) -> None:
    """Comprime imagen JPEG."""
    image = Image.open(image_path)
    image.save(image_path, quality=quality, optimize=True)
```

---

## 4.3 RESUMEN: SISTEMA DE ARCHIVOS

| Aspecto | Estado | Riesgo |
|--------|--------|--------|
| Almacenamiento | ✅ Funcional | Bajo |
| Validación | ⚠️ Básica | MEDIO |
| Seguridad | ❌ Débil | **ALTO** |
| Manejo de Errores | ⚠️ Básico | Medio |
| Rate Limiting | ❌ No existe | Medio |
| Cuota de Almacenamiento | ❌ No existe | Bajo |
| Metadatos | ❌ No se limpian | Privacidad |

**Críticas Encontradas**: 9

---

# 5. SEGURIDAD Y VALIDACIONES - ANÁLISIS EXHAUSTIVO

## 5.1 CORE/SECURITY.PY

**Ubicación**: `/home/adrpinto/hostal/backend/app/core/security.py`

**Componentes Principales**:
1. `pwd_context` - CryptContext con bcrypt
2. `oauth2_scheme` - OAuth2PasswordBearer
3. `verify_password()` - Verificar contraseña
4. `hash_password()` - Hash de contraseña
5. `create_access_token()` - Crear JWT
6. `get_current_user()` - Extraer usuario del token
7. `require_roles()` - Decorator para roles

**Análisis Detallado**:

### 1. Hash de Contraseñas (Bcrypt)

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)
```

**Fortalezas**:
- ✅ Usa bcrypt (excelente)
- ✅ Automatic scheme deprecation

**Debilidades**:
- ❌ Sin validación de longitud mínima de contraseña
- ❌ Sin validación de complejidad (mayús, números, especiales)
- ❌ Sin protección contra timing attacks (aunque bcrypt ya la tiene)
- ❌ Sin limite de intentos fallidos

**Recomendaciones**:
```python
import re

def validate_password_complexity(password: str) -> tuple[bool, str]:
    """Valida que la contraseña cumpla requisitos."""
    MIN_LENGTH = 12
    
    if len(password) < MIN_LENGTH:
        return False, f"Password must be at least {MIN_LENGTH} characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain special character"
    
    return True, "OK"
```

### 2. JWT Tokens

```python
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
```

**Fortalezas**:
- ✅ Usa timezone.utc (correcto)
- ✅ Exponencial timeout configurable
- ✅ Algoritmo HS256 (HMAC-SHA256)

**Debilidades**:
- ❌ Sin "jti" (JWT ID único) para blacklist
- ❌ Sin "iat" (issued at time)
- ❌ Sin "nbf" (not before) para clock skew
- ❌ Sin opción de refresh tokens
- ⚠️  Default timeout de 15 minutos es muy corto (debería ser 1-2 horas)

**Mejoras**:
```python
from uuid import uuid4

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(hours=1)  # Aumentar a 1 hora
    
    # Agregar claims estándar
    to_encode.update({
        "exp": expire,
        "iat": now,  # Issued at
        "nbf": now - timedelta(seconds=5),  # 5s clock skew tolerance
        "jti": str(uuid4()),  # JWT ID para blacklist
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int) -> str:
    """Crea un refresh token con expiración más larga."""
    data = {"sub": str(user_id), "type": "refresh"}
    expires = timedelta(days=7)
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```

### 3. Token Validation

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        log.info("Validating token", token_preview=token[:50] if token else "None")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        log.info("Token decoded", payload=payload)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as e:
        log.error("JWT decode error", error=str(e))
        raise credentials_exception from None

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exception
    log.info("User authenticated successfully", user_id=user.id, email=user.email)
    return user
```

**Fortalezas**:
- ✅ Logging de validación
- ✅ Validación de user_id
- ✅ WWW-Authenticate header

**Debilidades**:
- ❌ Sin verificación de blacklist de tokens (para logout)
- ❌ Sin verificación de "tipo" de token (access vs refresh)
- ❌ Sin verificación de "is_active" del usuario
- ⚠️  Expone token_preview en logs (podría ser sensible)

**Mejoras**:
```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Validar tipo de token
        token_type = payload.get("type", "access")
        if token_type != "access":
            raise credentials_exception
        
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Validar que no está en blacklist (para logout)
        if is_token_blacklisted(token):
            log.warning("Token was blacklisted", user_id=user_id)
            raise credentials_exception
            
    except JWTError as e:
        log.error("JWT validation failed")
        raise credentials_exception from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    
    log.info("User authenticated", user_id=user.id)
    return user


def is_token_blacklisted(token: str) -> bool:
    """Verifica si el token está en blacklist (para logout)."""
    # Implementar con Redis
    redis_key = f"blacklist:{token}"
    return redis_client.exists(redis_key)


def blacklist_token(token: str, expires_delta: timedelta):
    """Agrega token a blacklist (para logout)."""
    redis_client.setex(f"blacklist:{token}", expires_delta.total_seconds(), "1")
```

### 4. Role-Based Access Control (RBAC)

```python
def require_roles(*roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this user role",
            )
        return current_user
    return role_checker
```

**Fortalezas**:
- ✅ Simple y directo
- ✅ Soporta múltiples roles
- ✅ Bien integrado con FastAPI

**Debilidades**:
- ❌ Sin permission matrix (qué rol puede hacer qué)
- ❌ Sin resource-level permissions (puede ver datos de otro usuario?)
- ❌ Sin audit de cambios de permisos
- ❌ Sin separación clara de roles

**Problemas de Diseño**:

En el código se observa:
```python
# app/routers/devices.py
@router.post("/", dependencies=[Depends(require_roles("admin", "recepcionista"))])
def add_device(guest_id: int, ...):
    pass

# ¿Qué puede hacer un "recepcionista"?
# ¿Puede ver datos de otros huéspedes?
# ¿Puede eliminar dispositivos?
```

**Mejoras Recomendadas**:
```python
from enum import Enum

class RolePermissions(str, Enum):
    # Admin: acceso total
    ADMIN = "admin"
    # Recepcionista: crear reservas, check-in, ver huéspedes
    RECEPTIONIST = "receptionist"
    # Cleaner: solo ver y actualizar mantenimiento
    CLEANER = "cleaner"
    # Manager: reportes
    MANAGER = "manager"
    # Guest: solo datos propios
    GUEST = "guest"

# Permission matrix
ROLE_PERMISSIONS = {
    RolePermissions.ADMIN: ["*"],  # Todo
    RolePermissions.RECEPTIONIST: [
        "guests.view", "guests.create",
        "reservations.view", "reservations.create", "reservations.confirm",
        "devices.view", "devices.create",
        "internet_control.suspend",
    ],
    RolePermissions.CLEANER: [
        "maintenance.view", "maintenance.update",
        "rooms.view",
    ],
    RolePermissions.MANAGER: [
        "reports.view", "analytics.view",
    ],
    RolePermissions.GUEST: [
        "mydata.view", "myreservations.view",
    ]
}

def require_permission(permission: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        user_perms = ROLE_PERMISSIONS.get(current_user.role, [])
        
        if "*" in user_perms or permission in user_perms:
            return current_user
        
        log.warning("Permission denied", user_id=current_user.id, permission=permission)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return permission_checker
```

---

## 5.2 CORE/CONFIG.PY Y SETTINGS.PY

**Observación**: Existen DOS archivos de configuración diferentes:
- `/home/adrpinto/hostal/backend/app/core/config.py` - PYDANTIC (moderno)
- `/home/adrpinto/hostal/backend/app/core/settings.py` - CUSTOM (antiguo)

**PROBLEMA CRÍTICO**: Hay duplicación y posiblemente el código usa uno u otro inconsistentemente.

### core/config.py Analysis

```python
class Settings(BaseSettings):
    APP_ENV: str = Field(default="dev")
    DEBUG: bool = Field(default=False)
    SECRET_KEY: str = Field(default="change-me-in-production")  # ❌ Default inseguro
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=120)
    
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Comma-separated list of allowed origins",
    )
    
    # Database
    DATABASE_URL: Optional[str] = Field(default=None)
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: Optional[int] = None
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """Valida que SECRET_KEY sea seguro en producción."""
        app_env = info.data.get("APP_ENV", "dev")
        if app_env == "prod" and v in ("change-me", "change-me-in-production", ""):
            raise ValueError("SECRET_KEY must be secure...")
        if len(v) < 32 and app_env == "prod":
            raise ValueError("SECRET_KEY must be at least 32 characters long...")
        return v
    
    def get_cors_origins(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    def finalize(self) -> "Settings":
        # Construir DATABASE_URL si no está configurado
        if not self.DATABASE_URL:
            u = self.POSTGRES_USER or "hostal"
            p = self.POSTGRES_PASSWORD or "hostal_pass"
            d = self.POSTGRES_DB or "hostal_db"
            h = self.POSTGRES_HOST or "127.0.0.1"
            port = self.POSTGRES_PORT or 5432
            url = f"postgresql+psycopg://{u}:{p}@{h}:{port}/{d}"
            object.__setattr__(self, "DATABASE_URL", url)
        
        if self.APP_ENV == "prod":
            object.__setattr__(self, "DEBUG", False)
        elif self.APP_ENV == "dev":
            object.__setattr__(self, "DEBUG", True)
        
        return self

settings = Settings().finalize()
```

**Fortalezas**:
- ✅ Usa Pydantic (moderno)
- ✅ Validación de SECRET_KEY
- ✅ Defaults sensatos
- ✅ Método finalize()

**Debilidades**:
- ❌ Sin validación de DATABASE_URL format
- ❌ Sin validación de POSTGRES_PORT (debe ser 1-65535)
- ❌ Sin variables de configuración para:
  - UPLOAD_DIR
  - MAX_FILE_SIZE
  - LOG_LEVEL
  - REDIS_URL
  - WORKER_PROCESSES
  - etc.
- ❌ Las credenciales se pasan por DATABASE_URL (debería ser separadas)
- ❌ Sin soporte para secretos de Kubernetes

**Mejoras**:
```python
class Settings(BaseSettings):
    # ... campos existentes ...
    
    # Upload/Storage
    UPLOAD_DIR: Path = Field(default=Path("uploads"))
    MAX_FILE_SIZE: int = Field(default=10 * 1024 * 1024, description="Max 10MB")
    MAX_STORAGE_PER_GUEST: int = Field(default=100 * 1024 * 1024)
    ENABLE_VIRUS_SCANNING: bool = Field(default=False)
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FORMAT: str = Field(default="json")  # json o text
    
    # Redis (caching, rate limiting)
    REDIS_URL: Optional[str] = Field(default="redis://localhost:6379/0")
    REDIS_DB: int = Field(default=0)
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True)
    RATE_LIMIT_UPLOADS: str = Field(default="10/minute")
    RATE_LIMIT_API: str = Field(default="100/minute")
    
    # Security
    ENABLE_HTTPS_ONLY: bool = Field(default=True)
    SECURE_COOKIE_HTTPONLY: bool = Field(default=True)
    SECURE_COOKIE_SAMESITE: str = Field(default="Lax")
    
    # Pagination defaults
    DEFAULT_PAGE_SIZE: int = Field(default=50, ge=1, le=500)
    MAX_PAGE_SIZE: int = Field(default=500, ge=50)
    
    @field_validator("UPLOAD_DIR")
    @classmethod
    def validate_upload_dir(cls, v: Path) -> Path:
        v.mkdir(parents=True, exist_ok=True)
        return v.resolve()
    
    @field_validator("POSTGRES_PORT")
    @classmethod
    def validate_postgres_port(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError("Invalid port number")
        return v
```

---

## 5.3 ANÁLISIS DE VALIDACIONES EN SCHEMAS

### Guest Schema
```python
class GuestCreate(GuestBase):
    full_name: str  # ❌ Sin validación de longitud
    document_id: str  # ❌ Sin validación de formato (v12345678 en Venezuela)
    phone: Optional[str]  # ❌ Sin validación de formato
    email: Optional[EmailStr]  # ✅ Usa EmailStr
```

**Mejoras**:
```python
from pydantic import Field, field_validator
import re

class GuestCreate(GuestBase):
    full_name: str = Field(..., min_length=3, max_length=255)
    document_id: str = Field(..., pattern=r"^[VE]-?\d{6,8}$")  # V-12345678 o E-12345678
    phone: Optional[str] = Field(None, pattern=r"^\+?[\d\s\-()]{10,}$")  # International format
    email: Optional[EmailStr] = None
    
    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        if not re.match(r"^[a-záéíóúñ\s\-'.]+$", v, re.IGNORECASE):
            raise ValueError("Name contains invalid characters")
        return v.strip()
```

### Device Schema
```python
class DeviceCreate(BaseModel):
    mac: MAC  # ✅ Regex pattern - bien
    name: Optional[str]  # ❌ Sin límite de longitud
    vendor: Optional[str]  # ❌ Sin límite de longitud
```

### Reservation Schema
```python
class ReservationCreate(ReservationBase):
    guest_id: int  # ❌ Sin Field(..., gt=0)
    room_id: int  # ❌ Sin Field(..., gt=0)
    start_date: date  # ❌ Sin validación que sea >= hoy
    periods_count: int  # ✅ Tiene gt=0
    period: PeriodEnum | str
    price_bs: float | None  # ❌ Sin validación > 0
```

---

## 5.4 MIDDLEWARE DE SEGURIDAD

**Ubicación**: `/home/adrpinto/hostal/backend/app/core/middleware.py` y `app/main.py`

**Security Headers Implementados**:
```python
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"
response.headers["Referrer-Policy"] = "no-referrer"
```

**Fortalezas**:
- ✅ Tres headers críticos implementados

**Debilidades**:
- ❌ Sin `Content-Security-Policy`
- ❌ Sin `Strict-Transport-Security`
- ❌ Sin `Permissions-Policy`
- ❌ Sin `X-XSS-Protection`

**Mejoras**:
```python
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response
```

---

## 5.5 RATE LIMITING

**Implementado**: slowapi

```python
@router.post("/login")
@limiter.limit("5/minute")
def login(...):
    pass
```

**Estado**: ⚠️ BÁSICO

**Debilidades**:
- ❌ Solo 1 endpoint tiene rate limiting (login)
- ❌ Sin protección en otros endpoints (uploads, API calls)
- ❌ Limite muy generoso (5/min para login)

**Recomendado**:
```python
# En settings
RATE_LIMITS = {
    "login": "3/minute",  # Más estricto
    "uploads": "10/minute",
    "api_default": "100/minute",
    "api_bulk": "20/minute",
}

# Aplicar globalmente
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Implementar rate limiting por endpoint
    pass
```

---

## 5.6 AUDITORÍA Y LOGGING

**Ubicación**: `/home/adrpinto/hostal/backend/app/core/audit.py`

```python
def log_action(
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    user: Optional[User] = None,
    details: Optional[dict[str, Any]] = None,
    success: bool = True,
):
    log_data = {
        "action": action,
        "resource_type": resource_type,
        "success": success,
    }
    # ... más campos ...
    audit_log.info("Audit event", **log_data)
```

**Fortalezas**:
- ✅ Logging estructurado con structlog
- ✅ Registro de acciones críticas
- ✅ Incluye user, resource, detalles

**Debilidades**:
- ❌ No hay persistencia de logs en BD (solo en archivos)
- ❌ Sin retención automática de logs antiguos
- ❌ Sin alertas para acciones sospechosas
- ❌ Sin correlación de eventos

**Mejoras**:
```python
from sqlalchemy import Column, String, JSON, DateTime
from datetime import datetime

class AuditLog(Base):
    """Tabla de auditoría persistente."""
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    action: Mapped[str] = mapped_column(String(50), index=True)
    resource_type: Mapped[str] = mapped_column(String(50))
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    details: Mapped[dict] = mapped_column(JSON)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(String(255))

def log_action_to_db(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: int | None,
    user: User | None,
    details: dict | None,
    success: bool,
    request: Request,
):
    """Log a la tabla de auditoría + archivo."""
    audit_entry = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user.id if user else None,
        details=details or {},
        success=success,
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(audit_entry)
    db.commit()
```

---

## 5.7 RESUMEN: SEGURIDAD

| Área | Estado | Críticas |
|------|--------|----------|
| Password Hashing | ✅ Excelente | 0 |
| JWT | ⚠️ Bueno | 3 |
| RBAC | ⚠️ Básico | 4 |
| Configuration | ⚠️ Aceptable | 3 |
| File Upload | ❌ Débil | **9** |
| Rate Limiting | ⚠️ Minimal | 2 |
| Audit Logging | ✅ Bueno | 1 |
| Security Headers | ⚠️ Básico | 4 |
| **TOTAL CRÍTICAS** | | **26** |

---

# 6. ESTADÍSTICAS GENERALES DEL CÓDIGO

```
Métrica                        Valor
─────────────────────────────────────────
Archivos Python                56
Líneas de código total         4,498
Modelos de datos              13
Routers/Endpoints            ~40+
Enums definidos               18
Validaciones Pydantic          7 schemas

Modelos con timestamps          8 de 13 (62%)
Modelos con auditoría           3 de 13 (23%)
Modelos con índices             10 de 13 (77%)
Modelos con enums              11 de 13 (85%)

Endpoints con auth             Todos
Endpoints con role-based       ~80%
Endpoints con rate-limiting    1 de 40+ (2%)

Cobertura de tests            0% (no hay tests)
```

---

# 7. LISTA DE MEJORAS CLASIFICADAS POR PRIORIDAD

## CRÍTICAS (Implementar ANTES de producción)

1. **Integración real con router/firewall para control de internet**
   - Sin esto, la suspensión es cosmética
   - Ubicación: `/app/routers/internet_control.py`

2. **Validación de contenido de archivos (magic bytes)**
   - Riesgo de inyección de código
   - Ubicación: `/app/routers/media.py`

3. **Lectura de archivos en chunks (no en memoria)**
   - DoS vulnerability
   - Ubicación: `/app/routers/media.py`

4. **RBAC completo (Permission Matrix)**
   - Falta granularidad
   - Ubicación: `/app/core/security.py`

5. **Duplicación de configuración (config.py vs settings.py)**
   - Eliminar uno, mantener consistencia
   - Ubicación: `/app/core/`

---

## ALTAS (Implementar dentro de 1-2 semanas)

1. **Agregar auditoría a BD (tabla audit_logs)**
2. **Validación de Refresh Tokens**
3. **Token Blacklist para Logout**
4. **Compresión y thumbnails de imágenes**
5. **Escaneo de virus (ClamAV)**
6. **Cuota de almacenamiento por usuario**
7. **Background task para actualizar tasas de cambio**
8. **Cache Redis para exchange rates**
9. **Validación de campos faltantes en modelos**
10. **Indices compuestos para optimización**

---

## MEDIAS (Nice-to-have)

1. **Cleanups de datos antiguos (retention policy)**
2. **Soft deletes en algunos modelos**
3. **API rate limiting completo**
4. **Partition temporal de NetworkActivity**
5. **Two-factor authentication (2FA)**
6. **API Documentation (OpenAPI mejorado)**
7. **Test coverage (pytest)**
8. **Kubernetes secrets integration**

---

# 8. CONCLUSIONES

## Estado General
- **Arquitectura**: ✅ Bien diseñada, modular
- **Modelos**: ✅ Completos y relaciones apropiadas
- **API**: ✅ Endpoints lógicos y bien organizados
- **Seguridad**: ⚠️ Básica, necesita fortalecimiento
- **Producción**: ❌ Requiere fixes antes de deployar

## Puntos Fuertes
1. Sistema multimoneda implementado correctamente
2. Modelos de datos bien pensados
3. Logging estructurado
4. JWT + bcrypt para auth
5. CORS configurable
6. Arquitectura modular y escalable

## Puntos Débiles
1. Integración con hardware (router) no implementada
2. Seguridad de archivos es débil
3. Rate limiting insuficiente
4. RBAC muy simple
5. Sin tests
6. Auditoría solo en logs (no en BD)
7. Sin caché implementado
8. Datos históricos no se limpian

## Recomendaciones Finales

1. **ANTES de producción**:
   - Fix críticos de seguridad en carga de archivos
   - Implementar integración con router
   - Completar RBAC
   - Agregar tests básicos

2. **DENTRO de 1 mes**:
   - Auditoría en BD
   - Caching con Redis
   - Limpieza automática de datos
   - Rate limiting completo

3. **LARGO PLAZO**:
   - 2FA
   - ML para detección de anomalías
   - Migración a microservicios
   - Mobile app nativa

---

*Análisis completado: 2025-11-11*
*Siguiente revisión recomendada: 2025-12-01*

