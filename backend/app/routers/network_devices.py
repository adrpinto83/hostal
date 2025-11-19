# app/routers/network_devices.py
"""
Rutas para gestión de dispositivos de red e integración de control de internet.
"""
from typing import List, Optional
from datetime import datetime
import uuid
from sqlalchemy import select, and_
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..core.db import get_db
from ..models import (
    NetworkDevice,
    Guest,
    Device,
    DeviceBrand,
    DeviceType,
    ConnectionStatus,
)
from ..schemas.network_device import (
    NetworkDeviceCreate,
    NetworkDeviceUpdate,
    NetworkDeviceOut,
    NetworkDeviceListOut,
    NetworkDeviceTestConnection,
)
from ..core.security import get_current_user
from ..services.network_integrations import (
    NetworkIntegrationBase,
    UbiquitiIntegration,
    MikrotikIntegration,
    CiscoIntegration,
)

router = APIRouter(tags=["Network Devices"])


def get_integration(device: NetworkDevice, db: Session) -> NetworkIntegrationBase:
    """
    Obtiene la integración correcta según la marca del dispositivo.
    """
    integrations = {
        DeviceBrand.UBIQUITI: UbiquitiIntegration,
        DeviceBrand.MIKROTIK: MikrotikIntegration,
        DeviceBrand.CISCO: CiscoIntegration,
    }

    integration_class = integrations.get(device.brand)
    if not integration_class:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=f"Integración para {device.brand.value} no disponible"
        )

    return integration_class(device, db)


# ===================== NETWORK DEVICES =====================


@router.post("/network-devices/", response_model=NetworkDeviceOut, status_code=status.HTTP_201_CREATED)
async def create_network_device(
    data: NetworkDeviceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Registra un nuevo dispositivo de red."""
    # Validar que IP sea única
    existing = db.query(NetworkDevice).filter(
        NetworkDevice.ip_address == data.ip_address
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un dispositivo con esa IP"
        )

    # Crear dispositivo con valores explícitos
    data_dict = data.model_dump()
    device = NetworkDevice(
        name=data_dict.get("name"),
        description=data_dict.get("description"),
        brand=data_dict.get("brand"),
        device_type=data_dict.get("device_type"),
        ip_address=data_dict.get("ip_address"),
        mac_address=data_dict.get("mac_address"),
        network_interface=data_dict.get("network_interface"),
        auth_type=data_dict.get("auth_type"),
        username=data_dict.get("username"),
        password=data_dict.get("password"),
        api_key=data_dict.get("api_key"),
        api_secret=data_dict.get("api_secret"),
        certificate_path=data_dict.get("certificate_path"),
        port=data_dict.get("port", 22),
        use_ssl=data_dict.get("use_ssl", True),
        verify_ssl=data_dict.get("verify_ssl", True),
        timeout_seconds=data_dict.get("timeout_seconds", 30),
        supports_mac_blocking=data_dict.get("supports_mac_blocking", True),
        supports_bandwidth_control=data_dict.get("supports_bandwidth_control", False),
        supports_vlan=data_dict.get("supports_vlan", False),
        supports_firewall_rules=data_dict.get("supports_firewall_rules", False),
        supports_traffic_shaping=data_dict.get("supports_traffic_shaping", False),
        vendor_config=data_dict.get("vendor_config"),
        created_by=current_user.id,
        connection_status=ConnectionStatus.DISCONNECTED
    )

    db.add(device)
    db.commit()
    db.refresh(device)

    return device


@router.get("/network-devices/", response_model=List[NetworkDeviceListOut])
async def list_network_devices(
    is_active: Optional[bool] = Query(None),
    brand: Optional[DeviceBrand] = Query(None),
    device_type: Optional[DeviceType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lista dispositivos de red con filtros."""
    query = db.query(NetworkDevice)

    if is_active is not None:
        query = query.filter(NetworkDevice.is_active == is_active)

    if brand:
        query = query.filter(NetworkDevice.brand == brand)

    if device_type:
        query = query.filter(NetworkDevice.device_type == device_type)

    devices = query.offset(skip).limit(limit).all()
    return devices


@router.get("/network-devices/{device_id}", response_model=NetworkDeviceOut)
async def get_network_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtiene detalles de un dispositivo de red."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )

    return device


@router.patch("/network-devices/{device_id}", response_model=NetworkDeviceOut)
async def update_network_device(
    device_id: int,
    data: NetworkDeviceUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Actualiza un dispositivo de red."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    db.commit()
    db.refresh(device)

    return device


@router.delete("/network-devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Elimina un dispositivo de red."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )

    db.delete(device)
    db.commit()

    return None


@router.post("/network-devices/{device_id}/test-connection", response_model=NetworkDeviceTestConnection)
async def test_network_device_connection(
    device_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Prueba la conexión con un dispositivo de red."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == device_id).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado"
        )

    integration = get_integration(device, db)
    is_connected, message, response_time = await integration.test_connection()

    result = NetworkDeviceTestConnection(
        device_id=device_id,
        is_connected=is_connected,
        status=device.connection_status,
        message=message,
        timestamp=datetime.utcnow().isoformat(),
        response_time_ms=response_time
    )

    return result


# ===================== MAC BLOCKING =====================


@router.post("/internet-control/block-by-mac")
async def block_mac_address(
    mac_address: str = Query(..., description="MAC a bloquear"),
    network_device_id: int = Query(..., description="ID del dispositivo de red"),
    reason: Optional[str] = Query(None),
    duration_minutes: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Bloquea una dirección MAC en el dispositivo de red."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == network_device_id).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo de red no encontrado"
        )

    # Crear ticket de bloqueo
    ticket_number = f"TICKET-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    ticket = UsageTicket(
        ticket_number=ticket_number,
        title=f"Bloqueo de MAC {mac_address}",
        ticket_type=TicketType.BLOCK,
        status=TicketStatus.PENDING,
        priority=TicketPriority.HIGH,
        mac_address=mac_address,
        network_device_id=network_device_id,
        action_type="block",
        action_status=ActionStatus.PENDING,
        created_by=current_user.id,
        reason=reason,
        duration_minutes=duration_minutes,
        is_temporary=duration_minutes is not None,
        scheduled_action_time=None
    )

    db.add(ticket)
    db.commit()

    # Intentar bloquear
    integration = get_integration(device, db)
    success, message = await integration.block_mac(mac_address, reason)

    if success:
        ticket.action_status = ActionStatus.SUCCESS
        ticket.status = TicketStatus.RESOLVED
        ticket.action_executed_at = datetime.utcnow()
        ticket.resolved_at = datetime.utcnow()
        ticket.resolution_notes = f"MAC bloqueada exitosamente en {device.name}"
    else:
        ticket.action_status = ActionStatus.FAILED
        ticket.error_message = message

    db.commit()

    return {
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "success": success,
        "message": message
    }


@router.post("/internet-control/unblock-by-mac")
async def unblock_mac_address(
    mac_address: str = Query(...),
    network_device_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Desbloquea una dirección MAC."""
    device = db.query(NetworkDevice).filter(NetworkDevice.id == network_device_id).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo de red no encontrado"
        )

    # Crear ticket de desbloqueo
    ticket_number = f"TICKET-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    ticket = UsageTicket(
        ticket_number=ticket_number,
        title=f"Desbloqueo de MAC {mac_address}",
        ticket_type=TicketType.UNBLOCK,
        status=TicketStatus.PENDING,
        priority=TicketPriority.MEDIUM,
        mac_address=mac_address,
        network_device_id=network_device_id,
        action_type="unblock",
        action_status=ActionStatus.PENDING,
        created_by=current_user.id
    )

    db.add(ticket)
    db.commit()

    # Intentar desbloquear
    integration = get_integration(device, db)
    success, message = await integration.unblock_mac(mac_address)

    if success:
        ticket.action_status = ActionStatus.SUCCESS
        ticket.status = TicketStatus.RESOLVED
        ticket.action_executed_at = datetime.utcnow()
        ticket.resolved_at = datetime.utcnow()
    else:
        ticket.action_status = ActionStatus.FAILED
        ticket.error_message = message

    db.commit()

    return {
        "ticket_id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "success": success,
        "message": message
    }
