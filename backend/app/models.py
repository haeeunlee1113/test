"""Database models for file upload metadata."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from .database import Base


class Dataset(Base):
    """Metadata for uploaded Excel files."""

    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    sheet_name = Column(String(255), nullable=False)
    row_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)
    columns_json = Column(Text, nullable=False)  # JSON array of column names
    uploaded_at = Column(DateTime, nullable=False, server_default=func.now())


class TextContent(Base):
    """Metadata and HTML content for uploaded text files."""

    __tablename__ = "text_contents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    content_type = Column(String(50), nullable=False)  # 'markdown' or 'docx'
    html_content = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, nullable=False, server_default=func.now())

