# app/core/logging.py
import logging
import sys

import structlog


def setup_logging():
    """Configura structlog para generar logs en formato JSON."""

    # Procesadores de structlog: enriquecen el registro del log
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.JSONRenderer(),
    ]

    # Configuración base de logging
    logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(message)s")

    # Configuración de structlog para usar los procesadores definidos
    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
