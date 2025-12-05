"""Database models for file upload metadata."""

from __future__ import annotations

from datetime import datetime
import uuid

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


class ReportDocumentBase(Base):
    """Base table for report uploads."""

    __abstract__ = True

    id = Column(String(32), primary_key=True, default=lambda: uuid.uuid4().hex)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    content_type = Column(String(50), nullable=False)
    html_content = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, nullable=False, server_default=func.now())


class DrybulkClarksonsReport(ReportDocumentBase):
    __tablename__ = "reports_drybulk_clarksons"


class DrybulkNewsReport(ReportDocumentBase):
    __tablename__ = "reports_drybulk_news"


class ContainerClarksonsReport(ReportDocumentBase):
    __tablename__ = "reports_container_clarksons"


class ContainerNewsReport(ReportDocumentBase):
    __tablename__ = "reports_container_news"


class WeeklyIssuesReport(ReportDocumentBase):
    __tablename__ = "reports_weekly_issues"


class BreakingNewsReport(ReportDocumentBase):
    __tablename__ = "reports_breaking_news"


class DeepResearchReport(ReportDocumentBase):
    __tablename__ = "reports_deep_research"


class DrybulkMonthlyReport(ReportDocumentBase):
    __tablename__ = "reports_drybulk_monthly"


class DrybulkQuarterReport(ReportDocumentBase):
    __tablename__ = "reports_drybulk_quarter"


class ContainerQuarterReport(ReportDocumentBase):
    __tablename__ = "reports_container_quarter"


class PDFContent(Base):
    """Metadata for uploaded PDF files."""

    __tablename__ = "pdf_contents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    file_size_kb = Column(Integer, nullable=False)  # File size in KB
    page_count = Column(Integer, nullable=False)
    preview_text = Column(Text, nullable=True)  # Preview text from first page
    full_text = Column(Text, nullable=True)  # Full extracted text
    uploaded_at = Column(DateTime, nullable=False, server_default=func.now())
