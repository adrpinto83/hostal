# app/models/__init__.py
"""
Modelos de base de datos del sistema Hostal.
"""

# Modelos principales
from .audit_log import AuditLog
from .device import Device
from .exchange_rate import ExchangeRate
from .guest import Guest
from .maintenance import Maintenance, MaintenancePriority, MaintenanceStatus, MaintenanceType
from .media import Media, MediaCategory, MediaType
from .network_activity import ActivityType, NetworkActivity
from .network_device import (
    NetworkDevice,
    DeviceBrand,
    DeviceType,
    ConnectionStatus,
    AuthType,
)
from .inventory import (
    InventoryCategory,
    InventoryItem,
    InventoryTransaction,
    InventoryTransactionType,
    MaintenanceInventoryUsage,
)
from .occupancy import Occupancy
from .payment import Currency, Payment, PaymentMethod, PaymentStatus
from .reservation import Period, Reservation, ReservationStatus
from .room import Room, RoomStatus, RoomType
from .room_rate import RoomRate
from .staff import Staff, StaffRole, StaffStatus
from .user import User
# NEW: Invoice and payment gateway models
from .invoice import Invoice, InvoiceStatus, InvoiceLine, InvoicePayment
from .financial_transaction import FinancialTransaction, TransactionType, TransactionStatus, PaymentGateway, ExchangeRateSnapshot

__all__ = [
    # Audit and logging
    "AuditLog",
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
    "NetworkDevice",
    "DeviceBrand",
    "DeviceType",
    "ConnectionStatus",
    "AuthType",
    # Inventory
    "InventoryCategory",
    "InventoryItem",
    "InventoryTransaction",
    "InventoryTransactionType",
    "MaintenanceInventoryUsage",
    # Payments and currency
    "Payment",
    "PaymentMethod",
    "PaymentStatus",
    "Currency",
    "ExchangeRate",
    # NEW: Invoicing and payment integration
    "Invoice",
    "InvoiceStatus",
    "InvoiceLine",
    "InvoicePayment",
    "FinancialTransaction",
    "TransactionType",
    "TransactionStatus",
    "PaymentGateway",
    "ExchangeRateSnapshot",
    # Media
    "Media",
    "MediaType",
    "MediaCategory",
]
