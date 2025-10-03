# app/core/middleware.py
import time
import uuid
from typing import Optional

import structlog
from fastapi import Request
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

log = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Limpiar el contexto de logs al inicio de la petición
        structlog.contextvars.clear_contextvars()

        # Generar un ID de petición único
        request_id = str(uuid.uuid4())

        # Intentar extraer el user_id del token JWT (si existe)
        user_id = await self._get_user_id_from_token(request)

        # Añadir contexto al log. Estará presente en todos los logs de esta petición.
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            user_id=user_id,
            client_ip=request.client.host,
            http_method=request.method,
            http_path=request.url.path,
        )

        start_time = time.perf_counter()

        # Procesar la petición
        response = await call_next(request)

        # Calcular latencia
        process_time = (time.perf_counter() - start_time) * 1000  # en ms

        # Añadir información de la respuesta al log
        log.info(
            "Request completed",
            status_code=response.status_code,
            latency_ms=f"{process_time:.2f}",
        )

        # Añadir el request_id a las cabeceras de la respuesta
        response.headers["X-Request-ID"] = request_id

        return response

    async def _get_user_id_from_token(self, request: Request) -> Optional[str]:
        """Extrae el user_id del token JWT en la cabecera Authorization."""
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload.get("sub")
        except JWTError:
            return "invalid_token"
