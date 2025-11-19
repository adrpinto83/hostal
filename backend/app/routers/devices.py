# app/routers/devices.py
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import require_roles
from ..models.device import Device
from ..models.guest import Guest
from ..schemas.device import DeviceCreate, DeviceOut
from ..services import devices as device_service

router = APIRouter(prefix="/guests/{guest_id}/devices", tags=["devices"])

# Additional router for device suspension management
devices_router = APIRouter(prefix="/devices", tags=["devices-management"])


@router.get(
    "/",
    response_model=List[DeviceOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar los dispositivos de un huésped",
)
def list_devices(guest_id: int, db: Session = Depends(get_db)):
    """Obtiene todos los dispositivos asociados a un huésped específico."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest.devices


@router.post(
    "/",
    response_model=DeviceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Añadir un dispositivo a un huésped",
    description="Registra un nuevo dispositivo para un huésped. La dirección MAC debe ser única.",
)
def add_device(guest_id: int, data: DeviceCreate, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    mac = data.mac.upper()
    exists = db.query(Device).filter(Device.mac == mac).first()
    if exists:
        raise HTTPException(status_code=400, detail="MAC already registered")

    device = Device(guest_id=guest_id, mac=mac, name=data.name, vendor=data.vendor, allowed=True)
    db.add(device)
    db.commit()
    db.refresh(device)

    try:
        from ..core.network import notify_whitelist_add

        notify_whitelist_add(mac, guest, device)
    except Exception:
        pass

    return device


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Eliminar un dispositivo de un huésped",
)
def delete_device(guest_id: int, device_id: int, db: Session = Depends(get_db)):
    """Elimina un dispositivo específico por su ID."""
    device = db.get(Device, device_id)
    if not device or device.guest_id != guest_id:
        raise HTTPException(status_code=404, detail="Device not found")

    mac = device.mac
    db.delete(device)
    db.commit()

    try:
        from ..core.network import notify_whitelist_remove

        notify_whitelist_remove(mac)
    except Exception:
        pass
    return


# ============ Endpoints para gestión de suspensión de dispositivos ============


class DeviceSuspendRequest(BaseModel):
    """Solicitud para suspender un dispositivo manualmente."""
    reason: str = Field(..., min_length=1, max_length=255, description="Razón de la suspensión")


class DeviceReactivateRequest(BaseModel):
    """Solicitud para reactivar un dispositivo."""
    notes: Optional[str] = Field(None, max_length=255, description="Notas sobre la reactivación")


class DeviceSuspensionStats(BaseModel):
    """Estadísticas de suspensión de dispositivos."""
    total_checked: int
    newly_suspended: int
    already_suspended: int
    reactivated: int
    errors: List[str]


@devices_router.post(
    "/{device_id}/suspend",
    response_model=DeviceOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Suspender dispositivo manualmente",
)
def suspend_device(
    device_id: int,
    request: DeviceSuspendRequest,
    db: Session = Depends(get_db),
):
    """
    Suspende manualmente un dispositivo.

    Uso:
    - Suspensión por comportamiento sospechoso
    - Suspensión temporal por solicitud del huésped
    - Suspensión temporal por política del hostal
    """
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.suspended:
        raise HTTPException(status_code=400, detail="Device is already suspended")

    device.suspended = True
    device.suspension_reason = request.reason

    db.add(device)
    db.commit()
    db.refresh(device)

    return device


@devices_router.post(
    "/{device_id}/reactivate",
    response_model=DeviceOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Reactivar dispositivo suspendido",
)
def reactivate_device(
    device_id: int,
    request: Optional[DeviceReactivateRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Reactiva un dispositivo que fue suspendido manualmente.

    Se puede reactivar incluso si hay razones de suspensión automática.
    El personal debe verificar que el dispositivo sea elegible para reactivar.
    """
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if not device.suspended:
        raise HTTPException(status_code=400, detail="Device is not suspended")

    device.suspended = False
    device.suspension_reason = None

    db.add(device)
    db.commit()
    db.refresh(device)

    return device


@devices_router.post(
    "/auto-suspend/check-all",
    response_model=DeviceSuspensionStats,
    dependencies=[Depends(require_roles("admin"))],
    summary="Verificar y suspender dispositivos automáticamente",
    description="Ejecuta el proceso de suspensión automática para todos los dispositivos basado en ocupancia y mora.",
)
def check_all_devices_auto_suspend(db: Session = Depends(get_db)):
    """
    Ejecuta un chequeo completo de todos los dispositivos.

    Suspende automáticamente dispositivos que:
    - No tienen ocupancia activa (huésped sin check-in)
    - Tienen huésped en mora (pagos pendientes)
    - Pertenecen a personal inactivo

    Reactiva dispositivos que ya no tienen razón para estar suspendidos.

    NOTA: Esta función debe ejecutarse periódicamente como tarea programada.
    """
    stats = device_service.check_and_suspend_all_devices(db)
    return DeviceSuspensionStats(**stats)


@devices_router.get(
    "/suspended/list",
    response_model=List[DeviceOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar dispositivos suspendidos",
)
def list_suspended_devices(
    include_auto_suspended: bool = True,
    include_manually_suspended: bool = True,
    guest_id: Optional[int] = None,
    staff_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Lista dispositivos suspendidos con opciones de filtrado.

    Parámetros:
    - include_auto_suspended: Incluir dispositivos suspendidos automáticamente
    - include_manually_suspended: Incluir dispositivos suspendidos manualmente
    - guest_id: Filtrar por ID de huésped (solo dispositivos de huésped)
    - staff_id: Filtrar por ID de personal (solo dispositivos de personal)
    """
    query = db.query(Device)

    # Construir condición de suspensión
    suspension_conditions = []
    if include_auto_suspended:
        suspension_conditions.append(Device.auto_suspended == True)
    if include_manually_suspended:
        suspension_conditions.append(Device.suspended == True)

    if suspension_conditions:
        from sqlalchemy import or_
        query = query.filter(or_(*suspension_conditions))

    if guest_id:
        query = query.filter(Device.guest_id == guest_id)

    if staff_id:
        query = query.filter(Device.staff_id == staff_id)

    return query.all()


@devices_router.get(
    "/{device_id}/suspension-reasons",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Obtener razones de suspensión automática",
)
def get_device_suspension_reasons(device_id: int, db: Session = Depends(get_db)):
    """
    Analiza un dispositivo específico y devuelve si debería ser suspendido
    automáticamente y por qué.

    Útil para depuración y auditoría del sistema de suspensión automática.
    """
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    reason = device_service.get_device_suspension_reason(db, device)
    should_suspend = device_service.should_suspend_device(db, device)

    return {
        "device_id": device.id,
        "mac": device.mac,
        "should_suspend": should_suspend,
        "auto_suspended": device.auto_suspended,
        "manually_suspended": device.suspended,
        "reason": reason,
        "guest_id": device.guest_id,
        "staff_id": device.staff_id,
    }
