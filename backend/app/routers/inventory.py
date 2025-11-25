# app/routers/inventory.py
"""Endpoints para gestionar el inventario del hostal."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_permission
from ..models import (
    InventoryCategory,
    InventoryItem,
    InventoryTransaction,
    InventoryTransactionType,
    Maintenance,
    MaintenanceInventoryUsage,
)
from ..models.user import User

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ========================== SCHEMAS ==========================
class InventoryItemBase(BaseModel):
    name: str = Field(..., max_length=150)
    sku: str | None = Field(None, max_length=64)
    category: InventoryCategory = InventoryCategory.CONSUMABLE
    unit: str = Field("unidad", max_length=32)
    description: str | None = None
    min_stock: float = Field(0, ge=0)
    location: str | None = Field(None, max_length=120)
    vendor: str | None = Field(None, max_length=120)
    cost_per_unit: float | None = Field(None, ge=0)
    allow_negative_stock: bool = False
    notes: str | None = None


class InventoryItemCreate(InventoryItemBase):
    quantity_on_hand: float = Field(0, ge=0)


class InventoryItemUpdate(BaseModel):
    name: str | None = Field(None, max_length=150)
    sku: str | None = Field(None, max_length=64)
    category: InventoryCategory | None = None
    unit: str | None = Field(None, max_length=32)
    description: str | None = None
    min_stock: float | None = Field(None, ge=0)
    location: str | None = Field(None, max_length=120)
    vendor: str | None = Field(None, max_length=120)
    cost_per_unit: float | None = Field(None, ge=0)
    allow_negative_stock: bool | None = None
    notes: str | None = None


class InventoryItemResponse(BaseModel):
    id: int
    name: str
    sku: str | None
    category: InventoryCategory
    unit: str
    description: str | None
    quantity_on_hand: float
    min_stock: float
    location: str | None
    vendor: str | None
    cost_per_unit: float | None
    allow_negative_stock: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InventoryTransactionResponse(BaseModel):
    id: int
    item_id: int
    transaction_type: InventoryTransactionType
    quantity_change: float
    unit_cost: float | None
    reference: str | None
    reference_id: int | None
    reference_type: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class InventoryAdjustmentRequest(BaseModel):
    quantity: float = Field(..., description="Cantidad a ajustar (puede ser negativa)")
    transaction_type: InventoryTransactionType = InventoryTransactionType.ADJUSTMENT
    reference: str | None = None
    notes: str | None = None


class MaintenanceUsageCreate(BaseModel):
    maintenance_id: int
    inventory_item_id: int
    quantity_used: float = Field(..., gt=0)
    unit_cost: float | None = Field(None, ge=0)
    notes: str | None = None


class MaintenanceUsageResponse(BaseModel):
    id: int
    maintenance_id: int
    inventory_item_id: int
    item_name: str
    quantity_used: float
    unit_cost: float | None
    total_cost: float
    notes: str | None
    used_at: datetime

    class Config:
        from_attributes = True


# ========================== HELPERS ==========================
def _get_item_or_404(db: Session, item_id: int) -> InventoryItem:
    item = db.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


# ========================== ENDPOINTS ==========================
@router.post(
    "/items",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("inventory:write"))],
    summary="Crear item de inventario",
)
def create_inventory_item(
    item_data: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = InventoryItem(**item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    if item.quantity_on_hand:
        transaction = InventoryTransaction(
            item_id=item.id,
            transaction_type=InventoryTransactionType.ADJUSTMENT,
            quantity_change=item.quantity_on_hand,
            unit_cost=item.cost_per_unit,
            reference=f"Init:{current_user.email}",
        )
        db.add(transaction)
        db.commit()

    db.refresh(item)
    return item


@router.get(
    "/items",
    response_model=List[InventoryItemResponse],
    dependencies=[Depends(require_permission("inventory:read"))],
    summary="Listar inventario",
)
def list_inventory_items(
    category: InventoryCategory | None = None,
    low_stock_only: bool = False,
    search: str | None = Query(None, min_length=2),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryItem)

    if category:
        query = query.filter(InventoryItem.category == category)
    if low_stock_only:
        query = query.filter(InventoryItem.quantity_on_hand <= InventoryItem.min_stock)
    if search:
        like_term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(InventoryItem.name).like(like_term)
            | func.lower(InventoryItem.sku).like(like_term)
            | func.lower(InventoryItem.location).like(like_term)
        )

    return query.order_by(InventoryItem.name.asc()).all()


@router.get(
    "/items/{item_id}",
    response_model=InventoryItemResponse,
    dependencies=[Depends(require_permission("inventory:read"))],
    summary="Obtener detalle de inventario",
)
def get_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = _get_item_or_404(db, item_id)
    return item


@router.patch(
    "/items/{item_id}",
    response_model=InventoryItemResponse,
    dependencies=[Depends(require_permission("inventory:write"))],
    summary="Actualizar item de inventario",
)
def update_inventory_item(
    item_id: int,
    update_data: InventoryItemUpdate,
    db: Session = Depends(get_db),
):
    item = _get_item_or_404(db, item_id)
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("inventory:write"))],
    summary="Eliminar item de inventario",
)
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = _get_item_or_404(db, item_id)
    if item.maintenance_usages:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar un item con historial de uso en mantenimiento",
        )
    db.delete(item)
    db.commit()
    return None


@router.post(
    "/items/{item_id}/adjust",
    response_model=InventoryItemResponse,
    dependencies=[Depends(require_permission("inventory:write"))],
    summary="Ajustar inventario",
)
def adjust_inventory_item(
    item_id: int,
    adjustment: InventoryAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = _get_item_or_404(db, item_id)

    try:
        item.adjust_stock(adjustment.quantity)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    transaction = InventoryTransaction(
        item_id=item.id,
        transaction_type=adjustment.transaction_type,
        quantity_change=adjustment.quantity,
        unit_cost=item.cost_per_unit,
        reference=adjustment.reference or f"Ajuste manual ({current_user.email})",
        notes=adjustment.notes,
    )
    db.add(transaction)
    db.commit()
    db.refresh(item)
    return item


@router.get(
    "/transactions",
    response_model=List[InventoryTransactionResponse],
    dependencies=[Depends(require_permission("inventory:read"))],
    summary="Historial de movimientos",
)
def list_inventory_transactions(
    item_id: int | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryTransaction).order_by(InventoryTransaction.created_at.desc())
    if item_id:
        query = query.filter(InventoryTransaction.item_id == item_id)
    return query.limit(limit).all()


@router.get(
    "/low-stock",
    response_model=List[InventoryItemResponse],
    dependencies=[Depends(require_permission("inventory:read"))],
    summary="Items con stock bajo",
)
def get_low_stock_items(db: Session = Depends(get_db)):
    return (
        db.query(InventoryItem)
        .filter(InventoryItem.quantity_on_hand <= InventoryItem.min_stock)
        .order_by(InventoryItem.quantity_on_hand.asc())
        .all()
    )


@router.post(
    "/usage",
    response_model=MaintenanceUsageResponse,
    dependencies=[Depends(require_permission("inventory:consume"))],
    summary="Registrar consumo en mantenimiento",
)
def register_maintenance_usage(
    usage: MaintenanceUsageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    maintenance = db.get(Maintenance, usage.maintenance_id)
    if not maintenance:
        raise HTTPException(status_code=404, detail="Maintenance task not found")

    item = _get_item_or_404(db, usage.inventory_item_id)
    try:
        item.adjust_stock(-usage.quantity_used)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    unit_cost = usage.unit_cost if usage.unit_cost is not None else item.cost_per_unit
    inventory_usage = MaintenanceInventoryUsage(
        maintenance_id=usage.maintenance_id,
        inventory_item_id=usage.inventory_item_id,
        quantity_used=usage.quantity_used,
        unit_cost=unit_cost,
        notes=usage.notes,
    )
    db.add(inventory_usage)

    transaction = InventoryTransaction(
        item_id=item.id,
        transaction_type=InventoryTransactionType.USAGE,
        quantity_change=-usage.quantity_used,
        unit_cost=unit_cost,
        reference=f"Mantenimiento #{maintenance.id}",
        reference_id=maintenance.id,
        reference_type="maintenance",
        notes=usage.notes,
    )
    db.add(transaction)

    if unit_cost is not None:
        maintenance.actual_cost = (maintenance.actual_cost or 0) + (unit_cost * usage.quantity_used)

    db.commit()
    db.refresh(inventory_usage)

    return MaintenanceUsageResponse(
        id=inventory_usage.id,
        maintenance_id=inventory_usage.maintenance_id,
        inventory_item_id=inventory_usage.inventory_item_id,
        item_name=item.name,
        quantity_used=inventory_usage.quantity_used,
        unit_cost=inventory_usage.unit_cost,
        total_cost=inventory_usage.total_cost,
        notes=inventory_usage.notes,
        used_at=inventory_usage.used_at,
    )
