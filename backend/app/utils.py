"""Utility functions for file processing and uploads."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd
import markdown
from docx import Document
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

EXCEL_EXTENSIONS = {".xlsx", ".xlsm"}
TEXT_EXTENSIONS = {".docx", ".md", ".markdown"}


def allowed_file(filename: str, allowed_extensions: set[str]) -> bool:
    """Check if file extension is allowed."""
    return Path(filename).suffix.lower() in allowed_extensions


def save_upload(file: FileStorage, destination_folder: Path) -> Path:
    """Save uploaded file to destination folder with unique filename."""
    destination_folder.mkdir(parents=True, exist_ok=True)

    # Generate unique filename using hash
    file_content = file.read()
    file.seek(0)  # Reset file pointer
    file_hash = hashlib.md5(file_content).hexdigest()[:8]
    original_name = Path(secure_filename(file.filename))
    extension = original_name.suffix
    unique_filename = f"{file_hash}_{original_name.stem}{extension}"

    saved_path = destination_folder / unique_filename
    file.save(str(saved_path))

    return saved_path


def read_excel_to_dataframe(file_path: Path) -> tuple[pd.DataFrame, str]:
    """Read Excel file and return DataFrame with sheet name."""
    excel_file = pd.ExcelFile(file_path)
    sheet_name = excel_file.sheet_names[0]  # Use first sheet
    dataframe = pd.read_excel(excel_file, sheet_name=sheet_name)
    return dataframe, sheet_name


def serialise_columns(dataframe: pd.DataFrame) -> str:
    """Convert DataFrame columns to JSON string."""
    return json.dumps(list(dataframe.columns))


def dataframe_to_records(dataframe: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to list of dictionaries."""
    return dataframe.replace({pd.NA: None}).to_dict("records")


def convert_text_file_to_html(file_path: Path) -> tuple[str, str]:
    """Convert text file (Markdown or Word) to HTML."""
    extension = file_path.suffix.lower()

    if extension == ".md" or extension == ".markdown":
        with open(file_path, "r", encoding="utf-8") as f:
            markdown_content = f.read()
        html_content = markdown.markdown(markdown_content, extensions=["fenced_code", "tables"])
        return html_content, "markdown"

    elif extension == ".docx":
        doc = Document(file_path)
        html_parts = []

        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                html_parts.append(f"<p>{paragraph.text}</p>")

        html_content = "\n".join(html_parts)
        return html_content, "docx"

    else:
        raise ValueError(f"Unsupported file type: {extension}")

