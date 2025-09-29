# app/routers/room_rates.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..core.security import require_roles
from ..models.room import Room
from ..models.room_rate import RoomRate
from ..schemas.room_rate import RoomRateCreate, RoomRateOut

router = APIRouter(prefix="/rooms", tags=["room-rates"])

@router.post("/{room_id}/rates", response_model=RoomRateOut,
             dependencies=[Depends(require_roles("admin"))])
def add_rate(room_id: int, data: RoomRateCreate, db: Session = Depends(get_db)):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    # Unicidad (room_id, period)
    exists = db.query(RoomRate).filter_by(room_id=room_id, period=data.period).first()
    if exists:
        raise HTTPException(409, "Rate for this period already exists for the room")
    rate = RoomRate(room_id=room_id, period=data.period,
                    price_bs=data.price_bs, currency_note=data.currency_note)
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate

@router.get("/{room_id}/rates", response_model=list[RoomRateOut],
            dependencies=[Depends(require_roles("admin","recepcionista"))])
def list_rates(room_id: int, db: Session = Depends(get_db)):
    return db.query(RoomRate).filter_by(room_id=room_id).order_by(RoomRate.period).all()

@router.delete("/rates/{rate_id}",
               dependencies=[Depends(require_roles("admin"))],
               status_code=status.HTTP_204_NO_CONTENT)
def delete_rate(rate_id: int, db: Session = Depends(get_db)):
    rate = db.get(RoomRate, rate_id)
    if not rate:
        raise HTTPException(404, "Rate not found")
    db.delete(rate)
    db.commit()
