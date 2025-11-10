# 🌐 Sistema de Control de Internet y Gestión Integral del Hostal

**Versión**: 2.0.0
**Fecha**: 2025-11-10
**Enfoque**: Venezuela - Control de Internet + Gestión Operativa

---

## 🎯 **NUEVAS FUNCIONALIDADES IMPLEMENTADAS**

### 1. **CONTROL COMPLETO DE INTERNET** 🔐

#### Modelos Implementados

##### `Device` (Mejorado)
Dispositivos de huéspedes con control total de internet:
- ✅ **Suspensión manual** de internet por dispositivo
- ✅ **Cuotas de datos** (diario/mensual en MB)
- ✅ **Tracking de uso** (bytes descargados/subidos)
- ✅ **Estado online/offline** (última conexión)
- ✅ **Razón de suspensión** documentada
- ✅ **Propiedades calculadas**: `is_online`, `can_access_internet`, `total_usage_mb/gb`

```python
# Ejemplo de uso
device.suspended = True
device.suspension_reason = "Exceso de consumo"
device.total_usage_gb  # Retorna consumo en GB
device.is_online  # True si visto en últimos 5 min
```

##### `NetworkActivity` (Nuevo)
Log completo de actividad de red:
- 📊 Tipos: `connected`, `disconnected`, `blocked`, `unblocked`, `quota_exceeded`
- 📈 Estadísticas: bytes up/down, duración de sesión, IP asignada
- 🔍 Auditoría completa de conexiones
- 📅 Timestamp de cada evento

#### Endpoints de Control `/api/v1/internet-control`

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/devices/{id}/suspend` | POST | Suspender internet de un dispositivo |
| `/devices/{id}/resume` | POST | Reanudar internet de un dispositivo |
| `/guests/{id}/suspend-all` | POST | Suspender TODOS los dispositivos de un huésped |
| `/guests/{id}/resume-all` | POST | Reanudar TODOS los dispositivos de un huésped |
| `/status` | GET | Resumen de estado de internet (total, activos, suspendidos, online) |

#### Características de Control

✅ **Suspensión Individual**
```bash
POST /api/v1/internet-control/devices/123/suspend
{
  "reason": "Incumplimiento de normas del hostal"
}
```

✅ **Suspensión Masiva por Huésped**
```bash
POST /api/v1/internet-control/guests/5/suspend-all
{
  "reason": "Check-out - suspender acceso"
}
```

✅ **Dashboard de Estado**
```bash
GET /api/v1/internet-control/status
Response:
{
  "total_devices": 45,
  "active_devices": 40,
  "suspended_devices": 5,
  "online_devices": 28,
  "offline_devices": 12
}
```

---

### 2. **GESTIÓN DE HABITACIONES MEJORADA** 🏨

#### `RoomStatus` (Enum)
Estados operativos de habitaciones:
- `available` - Disponible para reservar
- `occupied` - Ocupada por huésped
- `cleaning` - En proceso de limpieza
- `maintenance` - En mantenimiento
- `out_of_service` - Fuera de servicio

#### Modelo `Room` (Actualizado)
```python
room.status = RoomStatus.cleaning
room.occupancies  # Lista de todas las ocupaciones
room.maintenances  # Historial de mantenimiento
```

---

### 3. **SISTEMA DE OCUPACIONES (Check-in/Check-out)** 📋

#### Modelo `Occupancy`
Registro real de ocupación de habitaciones:
- ✅ Check-in automático con timestamp
- ✅ Check-out opcional (null si aún ocupado)
- ✅ Vinculación con Reserva (o walk-in)
- ✅ **Pagos multi-moneda**: Bolívares (Bs) y Dólares (USD)
- ✅ Métodos de pago Venezuela: efectivo, transferencia, Zelle, PayPal, etc.
- ✅ Propiedades calculadas: `is_active`, `duration_hours`

```python
occupancy = Occupancy(
    room_id=101,
    guest_id=25,
    check_in=datetime.now(),
    amount_paid_bs=500.00,  # Bolívares
    amount_paid_usd=15.00,  # Dólares
    payment_method="transferencia"
)
```

---

### 4. **GESTIÓN DE PERSONAL** 👥

#### Modelo `Staff`
Personal del hostal con roles específicos:
- **Roles**: `receptionist`, `cleaner`, `maintenance`, `manager`, `security`
- **Estados**: `active`, `inactive`, `on_leave`, `terminated`
- ✅ Cédula venezolana (document_id único)
- ✅ Control de acceso al panel admin
- ✅ Asignación a tareas de mantenimiento

```python
staff = Staff(
    full_name="María González",
    document_id="V-12345678",  # Formato venezolano
    role=StaffRole.cleaner,
    status=StaffStatus.active
)
```

---

### 5. **SISTEMA DE MANTENIMIENTO** 🔧

#### Modelo `Maintenance`
Gestión completa de tareas de mantenimiento:

##### Tipos de Mantenimiento
- `cleaning` - Limpieza regular
- `deep_cleaning` - Limpieza profunda
- `plumbing` - Plomería
- `electrical` - Eléctrico
- `carpentry` - Carpintería
- `painting` - Pintura
- `air_conditioning` - Aire acondicionado
- `furniture` - Muebles
- `other` - Otro

##### Estados y Prioridades
- Estados: `pending`, `in_progress`, `completed`, `cancelled`
- Prioridades: `low`, `medium`, `high`, `urgent`

##### Características
- ✅ Asignación de personal
- ✅ Tracking de tiempos (reported → started → completed)
- ✅ Cálculo automático de duración
- ✅ Detección de tareas atrasadas (`is_overdue`)
- ✅ Reportes de quién lo reportó

```python
maintenance = Maintenance(
    room_id=205,
    staff_id=10,
    type=MaintenanceType.air_conditioning,
    priority=MaintenancePriority.urgent,
    description="Aire acondicionado no enfría",
    reported_by="Huésped Habitación 205"
)
```

---

## 📊 **ESQUEMA DE BASE DE DATOS**

### Nuevas Tablas

```sql
-- Staff (Personal)
staff
  - id, full_name, document_id (unique)
  - role, status
  - phone, email
  - can_access_admin, notes

-- Occupancy (Ocupaciones)
occupancies
  - id, room_id, guest_id, reservation_id
  - check_in, check_out
  - amount_paid_bs, amount_paid_usd
  - payment_method, notes

-- Maintenance (Mantenimiento)
maintenances
  - id, room_id, staff_id
  - type, status, priority
  - reported_at, started_at, completed_at
  - description, notes, reported_by

-- Network Activity (Logs de Red)
network_activities
  - id, device_id, guest_id
  - activity_type, timestamp
  - ip_address
  - bytes_downloaded, bytes_uploaded
  - session_duration_seconds
  - initiated_by_system, notes
```

### Tablas Modificadas

```sql
-- Rooms (Habitaciones) - Agregado status
rooms
  + status ENUM(available, occupied, cleaning, maintenance, out_of_service)

-- Devices (Dispositivos) - Campos de control de internet
devices
  + suspended BOOLEAN
  + suspension_reason TEXT
  + daily_quota_mb BIGINT
  + monthly_quota_mb BIGINT
  + first_seen TIMESTAMP
  + last_seen TIMESTAMP
  + last_ip VARCHAR(45)
  + total_bytes_downloaded BIGINT
  + total_bytes_uploaded BIGINT
```

---

## 🚀 **CASOS DE USO IMPLEMENTADOS**

### Caso 1: Check-in de Huésped
```python
# 1. Crear ocupación
occupancy = Occupancy(
    room_id=101,
    guest_id=guest.id,
    reservation_id=reservation.id,
    amount_paid_bs=1500.00,
    payment_method="transferencia"
)

# 2. Actualizar estado de habitación
room.status = RoomStatus.occupied

# 3. Activar dispositivos del huésped
for device in guest.devices:
    device.allowed = True
    device.suspended = False
```

### Caso 2: Suspender Internet por Incumplimiento
```python
# Suspender todos los dispositivos de un huésped
POST /api/v1/internet-control/guests/{guest_id}/suspend-all
{
  "reason": "Violación de términos de servicio - uso excesivo"
}

# Auditoría automática registrada
# Dispositivos bloqueados en firewall (requiere integración)
```

### Caso 3: Mantenimiento de Habitación
```python
# 1. Reportar problema
maintenance = Maintenance(
    room_id=205,
    type=MaintenanceType.plumbing,
    priority=MaintenancePriority.high,
    description="Fuga de agua en baño",
    reported_by="Recepción"
)

# 2. Cambiar estado de habitación
room.status = RoomStatus.maintenance

# 3. Asignar personal
maintenance.staff_id = plumber.id
maintenance.status = MaintenanceStatus.in_progress
maintenance.started_at = datetime.now()

# 4. Completar
maintenance.status = MaintenanceStatus.completed
maintenance.completed_at = datetime.now()
room.status = RoomStatus.available
```

### Caso 4: Check-out de Huésped
```python
# 1. Registrar check-out
occupancy.check_out = datetime.now()

# 2. Suspender internet
POST /api/v1/internet-control/guests/{guest_id}/suspend-all

# 3. Programar limpieza
cleaning = Maintenance(
    room_id=room.id,
    type=MaintenanceType.cleaning,
    priority=MaintenancePriority.medium,
    description="Limpieza post check-out"
)
room.status = RoomStatus.cleaning

# 4. Después de limpieza
cleaning.status = MaintenanceStatus.completed
room.status = RoomStatus.available
```

---

## 💡 **VENTAJAS ESPECÍFICAS PARA VENEZUELA**

### 1. **Multi-Moneda**
- Pagos en Bolívares (Bs) y Dólares (USD)
- Campos separados para tracking independiente
- Reportes por moneda

### 2. **Métodos de Pago Locales**
- Efectivo
- Transferencia bancaria
- Pago móvil
- Zelle (muy común en Venezuela)
- PayPal
- Binance/criptomonedas

### 3. **Formato de Documentos**
- Cédula venezolana: `V-12345678` o `E-12345678`
- Validación de formato incluida en schemas

### 4. **Control de Internet Granular**
- Suspensión individual o masiva
- Cuotas de datos configurables
- Ideal para hostales con internet limitado

---

## 🔮 **PRÓXIMAS MEJORAS RECOMENDADAS**

### Fase 2 (Corto Plazo)
1. ✅ Routers completos para Staff, Occupancy, Maintenance
2. ✅ Endpoints de reportes dinámicos
3. ✅ Dashboard administrativo con KPIs
4. ✅ Integración real con routers (pfSense, MikroTik, UniFi)
5. ✅ Sistema de notificaciones (WhatsApp, Telegram)

### Fase 3 (Medio Plazo)
1. ✅ Reportes PDF/Excel exportables
2. ✅ Gráficos de ocupación y consumo
3. ✅ Sistema de inventario
4. ✅ Gestión de proveedores
5. ✅ Control de gastos operativos

### Fase 4 (Largo Plazo)
1. ✅ App móvil para recepcionistas
2. ✅ Portal de autogestión para huéspedes
3. ✅ Integración con POS
4. ✅ IA para predicción de ocupación
5. ✅ Sistema de facturación electrónica (SENIAT)

---

## 📚 **DOCUMENTACIÓN TÉCNICA**

### Migración de Base de Datos
```bash
# Crear migración automática
alembic revision -m "add internet control and hostal management" --autogenerate

# Aplicar migración
alembic upgrade head
```

### Schemas Pydantic
Los schemas actualizados incluyen:
- `DeviceOut` con todos los campos de control
- `RoomOut` con estado y relaciones
- `StaffCreate/Out`
- `OccupancyCreate/Out`
- `MaintenanceCreate/Out`
- `NetworkActivityOut`

---

## ⚠️ **CONSIDERACIONES IMPORTANTES**

### Seguridad
1. ✅ Todos los endpoints requieren autenticación
2. ✅ Control de roles (admin/recepcionista)
3. ✅ Auditoría completa de acciones críticas
4. ✅ Logs de suspensión/reanudación de internet

### Performance
1. ⚠️ NetworkActivity puede crecer mucho - considerar particionamiento
2. ⚠️ Índices en campos de fechas y estados
3. ⚠️ Implementar limpieza de logs antiguos (>6 meses)

### Integración con Hardware
- Router/Firewall requiere API o script externo
- Métodos `notify_router_block()` y `notify_router_unblock()` son placeholders
- Considerar: pfSense (API REST), MikroTik (API), UniFi (Controller API)

---

## ✅ **RESUMEN EJECUTIVO**

**Implementado**:
- ✅ 5 nuevos modelos de datos
- ✅ 2 modelos extendidos (Room, Device)
- ✅ 1 router completo de control de internet
- ✅ Sistema completo de auditoría
- ✅ Base sólida para gestión integral del hostal
- ✅ Enfoque venezolano (multi-moneda, cédula, métodos de pago)

**Resultado**:
Un sistema robusto para control total de internet y operaciones del hostal, listo para producción con las integraciones de hardware pendientes.

---

**📞 Soporte**: Ver DEPLOYMENT.md para guía de producción
**📖 API Docs**: http://localhost:8000/docs
