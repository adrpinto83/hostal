# app/models/__init__.py
"""
Modelos de base de datos del sistema Hostal.
"""

# Modelos principales
from .device import Device
from .guest import Guest
from .maintenance import Maintenance, MaintenancePriority, MaintenanceStatus, MaintenanceType
from .network_activity import ActivityType, NetworkActivity
from .occupancy import Occupancy
from .reservation import Period, Reservation, ReservationStatus
from .room import Room, RoomStatus, RoomType
from .room_rate import RoomRate
from .staff import Staff, StaffRole, StaffStatus
from .user import User

__all__ = [
    # Core models
    "User",
    "Guest",
    "Room",
    "RoomType",
    "RoomStatus",
    "RoomRate",
    "Reservation",
    "ReservationStatus",
    "Period",
    "Device",
    # Staff and operations
    "Staff",
    "StaffRole",
    "StaffStatus",
    "Occupancy",
    "Maintenance",
    "MaintenanceType",
    "MaintenanceStatus",
    "MaintenancePriority",
    # Network control
    "NetworkActivity",
    "ActivityType",
]
