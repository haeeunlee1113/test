"""Configuration values for the Flask application."""

from __future__ import annotations

import os
from pathlib import Path


class Config:
    """Base configuration shared across environments."""

    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_ROOT: Path = BASE_DIR / "uploads"
    EXCEL_FOLDER: Path = UPLOAD_ROOT / "excel"
    TEXT_FOLDER: Path = UPLOAD_ROOT / "text"
    PDF_FOLDER: Path = UPLOAD_ROOT / "pdf"
    PROCESSED_EXCEL_FOLDER: Path = UPLOAD_ROOT / "processed_excel"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'app.db'}"

    # Increase upload limit to 100 MB for very large PDF files (e.g., 5000KB+ files)
    MAX_CONTENT_LENGTH: int = 100 * 1024 * 1024  # 100 MB
    # Request timeout in seconds (10 minutes for very large file uploads)
    REQUEST_TIMEOUT: int = 600  # 10 minutes
    JSON_SORT_KEYS: bool = False

    # Ensure all required directories exist at import time.
    for folder in (DATA_DIR, EXCEL_FOLDER, TEXT_FOLDER, PDF_FOLDER, PROCESSED_EXCEL_FOLDER):
        os.makedirs(folder, exist_ok=True)
