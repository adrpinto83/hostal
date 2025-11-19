# app/core/scheduler.py
"""
Módulo para ejecutar tareas programadas sin dependencias externas.
Utiliza asyncio y FastAPI startup/shutdown events.
"""
import asyncio
import structlog
from datetime import datetime
from typing import Optional, Callable
from contextlib import contextmanager

from sqlalchemy.orm import Session
from ..core.db import SessionLocal

log = structlog.get_logger()

# Store active tasks
_active_tasks = []


async def run_periodically(
    interval_seconds: int,
    task_name: str,
    func: Callable,
):
    """
    Ejecuta una función periódicamente en background.

    Args:
        interval_seconds: Intervalo entre ejecuciones en segundos
        task_name: Nombre descriptivo de la tarea
        func: Función asincrónica a ejecutar
    """
    log.info(f"Starting periodic task", task_name=task_name, interval_seconds=interval_seconds)

    while True:
        try:
            log.debug(f"Executing task", task_name=task_name)
            await func()
            log.debug(f"Task completed successfully", task_name=task_name)
        except asyncio.CancelledError:
            log.info(f"Task cancelled", task_name=task_name)
            break
        except Exception as e:
            log.error(f"Task failed", task_name=task_name, error=str(e), exc_info=True)

        # Esperar antes de la siguiente ejecución
        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            break


def create_db_context() -> Session:
    """Crea una nueva sesión de base de datos para la tarea."""
    return SessionLocal()


@contextmanager
def get_db_for_task():
    """Context manager para gestionar la sesión de DB en tareas."""
    db = create_db_context()
    try:
        yield db
    finally:
        db.close()


async def auto_suspend_devices_task():
    """
    Tarea para verificar y suspender dispositivos automáticamente.
    Se ejecuta cada 5 minutos (configurable).
    """
    from ..services.devices import check_and_suspend_all_devices

    with get_db_for_task() as db:
        stats = check_and_suspend_all_devices(db)
        log.info(
            "Auto-suspend devices task completed",
            total_checked=stats['total_checked'],
            newly_suspended=stats['newly_suspended'],
            already_suspended=stats['already_suspended'],
            reactivated=stats['reactivated'],
            errors_count=len(stats['errors']),
        )
        if stats['errors']:
            log.warning("Some errors occurred during auto-suspend", errors=stats['errors'])


async def start_background_tasks():
    """
    Inicia todas las tareas de background.
    Se debe llamar en el evento startup de FastAPI.
    """
    log.info("Starting background scheduler tasks")

    # Tarea 1: Suspender dispositivos automáticamente cada 5 minutos
    task = asyncio.create_task(
        run_periodically(
            interval_seconds=300,  # 5 minutos
            task_name="auto_suspend_devices",
            func=auto_suspend_devices_task,
        )
    )
    _active_tasks.append(("auto_suspend_devices", task))

    log.info("Background scheduler tasks started", tasks_count=len(_active_tasks))


async def stop_background_tasks():
    """
    Detiene todas las tareas de background.
    Se debe llamar en el evento shutdown de FastAPI.
    """
    log.info("Stopping background scheduler tasks", tasks_count=len(_active_tasks))

    for task_name, task in _active_tasks:
        log.info(f"Cancelling task", task_name=task_name)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    _active_tasks.clear()
    log.info("All background scheduler tasks stopped")


def get_active_tasks():
    """Retorna la lista de tareas activas (útil para monitoreo)."""
    return [
        {
            "name": name,
            "done": task.done(),
            "cancelled": task.cancelled(),
        }
        for name, task in _active_tasks
    ]
