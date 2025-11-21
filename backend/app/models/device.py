from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base


class Device(Base):
    """Dispositivo de un huésped o personal con control de internet."""
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_id: Mapped[int | None] = mapped_column(ForeignKey("guests.id", ondelete="CASCADE"), index=True, nullable=True)
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id", ondelete="CASCADE"), index=True, nullable=True)

    # Identificación del dispositivo
    mac: Mapped[str] = mapped_column(String(17), nullable=False, unique=True, index=True)  # AA:BB:CC:DD:EE:FF
    name: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "iPhone 14"
    vendor: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Control de acceso a internet
    allowed: Mapped[bool] = mapped_column(Boolean, default=True, index=True)  # whitelist flag
    suspended: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # Suspendido manualmente
    suspension_reason: Mapped[str | None] = mapped_column(Text, nullable=True)  # Razón de suspensión

    # Suspensión automática por mora o sin ocupancia
    auto_suspended: Mapped[bool] = mapped_column(Boolean, default=False, index=True)  # Suspendido automáticamente
    auto_suspension_reason: Mapped[str | None] = mapped_column(Text, nullable=True)  # Razón de suspensión automática
    auto_suspension_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # Fecha de suspensión automática

    # Control de cuota de datos (opcional)
    daily_quota_mb: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # Cuota diaria en MB
    monthly_quota_mb: Mapped[int | None] = mapped_column(BigInteger, nullable=True)  # Cuota mensual en MB

    # Registro de actividad
    first_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # Primera vez visto
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # Última conexión
    last_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # Última IP asignada

    # Estadísticas de uso
    total_bytes_downloaded: Mapped[int] = mapped_column(BigInteger, default=0)
    total_bytes_uploaded: Mapped[int] = mapped_column(BigInteger, default=0)

    # Relaciones
    guest = relationship("Guest", back_populates="devices")
    staff = relationship("Staff", back_populates="devices")

    @property
    def is_online(self) -> bool:
        """Verifica si el dispositivo está online (visto en los últimos 5 minutos)."""
        if not self.last_seen:
            return False
        delta = datetime.utcnow() - self.last_seen
        return delta.total_seconds() < 300  # 5 minutos

    @property
    def can_access_internet(self) -> bool:
        """Verifica si el dispositivo puede acceder a internet."""
        return self.allowed and not self.suspended

    @property
    def total_usage_mb(self) -> float:
        """Total de datos usados en MB."""
        total_bytes = self.total_bytes_downloaded + self.total_bytes_uploaded
        return total_bytes / (1024 * 1024)

    @property
    def total_usage_gb(self) -> float:
        """Total de datos usados en GB."""
        return self.total_usage_mb / 1024
