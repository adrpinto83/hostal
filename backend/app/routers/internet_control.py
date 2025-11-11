# app/routers/internet_control.py
"""
Endpoints para control de acceso a internet de dispositivos.
Permite suspender/reanudar el servicio de internet por dispositivo o por huésped.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.audit import log_action
from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.device import Device
from ..models.guest import Guest
from ..models.user import User
from ..schemas.device import DeviceOut

router = APIRouter(prefix="/internet-control", tags=["Internet Control"])


@router.post(
    "/devices/{device_id}/suspend",
    response_model=DeviceOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Suspender internet de un dispositivo",
    description="Bloquea el acceso a internet de un dispositivo específico. El dispositivo permanecerá en la lista pero sin acceso.",
)
def suspend_device_internet(
    device_id: int,
    reason: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suspende el acceso a internet de un dispositivo."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.suspended:
        raise HTTPException(status_code=400, detail="Device already suspended")

    device.suspended = True
    device.suspension_reason = reason or "Suspendido manualmente por administrador"

    # Auditoría
    log_action(
        "suspend_internet",
        "device",
        device_id,
        current_user,
        details={"mac": device.mac, "reason": reason, "guest_id": device.guest_id},
    )

    db.commit()
    db.refresh(device)

    # TODO: Integración real con router/firewall para bloquear MAC
    # notify_router_block(device.mac)

    return device


@router.post(
    "/devices/{device_id}/resume",
    response_model=DeviceOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Reanudar internet de un dispositivo",
    description="Restablece el acceso a internet de un dispositivo previamente suspendido.",
)
def resume_device_internet(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reanuda el acceso a internet de un dispositivo."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if not device.suspended:
        raise HTTPException(status_code=400, detail="Device not suspended")

    device.suspended = False
    device.suspension_reason = None

    # Auditoría
    log_action(
        "resume_internet",
        "device",
        device_id,
        current_user,
        details={"mac": device.mac, "guest_id": device.guest_id},
    )

    db.commit()
    db.refresh(device)

    # TODO: Integración real con router/firewall para desbloquear MAC
    # notify_router_unblock(device.mac)

    return device


@router.post(
    "/guests/{guest_id}/suspend-all",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Suspender internet de todos los dispositivos de un huésped",
    description="Bloquea el acceso a internet de todos los dispositivos asociados a un huésped.",
)
def suspend_guest_internet(
    guest_id: int,
    reason: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suspende el acceso a internet de todos los dispositivos de un huésped."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    devices = db.query(Device).filter(Device.guest_id == guest_id).all()

    if not devices:
        raise HTTPException(status_code=404, detail="Guest has no devices")

    suspended_count = 0
    for device in devices:
        if not device.suspended:
            device.suspended = True
            device.suspension_reason = reason or f"Suspendido junto con huésped {guest.full_name}"
            suspended_count += 1

    # Auditoría
    log_action(
        "suspend_internet_bulk",
        "guest",
        guest_id,
        current_user,
        details={
            "guest_name": guest.full_name,
            "devices_count": suspended_count,
            "reason": reason,
        },
    )

    db.commit()

    return {
        "message": f"Internet suspended for {suspended_count} devices",
        "guest_id": guest_id,
        "devices_affected": suspended_count,
    }


@router.post(
    "/guests/{guest_id}/resume-all",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Reanudar internet de todos los dispositivos de un huésped",
    description="Restablece el acceso a internet de todos los dispositivos de un huésped.",
)
def resume_guest_internet(
    guest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reanuda el acceso a internet de todos los dispositivos de un huésped."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    devices = db.query(Device).filter(Device.guest_id == guest_id).all()

    if not devices:
        raise HTTPException(status_code=404, detail="Guest has no devices")

    resumed_count = 0
    for device in devices:
        if device.suspended:
            device.suspended = False
            device.suspension_reason = None
            resumed_count += 1

    # Auditoría
    log_action(
        "resume_internet_bulk",
        "guest",
        guest_id,
        current_user,
        details={"guest_name": guest.full_name, "devices_count": resumed_count},
    )

    db.commit()

    return {
        "message": f"Internet resumed for {resumed_count} devices",
        "guest_id": guest_id,
        "devices_affected": resumed_count,
    }


@router.get(
    "/status",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Ver resumen del estado de internet",
    description="Obtiene estadísticas generales sobre el estado de acceso a internet.",
)
def get_internet_status(db: Session = Depends(get_db)):
    """Obtiene estadísticas del estado de internet."""
    total_devices = db.query(Device).count()
    suspended_devices = db.query(Device).filter(Device.suspended == True).count()  # noqa
    active_devices = total_devices - suspended_devices

    # Dispositivos online (vistos en los últimos 5 minutos)
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    online_devices = db.query(Device).filter(Device.last_seen >= cutoff).count()

    return {
        "total_devices": total_devices,
        "active_devices": active_devices,
        "suspended_devices": suspended_devices,
        "online_devices": online_devices,
        "offline_devices": active_devices - online_devices,
    }
