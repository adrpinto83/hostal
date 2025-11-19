# app/services/devices.py
"""
Servicios de lógica de negocio para dispositivos.
Centraliza validaciones y operaciones de suspensión automática de dispositivos.
"""
from datetime import datetime
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.device import Device
from ..models.occupancy import Occupancy
from ..models.guest import Guest
from ..models.payment import Payment, PaymentStatus
from ..models.reservation import Reservation


class DeviceSuspensionReason:
    """Razones predefinidas para la suspensión automática de dispositivos."""
    NO_ACTIVE_OCCUPANCY = "No active occupancy - guest checked out"
    GUEST_IN_ARREARS = "Guest in arrears - unpaid balance"
    GUEST_DELETED = "Associated guest account deleted"
    STAFF_INACTIVE = "Associated staff member inactive"


def get_guest_active_occupancy(db: Session, guest_id: int) -> Optional[Occupancy]:
    """
    Obtiene la ocupancia activa de un huésped.

    Args:
        db: Sesión de base de datos
        guest_id: ID del huésped

    Returns:
        Ocupancia activa si existe, None en caso contrario
    """
    return db.query(Occupancy).filter(
        Occupancy.guest_id == guest_id,
        Occupancy.check_out == None  # Activa (sin check-out)
    ).first()


def is_guest_in_arrears(db: Session, guest_id: int) -> bool:
    """
    Verifica si un huésped tiene pagos pendientes (está en mora).

    Consideramos que un huésped está en mora si:
    - Tiene reservaciones activas/completadas con pagos pendientes
    - O tiene ocupancias activas con monto_adeudado > 0

    Args:
        db: Sesión de base de datos
        guest_id: ID del huésped

    Returns:
        True si el huésped está en mora, False en caso contrario
    """
    # Buscar pagos pendientes asociados a este huésped
    pending_payments = db.query(Payment).filter(
        Payment.guest_id == guest_id,
        Payment.status == PaymentStatus.pending
    ).count()

    if pending_payments > 0:
        return True

    # Nota: En una implementación más robusta, se podría:
    # 1. Calcular el monto total adeudado comparando total_cost vs pagado
    # 2. Verificar si hay facturas/bills vencidas
    # 3. Integrar con sistema de cuentas por cobrar

    return False


def has_valid_occupancy_or_staff(db: Session, device: Device) -> bool:
    """
    Verifica si un dispositivo tiene una ocupancia válida o pertenece a personal activo.

    Args:
        db: Sesión de base de datos
        device: Dispositivo a verificar

    Returns:
        True si tiene ocupancia/personal válido, False en caso contrario
    """
    # Si es dispositivo de personal
    if device.staff_id:
        from ..models.staff import Staff, StaffStatus
        staff = db.query(Staff).filter(Staff.id == device.staff_id).first()
        if not staff:
            return False
        # Personal debe estar activo
        return staff.status == StaffStatus.active

    # Si es dispositivo de huésped
    if device.guest_id:
        guest = db.query(Guest).filter(Guest.id == device.guest_id).first()
        if not guest:
            return False
        # Huésped debe tener ocupancia activa
        return get_guest_active_occupancy(db, device.guest_id) is not None

    # Dispositivo sin asociación válida
    return False


def get_device_suspension_reason(db: Session, device: Device) -> Optional[str]:
    """
    Obtiene la razón por la cual un dispositivo debería ser suspendido automáticamente.

    Args:
        db: Sesión de base de datos
        device: Dispositivo a evaluar

    Returns:
        Razón de suspensión si aplica, None si no debe ser suspendido
    """
    # Verificar si tiene ocupancia/personal válido
    if not has_valid_occupancy_or_staff(db, device):
        if device.guest_id:
            occupancy = get_guest_active_occupancy(db, device.guest_id)
            if not occupancy:
                return DeviceSuspensionReason.NO_ACTIVE_OCCUPANCY
            guest = db.query(Guest).filter(Guest.id == device.guest_id).first()
            if not guest:
                return DeviceSuspensionReason.GUEST_DELETED
        elif device.staff_id:
            from ..models.staff import Staff, StaffStatus
            staff = db.query(Staff).filter(Staff.id == device.staff_id).first()
            if not staff:
                return DeviceSuspensionReason.GUEST_DELETED
            if staff.status != StaffStatus.active:
                return DeviceSuspensionReason.STAFF_INACTIVE
        else:
            return DeviceSuspensionReason.NO_ACTIVE_OCCUPANCY

    # Verificar si huésped está en mora
    if device.guest_id:
        if is_guest_in_arrears(db, device.guest_id):
            return DeviceSuspensionReason.GUEST_IN_ARREARS

    return None


def should_suspend_device(db: Session, device: Device) -> bool:
    """
    Determina si un dispositivo debe ser suspendido automáticamente.

    Args:
        db: Sesión de base de datos
        device: Dispositivo a evaluar

    Returns:
        True si debe ser suspendido, False en caso contrario
    """
    return get_device_suspension_reason(db, device) is not None


def auto_suspend_device(
    db: Session,
    device: Device,
    reason: Optional[str] = None
) -> bool:
    """
    Suspende automáticamente un dispositivo y registra la razón.

    Args:
        db: Sesión de base de datos
        device: Dispositivo a suspender
        reason: Razón de la suspensión (si no se proporciona, se calcula)

    Returns:
        True si fue suspendido, False si ya estaba suspendido
    """
    if device.auto_suspended:
        return False  # Ya está suspendido

    if reason is None:
        reason = get_device_suspension_reason(db, device)

    if reason is None:
        return False  # No hay razón para suspender

    device.auto_suspended = True
    device.auto_suspension_reason = reason
    device.auto_suspension_date = datetime.utcnow()

    db.add(device)
    return True


def auto_reactivate_device(db: Session, device: Device) -> bool:
    """
    Reactiva automáticamente un dispositivo si ya no hay razones para suspenirlo.

    Args:
        db: Sesión de base de datos
        device: Dispositivo a reactivar

    Returns:
        True si fue reactivado, False si no estaba suspendido o aún hay razones
    """
    if not device.auto_suspended:
        return False  # No está suspendido

    # Verificar si aún hay razones para mantenerlo suspendido
    if get_device_suspension_reason(db, device) is not None:
        return False  # Aún hay razones

    device.auto_suspended = False
    device.auto_suspension_reason = None
    device.auto_suspension_date = None

    db.add(device)
    return True


def check_and_suspend_all_devices(db: Session) -> dict:
    """
    Revisa todos los dispositivos y suspende los que deben serlo.
    Útil para ejecutarse periódicamente como tarea programada.

    Args:
        db: Sesión de base de datos

    Returns:
        Diccionario con estadísticas: {
            'total_checked': int,
            'newly_suspended': int,
            'already_suspended': int,
            'errors': List[str]
        }
    """
    stats = {
        'total_checked': 0,
        'newly_suspended': 0,
        'already_suspended': 0,
        'reactivated': 0,
        'errors': []
    }

    try:
        devices = db.query(Device).all()
        stats['total_checked'] = len(devices)

        for device in devices:
            try:
                # Verificar si debe ser suspendido
                if should_suspend_device(db, device):
                    reason = get_device_suspension_reason(db, device)
                    if auto_suspend_device(db, device, reason):
                        stats['newly_suspended'] += 1
                    else:
                        stats['already_suspended'] += 1
                else:
                    # Intentar reactivar si está suspendido
                    if device.auto_suspended:
                        if auto_reactivate_device(db, device):
                            stats['reactivated'] += 1

            except Exception as e:
                stats['errors'].append(f"Device {device.id}: {str(e)}")

        # Guardar cambios
        db.commit()

    except Exception as e:
        stats['errors'].append(f"Batch operation failed: {str(e)}")
        db.rollback()

    return stats


def get_devices_by_suspension_status(
    db: Session,
    auto_suspended: Optional[bool] = None,
    manually_suspended: Optional[bool] = None,
    guest_id: Optional[int] = None,
    staff_id: Optional[int] = None
) -> List[Device]:
    """
    Obtiene dispositivos filtrados por estado de suspensión y asociación.

    Args:
        db: Sesión de base de datos
        auto_suspended: Filtrar por estado de suspensión automática
        manually_suspended: Filtrar por suspensión manual
        guest_id: Filtrar por ID de huésped
        staff_id: Filtrar por ID de personal

    Returns:
        Lista de dispositivos que coinciden con los criterios
    """
    query = db.query(Device)

    if auto_suspended is not None:
        query = query.filter(Device.auto_suspended == auto_suspended)

    if manually_suspended is not None:
        query = query.filter(Device.suspended == manually_suspended)

    if guest_id is not None:
        query = query.filter(Device.guest_id == guest_id)

    if staff_id is not None:
        query = query.filter(Device.staff_id == staff_id)

    return query.all()
