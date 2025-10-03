from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.db import get_db

# from ..core.security import require_roles # <--- 1. LÍNEA DE IMPORTACIÓN COMENTADA
from ..models.device import Device
from ..models.guest import Guest
from ..schemas.device import DeviceCreate, DeviceOut

router = APIRouter(prefix="/guests/{guest_id}/devices", tags=["devices"])


# List devices for a guest
@router.get(
    "/",
    response_model=List[DeviceOut],
    # dependencies=[Depends(require_roles("admin", "recepcionista"))], # <--- 2. DEPENDENCIA COMENTADA
)
def list_devices(guest_id: int, db: Session = Depends(get_db)):
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return guest.devices


# Add a device (register MAC)
@router.post(
    "/",
    response_model=DeviceOut,
    status_code=status.HTTP_201_CREATED,
    # dependencies=[Depends(require_roles("admin", "recepcionista"))], # <--- 3. DEPENDENCIA COMENTADA
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


# Remove device
@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    # dependencies=[Depends(require_roles("admin", "recepcionista"))], # <--- 4. DEPENDENCIA COMENTADA
)
def delete_device(guest_id: int, device_id: int, db: Session = Depends(get_db)):
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
