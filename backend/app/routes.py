"""API routes for file uploads and retrieval."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from .database import get_session
from .models import Dataset, TextContent
from .utils import (
    EXCEL_EXTENSIONS,
    TEXT_EXTENSIONS,
    allowed_file,
    convert_text_file_to_html,
    dataframe_to_records,
    read_excel_to_dataframe,
    save_upload,
    serialise_columns,
)

api_bp = Blueprint("api", __name__)


@api_bp.get("/health")
def health_check():
    """Simple heartbeat endpoint."""

    return jsonify({"status": "ok"})


@api_bp.post("/upload/excel")
def upload_excel():
    """Handle spreadsheet uploads and store metadata in the database."""

    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"error": "No file provided"}), 400

    if not allowed_file(file.filename, EXCEL_EXTENSIONS):
        return (
            jsonify(
                {
                    "error": "Unsupported file type",
                    "allowed_extensions": sorted(EXCEL_EXTENSIONS),
                }
            ),
            400,
        )

    excel_folder: Path = current_app.config["EXCEL_FOLDER"]
    saved_path = save_upload(file, excel_folder)

    try:
        dataframe, sheet_name = read_excel_to_dataframe(saved_path)
    except Exception as exc:  # pragma: no cover - parsing errors bubble up
        saved_path.unlink(missing_ok=True)
        return jsonify({"error": f"Failed to parse Excel file: {exc}"}), 400

    metadata = Dataset(
        original_filename=file.filename,
        stored_filename=saved_path.name,
        sheet_name=sheet_name,
        row_count=int(dataframe.shape[0]),
        column_count=int(dataframe.shape[1]),
        columns_json=serialise_columns(dataframe),
    )

    with get_session() as session:
        session.add(metadata)
        session.flush()  # Ensure ID is populated before serialisation.

    response = {
        "dataset": dataset_to_dict(metadata),
        "data": dataframe_to_records(dataframe),
    }

    return jsonify(response), 201


@api_bp.get("/datasets")
def list_datasets():
    """Return metadata for all uploaded datasets."""

    with get_session() as session:
        datasets = session.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()

    return jsonify([dataset_to_dict(ds) for ds in datasets])


@api_bp.get("/datasets/<dataset_id>")
def get_dataset(dataset_id: str):
    """Return metadata and table data for a specific dataset."""

    with get_session() as session:
        dataset: Dataset | None = session.get(Dataset, dataset_id)

    if dataset is None:
        return jsonify({"error": "Dataset not found"}), 404

    excel_folder: Path = current_app.config["EXCEL_FOLDER"]
    dataset_path = excel_folder / dataset.stored_filename

    if not dataset_path.exists():
        return jsonify({"error": "Stored file is missing"}), 500

    dataframe, _ = read_excel_to_dataframe(dataset_path)

    response = {
        "dataset": dataset_to_dict(dataset),
        "data": dataframe_to_records(dataframe),
    }

    return jsonify(response)


@api_bp.post("/upload/text")
def upload_text():
    """Handle Markdown or Word uploads, converting them to HTML."""

    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"error": "No file provided"}), 400

    if not allowed_file(file.filename, TEXT_EXTENSIONS):
        return (
            jsonify(
                {
                    "error": "Unsupported file type",
                    "allowed_extensions": sorted(TEXT_EXTENSIONS),
                }
            ),
            400,
        )

    text_folder: Path = current_app.config["TEXT_FOLDER"]
    saved_path = save_upload(file, text_folder)

    try:
        html_content, content_type = convert_text_file_to_html(saved_path)
    except Exception as exc:  # pragma: no cover
        saved_path.unlink(missing_ok=True)
        return jsonify({"error": f"Failed to convert file: {exc}"}), 400

    text_record = TextContent(
        original_filename=file.filename,
        stored_filename=saved_path.name,
        content_type=content_type,
        html_content=html_content,
    )

    with get_session() as session:
        session.add(text_record)
        session.flush()

    return jsonify({"text": text_to_dict(text_record)}), 201


@api_bp.get("/texts")
def list_texts():
    """Return metadata for converted text uploads."""

    with get_session() as session:
        texts = session.query(TextContent).order_by(TextContent.uploaded_at.desc()).all()

    return jsonify([text_to_dict(text) for text in texts])


@api_bp.get("/texts/<text_id>")
def get_text(text_id: str):
    """Fetch a single text upload including HTML content."""

    with get_session() as session:
        text: TextContent | None = session.get(TextContent, text_id)

    if text is None:
        return jsonify({"error": "Text item not found"}), 404

    return jsonify({"text": text_to_dict(text, include_html=True)})


def dataset_to_dict(dataset: Dataset) -> dict:
    """Serialise a Dataset ORM object into a JSON-friendly dict."""

    columns = json.loads(dataset.columns_json) if dataset.columns_json else []

    return {
        "id": dataset.id,
        "original_filename": dataset.original_filename,
        "stored_filename": dataset.stored_filename,
        "sheet_name": dataset.sheet_name,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "columns": columns,
        "uploaded_at": dataset.uploaded_at.isoformat() + "Z",
    }


def text_to_dict(text: TextContent, include_html: bool = False) -> dict:
    """Serialise a TextContent ORM object into a JSON-friendly dict."""

    payload = {
        "id": text.id,
        "original_filename": text.original_filename,
        "stored_filename": text.stored_filename,
        "content_type": text.content_type,
        "uploaded_at": text.uploaded_at.isoformat() + "Z",
    }

    if include_html:
        payload["html_content"] = text.html_content

    return payload
