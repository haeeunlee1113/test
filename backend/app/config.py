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
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'app.db'}"

    # Limit uploads to 16 MB for now.
    MAX_CONTENT_LENGTH: int = 16 * 1024 * 1024
    JSON_SORT_KEYS: bool = False

    # Ensure all required directories exist at import time.
    for folder in (DATA_DIR, EXCEL_FOLDER, TEXT_FOLDER):
        os.makedirs(folder, exist_ok=True)

