# app/common/errors.py
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ApiError(BaseModel):
    error: str
    detail: Optional[Any] = None


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exc_handler(request: Request, exc: HTTPException):
        payload: Dict[str, Any] = {
            "error": exc.detail if isinstance(exc.detail, str) else "HTTP Error"
        }
        if not isinstance(exc.detail, str):
            payload["detail"] = exc.detail
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(Exception)
    async def unhandled_exc_handler(request: Request, exc: Exception):
        # No exponer stack traces en prod
        return JSONResponse(
            status_code=500,
            content=ApiError(error="Internal Server Error").model_dump(),
        )
