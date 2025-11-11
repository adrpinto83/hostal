# app/routers/internet_control.py
"""
Endpoints para control de acceso a internet de dispositivos.
Permite suspender/reanudar el servicio de internet por dispositivo o por huésped.
Incluye seguimiento de actividad de red y reportes de ancho de banda.
"""
import structlog
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from ..core.audit import log_action
from ..core.db import get_db
from ..core.network import notify_router_block, notify_router_unblock
from ..core.security import get_current_user, require_roles
from ..models.device import Device
from ..models.guest import Guest
from ..models.network_activity import ActivityType, NetworkActivity
from ..models.user import User
from ..schemas.device import DeviceOut

router = APIRouter(prefix="/internet-control", tags=["Internet Control"])
log = structlog.get_logger()


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

    # Registrar actividad de red
    activity = NetworkActivity(
        device_id=device_id,
        guest_id=device.guest_id,
        activity_type=ActivityType.blocked,
        timestamp=datetime.utcnow(),
        initiated_by_system=False,  # Manual suspension
        notes=f"Suspended by {current_user.email}: {reason or 'No reason provided'}"
    )
    db.add(activity)

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

    # Integración con router/firewall para bloquear MAC
    try:
        notify_router_block(device.mac)
        log.info("router_block_success", device_id=device_id, mac=device.mac)
    except Exception as e:
        log.error("router_block_failed", device_id=device_id, mac=device.mac, error=str(e))

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

    # Registrar actividad de red
    activity = NetworkActivity(
        device_id=device_id,
        guest_id=device.guest_id,
        activity_type=ActivityType.unblocked,
        timestamp=datetime.utcnow(),
        initiated_by_system=False,  # Manual resumption
        notes=f"Resumed by {current_user.email}"
    )
    db.add(activity)

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

    # Integración con router/firewall para desbloquear MAC
    try:
        notify_router_unblock(device.mac)
        log.info("router_unblock_success", device_id=device_id, mac=device.mac)
    except Exception as e:
        log.error("router_unblock_failed", device_id=device_id, mac=device.mac, error=str(e))

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
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    online_devices = db.query(Device).filter(Device.last_seen >= cutoff).count()

    return {
        "total_devices": total_devices,
        "active_devices": active_devices,
        "suspended_devices": suspended_devices,
        "online_devices": online_devices,
        "offline_devices": active_devices - online_devices,
    }


@router.get(
    "/bandwidth/summary",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Resumen de uso de ancho de banda",
    description="Obtiene estadísticas de uso de ancho de banda por dispositivos y huéspedes.",
)
def get_bandwidth_summary(
    days: int = Query(7, ge=1, le=90, description="Días a consultar (1-90)"),
    db: Session = Depends(get_db),
):
    """Obtiene resumen de uso de ancho de banda."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Uso total en el período
    total_stats = db.query(
        func.sum(Device.total_bytes_downloaded).label('total_downloaded'),
        func.sum(Device.total_bytes_uploaded).label('total_uploaded')
    ).first()

    total_downloaded = total_stats.total_downloaded or 0
    total_uploaded = total_stats.total_uploaded or 0
    total_bytes = total_downloaded + total_uploaded

    # Top 10 dispositivos por consumo
    top_devices = db.query(
        Device.id,
        Device.mac,
        Device.name,
        Device.guest_id,
        (Device.total_bytes_downloaded + Device.total_bytes_uploaded).label('total_usage')
    ).order_by(
        (Device.total_bytes_downloaded + Device.total_bytes_uploaded).desc()
    ).limit(10).all()

    # Actividad de red reciente
    recent_activity = db.query(
        func.sum(NetworkActivity.bytes_downloaded).label('downloaded'),
        func.sum(NetworkActivity.bytes_uploaded).label('uploaded')
    ).filter(
        NetworkActivity.timestamp >= cutoff
    ).first()

    recent_downloaded = recent_activity.downloaded or 0
    recent_uploaded = recent_activity.uploaded or 0

    return {
        "period_days": days,
        "total_usage": {
            "bytes": total_bytes,
            "mb": round(total_bytes / (1024 * 1024), 2),
            "gb": round(total_bytes / (1024 * 1024 * 1024), 2),
            "downloaded_gb": round(total_downloaded / (1024 * 1024 * 1024), 2),
            "uploaded_gb": round(total_uploaded / (1024 * 1024 * 1024), 2),
        },
        "recent_usage": {
            "downloaded_gb": round(recent_downloaded / (1024 * 1024 * 1024), 2),
            "uploaded_gb": round(recent_uploaded / (1024 * 1024 * 1024), 2),
            "total_gb": round((recent_downloaded + recent_uploaded) / (1024 * 1024 * 1024), 2),
        },
        "top_devices": [
            {
                "device_id": d.id,
                "mac": d.mac,
                "name": d.name,
                "guest_id": d.guest_id,
                "usage_gb": round(d.total_usage / (1024 * 1024 * 1024), 2),
            }
            for d in top_devices
        ]
    }


@router.get(
    "/devices/{device_id}/bandwidth",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Historial de ancho de banda de un dispositivo",
    description="Obtiene el historial detallado de uso de ancho de banda de un dispositivo específico.",
)
def get_device_bandwidth(
    device_id: int,
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Obtiene historial de ancho de banda de un dispositivo."""
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    cutoff = datetime.utcnow() - timedelta(days=days)

    # Actividad de red en el período
    activities = db.query(NetworkActivity).filter(
        NetworkActivity.device_id == device_id,
        NetworkActivity.timestamp >= cutoff
    ).order_by(NetworkActivity.timestamp.desc()).all()

    return {
        "device_id": device_id,
        "mac": device.mac,
        "name": device.name,
        "guest_id": device.guest_id,
        "period_days": days,
        "total_usage": {
            "downloaded_gb": device.total_usage_gb if hasattr(device, 'total_bytes_downloaded') else 0,
            "uploaded_gb": round(device.total_bytes_uploaded / (1024 * 1024 * 1024), 2),
            "total_gb": device.total_usage_gb,
        },
        "activities": [
            {
                "timestamp": act.timestamp.isoformat(),
                "type": act.activity_type.value,
                "downloaded_mb": round((act.bytes_downloaded or 0) / (1024 * 1024), 2),
                "uploaded_mb": round((act.bytes_uploaded or 0) / (1024 * 1024), 2),
                "ip_address": act.ip_address,
                "notes": act.notes,
            }
            for act in activities[:50]  # Últimas 50 actividades
        ]
    }


@router.get(
    "/guests/{guest_id}/bandwidth",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Ancho de banda total de un huésped",
    description="Obtiene el uso total de ancho de banda de todos los dispositivos de un huésped.",
)
def get_guest_bandwidth(
    guest_id: int,
    days: int = Query(30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Obtiene uso de ancho de banda de todos los dispositivos de un huésped."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    devices = db.query(Device).filter(Device.guest_id == guest_id).all()

    if not devices:
        return {
            "guest_id": guest_id,
            "guest_name": guest.full_name,
            "total_devices": 0,
            "total_usage_gb": 0,
            "devices": []
        }

    total_downloaded = sum(d.total_bytes_downloaded for d in devices)
    total_uploaded = sum(d.total_bytes_uploaded for d in devices)

    return {
        "guest_id": guest_id,
        "guest_name": guest.full_name,
        "total_devices": len(devices),
        "total_usage": {
            "downloaded_gb": round(total_downloaded / (1024 * 1024 * 1024), 2),
            "uploaded_gb": round(total_uploaded / (1024 * 1024 * 1024), 2),
            "total_gb": round((total_downloaded + total_uploaded) / (1024 * 1024 * 1024), 2),
        },
        "devices": [
            {
                "device_id": d.id,
                "mac": d.mac,
                "name": d.name,
                "is_online": d.is_online,
                "suspended": d.suspended,
                "usage_gb": d.total_usage_gb,
            }
            for d in devices
        ]
    }


@router.get(
    "/activity/recent",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Actividad de red reciente",
    description="Obtiene el historial reciente de actividad de red (conexiones, suspensiones, etc.).",
)
def get_recent_network_activity(
    hours: int = Query(24, ge=1, le=168, description="Horas a consultar (1-168)"),
    activity_type: Optional[str] = Query(None, description="Filtrar por tipo de actividad"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Obtiene actividad de red reciente."""
    cutoff = datetime.utcnow() - timedelta(hours=hours)

    query = db.query(NetworkActivity).filter(
        NetworkActivity.timestamp >= cutoff
    )

    if activity_type:
        try:
            activity_enum = ActivityType(activity_type)
            query = query.filter(NetworkActivity.activity_type == activity_enum)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid activity type. Valid types: {[t.value for t in ActivityType]}"
            )

    activities = query.order_by(NetworkActivity.timestamp.desc()).limit(limit).all()

    return {
        "period_hours": hours,
        "activity_type_filter": activity_type,
        "count": len(activities),
        "activities": [
            {
                "id": act.id,
                "device_id": act.device_id,
                "guest_id": act.guest_id,
                "type": act.activity_type.value,
                "timestamp": act.timestamp.isoformat(),
                "ip_address": act.ip_address,
                "bytes_downloaded": act.bytes_downloaded,
                "bytes_uploaded": act.bytes_uploaded,
                "total_mb": act.total_mb,
                "initiated_by_system": act.initiated_by_system,
                "notes": act.notes,
            }
            for act in activities
        ]
    }
