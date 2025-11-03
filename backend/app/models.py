"""Database models for uploaded assets."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from .database import Base


def generate_id() -> str:
    """Generate a random hexadecimal identifier."""

    return uuid.uuid4().hex


class Dataset(Base):
    """Metadata describing an uploaded spreadsheet file."""

    __tablename__ = "datasets"

    id = Column(String(32), primary_key=True, default=generate_id)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    sheet_name = Column(String(128), nullable=True)
    row_count = Column(Integer, nullable=False, default=0)
    column_count = Column(Integer, nullable=False, default=0)
    columns_json = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class TextContent(Base):
    """Metadata for uploaded textual content converted to HTML."""

    __tablename__ = "text_contents"

    id = Column(String(32), primary_key=True, default=generate_id)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    content_type = Column(String(32), nullable=False)
    html_content = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
