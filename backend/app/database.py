"""Database helpers for the Flask backend."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Declarative base class for ORM models."""


_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def init_engine(database_url: str):
    """Initialise the SQLAlchemy engine and session factory if required."""

    global _engine, _SessionLocal

    if _engine is None:
        _engine = create_engine(database_url, future=True)
        _SessionLocal = sessionmaker(
            bind=_engine,
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
        )

    return _engine


@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations."""

    if _SessionLocal is None:
        raise RuntimeError("Database engine is not initialised. Call init_engine() first.")

    session = _SessionLocal()

    try:
        yield session
        session.commit()
    except Exception:  # pragma: no cover - logging could be added later
        session.rollback()
        raise
    finally:
        session.close()
