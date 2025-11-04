"""Database engine initialization and session management."""

from __future__ import annotations

from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from .config import Config

# Global engine instance (created on first import)
_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


def init_engine(database_url: str) -> Engine:
    """Initialize the SQLAlchemy engine and session factory."""
    global _engine, _session_factory

    if _engine is None:
        _engine = create_engine(database_url, echo=False)
        _session_factory = sessionmaker(bind=_engine)

    return _engine


def get_session() -> Session:
    """Get a database session."""
    if _session_factory is None:
        raise RuntimeError("Database engine not initialized. Call init_engine first.")
    return _session_factory()

