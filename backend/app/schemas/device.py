from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field  # 1. Importa ConfigDict

MAC = Annotated[str, Field(pattern=r"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$")]


class DeviceCreate(BaseModel):
    mac: MAC
    name: Optional[str] = None
    vendor: Optional[str] = None


class DeviceOut(BaseModel):
    id: int
    guest_id: Optional[int] = None
    staff_id: Optional[int] = None
    mac: MAC
    name: Optional[str]
    vendor: Optional[str]
    allowed: bool
    suspended: bool = False
    suspension_reason: Optional[str] = None
    auto_suspended: bool = False
    auto_suspension_reason: Optional[str] = None
    auto_suspension_date: Optional[datetime] = None
    is_online: bool
    can_access_internet: bool
    last_seen: Optional[datetime] = None
    last_ip: Optional[str] = None
    total_bytes_downloaded: int = 0
    total_bytes_uploaded: int = 0

    # 2. Reemplaza la clase Config
    model_config = ConfigDict(from_attributes=True)


class DeviceSummary(BaseModel):
    id: int
    guest_id: int
    guest_name: Optional[str]
    mac: MAC
    name: Optional[str]
    vendor: Optional[str]
    allowed: bool
    suspended: bool
    suspension_reason: Optional[str]
    is_online: bool
    can_access_internet: bool
    last_seen: Optional[datetime]
    last_ip: Optional[str]
    total_bytes_downloaded: int
    total_bytes_uploaded: int

    model_config = ConfigDict(from_attributes=True)
