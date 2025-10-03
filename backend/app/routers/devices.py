from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import require_roles
from ..models.device import Device
from ..models.guest import Guest
from ..schemas.device import DeviceCreate, DeviceOut

router = APIRouter(prefix="/guests/{guest_id}/devices", tags=["devices"])


@router.get(
    "/",
    response_model=List[DeviceOut],
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="List devices for a guest",
)
def list_devices(guest_id: int, db: Session = Depends(get_db)):
    """Retrieves all devices associated with a specific guest."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest.devices


@router.post(
    "/",
    response_model=DeviceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Add a device to a guest",
    description="Registers a new device (e.g., by MAC address) for a specific guest. The MAC address must be unique across all devices.",
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
    summary="Remove a device from a guest",
)
def delete_device(guest_id: int, device_id: int, db: Session = Depends(get_db)):
    """Deletes a specific device by its ID."""
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
