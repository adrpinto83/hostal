from pydantic import BaseModel, Field
from typing import Optional, Annotated

MAC = Annotated[
    str,
    Field(pattern=r"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$")
]

class DeviceCreate(BaseModel):
    mac: MAC
    name: Optional[str] = None
    vendor: Optional[str] = None

class DeviceOut(BaseModel):
    id: int
    mac: MAC
    name: Optional[str]
    vendor: Optional[str]
    allowed: bool

    class Config:
        from_attributes = True
