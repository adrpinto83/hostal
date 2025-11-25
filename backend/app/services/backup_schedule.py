# app/services/backup_schedule.py
"""Gestión de la configuración de respaldos programados."""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict

from app.services.backup import BACKUP_DIR, BackupService
import structlog

log = structlog.get_logger()

SCHEDULE_FILE = BACKUP_DIR / "backup_schedule.json"

DEFAULT_SCHEDULE = {
    "enabled": False,
    "interval_minutes": 1440,  # 24h
    "next_run": None,
    "last_run": None,
    "description": "Respaldo programado automático",
}


class BackupScheduleService:
    @staticmethod
    def _read_file() -> Dict[str, Any]:
        if not SCHEDULE_FILE.exists():
            return DEFAULT_SCHEDULE.copy()
        try:
            with SCHEDULE_FILE.open("r", encoding="utf-8") as f:
                data = json.load(f)
            return {**DEFAULT_SCHEDULE, **data}
        except Exception:
            return DEFAULT_SCHEDULE.copy()

    @staticmethod
    def _write_file(data: Dict[str, Any]) -> None:
        SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with SCHEDULE_FILE.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @staticmethod
    def get_schedule() -> Dict[str, Any]:
        return BackupScheduleService._read_file()

    @staticmethod
    def update_schedule(enabled: bool, interval_minutes: int, description: str | None = None) -> Dict[str, Any]:
        data = BackupScheduleService._read_file()
        data["enabled"] = enabled
        data["interval_minutes"] = max(15, min(interval_minutes, 10080))  # entre 15 min y 7 días
        if description is not None:
            data["description"] = description

        if enabled:
            data["next_run"] = (datetime.utcnow() + timedelta(minutes=data["interval_minutes"])).isoformat()
        else:
            data["next_run"] = None
        BackupScheduleService._write_file(data)
        return data

    @staticmethod
    def record_execution() -> None:
        data = BackupScheduleService._read_file()
        now = datetime.utcnow()
        data["last_run"] = now.isoformat()
        data["next_run"] = (now + timedelta(minutes=data["interval_minutes"])).isoformat()
        BackupScheduleService._write_file(data)

    @staticmethod
    async def maybe_run_scheduled_backup() -> None:
        data = BackupScheduleService._read_file()
        if not data.get("enabled"):
            return

        next_run = data.get("next_run")

        if next_run:
            try:
                next_run_dt = datetime.fromisoformat(next_run)
            except ValueError:
                next_run_dt = datetime.utcnow()
        else:
            next_run_dt = datetime.utcnow()

        if datetime.utcnow() >= next_run_dt:
            try:
                log.info("Running scheduled backup")
                BackupService.create_backup(data.get("description"))
                BackupScheduleService.record_execution()
            except Exception as exc:
                log.error("Scheduled backup failed", error=str(exc))
