"""Helper utilities for file handling and conversions."""

from __future__ import annotations

import json
import mimetypes
from pathlib import Path
from typing import Iterable
from uuid import uuid4

import pandas as pd
from docx import Document
from markdown import markdown


EXCEL_EXTENSIONS: set[str] = {".xlsx", ".xlsm"}
TEXT_EXTENSIONS: set[str] = {".docx", ".md", ".markdown"}


def ensure_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def allowed_file(filename: str, allowed_extensions: Iterable[str]) -> bool:
    """Return True if the file has one of the allowed extensions."""

    return ensure_extension(filename) in {ext.lower() for ext in allowed_extensions}


def save_upload(file_storage, target_dir: Path) -> Path:
    """Persist an uploaded file to the target directory with a unique name."""

    extension = ensure_extension(file_storage.filename)
    unique_name = f"{uuid4().hex}{extension}"
    target_path = target_dir / unique_name
    target_dir.mkdir(parents=True, exist_ok=True)
    file_storage.save(target_path)
    return target_path


def dataframe_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert a DataFrame into a list of dictionaries for JSON responses."""

    return df.fillna(value="").to_dict(orient="records")


def read_excel_to_dataframe(path: Path) -> tuple[pd.DataFrame, str | None]:
    """Read an Excel spreadsheet into a DataFrame and capture the sheet name."""

    try:
        excel_file = pd.ExcelFile(path)
        first_sheet = excel_file.sheet_names[0]
        df = excel_file.parse(first_sheet)
        return df, first_sheet
    finally:
        excel_file.close()


def serialise_columns(df: pd.DataFrame) -> str:
    """Serialise DataFrame columns to a JSON string for persistence."""

    return json.dumps(list(df.columns))


def convert_docx_to_html(path: Path) -> str:
    """Convert a Word document to rudimentary HTML."""

    document = Document(path)

    blocks: list[str] = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue

        style_name = paragraph.style.name if paragraph.style else ""
        heading_level = _extract_heading_level(style_name)

        if heading_level:
            blocks.append(f"<h{heading_level}>{_escape_html(text)}</h{heading_level}>")
        else:
            blocks.append(f"<p>{_escape_html(text)}</p>")

    if not blocks:
        return "<p>(empty document)</p>"

    return "\n".join(blocks)


def convert_markdown_to_html(path: Path) -> str:
    """Convert a Markdown file to HTML using the markdown library."""

    text = path.read_text(encoding="utf-8")
    return markdown(text, extensions=["extra", "tables", "sane_lists"]) or "<p>(empty document)</p>"


def convert_text_file_to_html(path: Path) -> tuple[str, str]:
    """Convert an uploaded text-like file into HTML and return HTML plus content type."""

    extension = ensure_extension(path.name)

    if extension == ".docx":
        return convert_docx_to_html(path), "docx"
    if extension in {".md", ".markdown"}:
        return convert_markdown_to_html(path), "markdown"

    # Fall back to rendering as preformatted text.
    text = path.read_text(encoding="utf-8")
    html = f"<pre>{_escape_html(text)}</pre>"
    return html, "text"


def guess_mime_type(path: Path) -> str | None:
    """Attempt to guess the MIME type for a given file path."""

    mimetype, _ = mimetypes.guess_type(path)
    return mimetype


def _escape_html(value: str) -> str:
    """Very small HTML escape helper without pulling in additional deps."""

    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _extract_heading_level(style_name: str | None) -> int | None:
    if not style_name:
        return None

    style_name = style_name.lower()
    if style_name.startswith("heading"):
        digits = "".join(ch for ch in style_name if ch.isdigit())
        try:
            level = int(digits or "1")
        except ValueError:
            return None
        return max(1, min(level, 6))

    return None
