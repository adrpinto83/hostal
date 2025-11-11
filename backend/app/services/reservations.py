# app/services/reservations.py
"""
Servicios de lógica de negocio para reservaciones.
Centraliza validaciones y operaciones complejas.
"""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from ..models.reservation import Reservation, ReservationStatus


def check_overlap(
    db: Session, room_id: int, start_date: date, end_date: date, exclude_id: int | None = None
) -> Optional[Reservation]:
    """
    Verifica si existe solapamiento de fechas para una habitación.

    Args:
        db: Sesión de base de datos
        room_id: ID de la habitación
        start_date: Fecha de inicio de la reserva
        end_date: Fecha de fin de la reserva
        exclude_id: ID de reserva a excluir (útil para actualizaciones)

    Returns:
        Reserva conflictiva si existe, None si no hay conflicto
    """
    query = db.query(Reservation).filter(
        Reservation.room_id == room_id,
        Reservation.start_date < end_date,
        Reservation.end_date > start_date,
        Reservation.status.in_(
            [ReservationStatus.pending, ReservationStatus.active]
        ),  # Solo activas
    )

    if exclude_id:
        query = query.filter(Reservation.id != exclude_id)

    return query.first()


def has_overlap(
    db: Session, room_id: int, start_date: date, end_date: date, exclude_id: int | None = None
) -> bool:
    """
    Verifica si existe solapamiento de fechas (retorna bool).
    Mantiene compatibilidad con código existente.
    """
    return check_overlap(db, room_id, start_date, end_date, exclude_id) is not None


def can_transition_status(
    current_status: ReservationStatus, new_status: ReservationStatus
) -> bool:
    """
    Valida si una transición de estado es permitida.

    Transiciones válidas:
    - pending -> active (confirmar)
    - pending -> cancelled
    - active -> checked_out
    - active -> cancelled
    """
    valid_transitions = {
        ReservationStatus.pending: {ReservationStatus.active, ReservationStatus.cancelled},
        ReservationStatus.active: {ReservationStatus.checked_out, ReservationStatus.cancelled},
        ReservationStatus.checked_out: set(),  # Estado final
        ReservationStatus.cancelled: set(),  # Estado final
    }

    return new_status in valid_transitions.get(current_status, set())
