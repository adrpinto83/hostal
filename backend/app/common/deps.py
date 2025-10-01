# app/common/deps.py
from __future__ import annotations

from typing import Generator

from fastapi import Query
from sqlalchemy.orm import Session

from app.db.session import SessionLocal


def PaginatedLimit(default: int = 50, max_: int = 200):
    return Query(default, ge=1, le=max_)


def Offset(default: int = 0):
    return Query(default, ge=0)


STATUS_PATTERN = "^(pending|active|checked_out|cancelled)$"
ROOM_TYPE_PATTERN = "^(single|double|suite)$"


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
