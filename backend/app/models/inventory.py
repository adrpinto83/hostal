# app/models/inventory.py
"""Modelos para el módulo de inventario vinculado a mantenimiento."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class InventoryCategory(str, Enum):
    """Clasificación de los activos/inventario."""
    EQUIPMENT = "equipment"
    CONSUMABLE = "consumable"
    CLEANING = "cleaning"
    PRODUCT = "product"
    SPARE_PART = "spare_part"
    OTHER = "other"


class InventoryTransactionType(str, Enum):
    """Tipo de transacción de inventario."""
    PURCHASE = "purchase"
    ADJUSTMENT = "adjustment"
    USAGE = "usage"
    TRANSFER = "transfer"


class InventoryItem(Base):
    """Item dentro del inventario del hostal."""
    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    sku: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    category: Mapped[InventoryCategory] = mapped_column(
        SAEnum(InventoryCategory, name="inventory_category", create_constraint=True),
        default=InventoryCategory.CONSUMABLE,
        server_default=InventoryCategory.CONSUMABLE.value,
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(String(32), default="unidad", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity_on_hand: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    min_stock: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cost_per_unit: Mapped[float | None] = mapped_column(Float, nullable=True)
    allow_negative_stock: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    transactions = relationship(
        "InventoryTransaction",
        back_populates="item",
        cascade="all, delete-orphan",
    )
    maintenance_usages = relationship(
        "MaintenanceInventoryUsage",
        back_populates="item",
        cascade="all, delete-orphan",
    )

    def adjust_stock(self, quantity: float) -> None:
        """Ajusta el stock disponible respetando si se permiten valores negativos."""
        new_total = (self.quantity_on_hand or 0) + quantity
        if not self.allow_negative_stock and new_total < 0:
            raise ValueError("No hay stock suficiente para completar la operación")
        self.quantity_on_hand = new_total


class InventoryTransaction(Base):
    """Registro de movimientos de inventario."""
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False
    )
    transaction_type: Mapped[InventoryTransactionType] = mapped_column(
        SAEnum(
            InventoryTransactionType,
            name="inventory_transaction_type",
            create_constraint=True,
        ),
        nullable=False,
    )
    quantity_change: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    item = relationship("InventoryItem", back_populates="transactions")


class MaintenanceInventoryUsage(Base):
    """Relación entre mantenimiento y materiales utilizados."""
    __tablename__ = "maintenance_inventory_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    maintenance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("maintenances.id", ondelete="CASCADE"), nullable=False
    )
    inventory_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False
    )
    quantity_used: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    used_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    item = relationship("InventoryItem", back_populates="maintenance_usages")
    maintenance = relationship("Maintenance", back_populates="inventory_usages")

    @property
    def total_cost(self) -> float:
        if self.unit_cost is None:
            return 0.0
        return (self.unit_cost or 0.0) * self.quantity_used
