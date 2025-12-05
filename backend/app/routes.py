"""API routes for file upload and data retrieval."""

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime

from flask import Blueprint, jsonify, request, send_file
from werkzeug.exceptions import RequestEntityTooLarge
from sqlalchemy import or_

from .config import Config
from .database import get_session
from .models import (
    Dataset,
    PDFContent,
    DrybulkClarksonsReport,
    DrybulkNewsReport,
    ContainerClarksonsReport,
    ContainerNewsReport,
    WeeklyIssuesReport,
    BreakingNewsReport,
    DeepResearchReport,
    DrybulkMonthlyReport,
    DrybulkQuarterReport,
    ContainerQuarterReport,
)
from .utils import (
    is_allowed_excel_file,
    is_allowed_text_file,
    is_allowed_pdf_file,
    save_upload_file,
    read_excel_file,
    convert_text_to_html,
    extract_pdf_info,
    filter_data_by_year,
    group_datasets_by_category,
    find_date_column,
)

api_bp = Blueprint("api", __name__)

REPORT_TABLES = {
    "drybulk_clarksons_drewry": DrybulkClarksonsReport,
    "drybulk_news_media": DrybulkNewsReport,
    "drybulk_monthly": DrybulkMonthlyReport,
    "drybulk_quarter": DrybulkQuarterReport,
    "container_clarksons": ContainerClarksonsReport,
     "container_quarter": ContainerQuarterReport,
    "container_news_media": ContainerNewsReport,
    "weekly_issues": WeeklyIssuesReport,
    "breaking_news": BreakingNewsReport,
    "deep_research": DeepResearchReport,
}

REPORT_CATEGORY_LABELS = {
    "drybulk_clarksons_drewry": "Drybulk Clarksons/Drewry",
    "drybulk_news_media": "Drybulk News Media",
    "drybulk_monthly": "Drybulk Monthly",
    "drybulk_quarter": "Drybulk Quarter",
    "container_clarksons": "Container Clarksons",
    "container_quarter": "Container Quarter",
    "container_news_media": "Container News Media",
    "weekly_issues": "Weekly Issues",
    "breaking_news": "Breaking News",
    "deep_research": "Deep Research",
}


@api_bp.errorhandler(RequestEntityTooLarge)
def handle_file_too_large(error):
    """Handle file size exceeded error."""
    max_size_mb = Config.MAX_CONTENT_LENGTH / (1024 * 1024)
    return (
        jsonify(
            {
                "error": f"파일 크기가 너무 큽니다. 최대 {max_size_mb:.0f}MB까지 업로드 가능합니다."
            }
        ),
        413,
    )


@api_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "max_file_size_mb": Config.MAX_CONTENT_LENGTH / (1024 * 1024)})


@api_bp.route("/upload/excel", methods=["POST"])
def upload_excel():
    """Upload Excel file and process it."""
    if "file" not in request.files:
        return jsonify({"error": "파일이 제공되지 않았습니다."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "파일을 선택하세요."}), 400

    if not is_allowed_excel_file(file.filename):
        return jsonify({"error": "Excel 파일(.xlsx, .xls)만 업로드 가능합니다."}), 400

    session = get_session()
    try:
        # Save file
        saved_path = save_upload_file(file, Config.EXCEL_FOLDER)

        # Read Excel data (원본 파일명 전달)
        excel_data = read_excel_file(saved_path, original_filename=file.filename)

        # 필터링된 데이터를 엑셀 파일로 저장
        if excel_data.get("selected_columns") and excel_data.get("data"):
            from .utils import save_filtered_excel, find_date_column
            processed_filename = f"processed_{saved_path.stem}.xlsx"
            processed_path = Config.PROCESSED_EXCEL_FOLDER / processed_filename
            save_filtered_excel(
                excel_data["data"],
                excel_data["selected_columns"],
                processed_path
            )

        # Save to database
        dataset = Dataset(
            original_filename=file.filename,
            stored_filename=saved_path.name,
            sheet_name="Sheet1",  # Default, can be extended
            row_count=excel_data["row_count"],
            column_count=excel_data["column_count"],
            columns_json=json.dumps(excel_data["columns"], ensure_ascii=False),
        )
        session.add(dataset)
        session.commit()

        response_data = {
            "dataset": {
                "id": dataset.id,
                "original_filename": dataset.original_filename,
                "row_count": dataset.row_count,
                "column_count": dataset.column_count,
                "uploaded_at": dataset.uploaded_at.isoformat(),
            },
            "data": excel_data["data"][:10],  # Return first 10 rows (필터링된 데이터)
            "columns": excel_data["columns"],  # 전체 원본 컬럼명
            "selected_columns": excel_data.get("selected_columns", excel_data["columns"]),  # 선택된 컬럼명
            "codes_used": excel_data.get("codes_used", []),  # 사용된 코드 목록
        }
        
        # 추출된 컬럼명 정보 추가
        if "labeled_columns" in excel_data:
            response_data["labeled_columns"] = excel_data["labeled_columns"]
            response_data["selected_labeled_columns"] = excel_data.get("selected_labeled_columns", excel_data["labeled_columns"])
            response_data["cargos"] = excel_data.get("cargos", [])
            response_data["units"] = excel_data.get("units", [])
        
        if "label_extraction_error" in excel_data:
            response_data["label_extraction_error"] = excel_data["label_extraction_error"]
        
        return jsonify(response_data)
    except Exception as e:
        session.rollback()
        if saved_path.exists():
            saved_path.unlink()  # Delete saved file on error
        return jsonify({"error": f"파일 처리 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


@api_bp.route("/upload/text", methods=["POST"])
def upload_text():
    """Upload text file (Markdown or DOCX) and convert to HTML."""
    if "file" not in request.files:
        return jsonify({"error": "파일이 제공되지 않았습니다."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "파일을 선택하세요."}), 400

    if not is_allowed_text_file(file.filename):
        return jsonify({"error": "HTML(.html, .htm) 또는 JSON(.json) 파일만 업로드 가능합니다."}), 400

    report_category = request.form.get("category")
    if not report_category or report_category not in REPORT_TABLES:
        return jsonify({"error": "유효하지 않은 보고서 카테고리입니다."}), 400
    target_model = REPORT_TABLES[report_category]

    session = get_session()
    try:
        # Determine content type
        ext = Path(file.filename).suffix.lower()
        if ext == ".md":
            content_type = "markdown"
        elif ext in (".html", ".htm"):
            content_type = "html"
        elif ext == ".json":
            content_type = "json"
        else:
            return jsonify({"error": "지원하지 않는 파일 형식입니다. HTML 또는 JSON 파일을 업로드하세요."}), 400

        # Save file
        saved_path = save_upload_file(file, Config.TEXT_FOLDER)

        # Convert to HTML
        html_content = convert_text_to_html(saved_path, content_type)

        # Save to database
        report_entry = target_model(
            original_filename=file.filename,
            stored_filename=saved_path.name,
            content_type=content_type,
            html_content=html_content,
        )
        session.add(report_entry)

        session.commit()

        return jsonify(
            {
                "status": "success",
                "category": report_category,
                "filename": file.filename,
            }
        )
    except Exception as e:
        session.rollback()
        if saved_path.exists():
            saved_path.unlink()
        return jsonify({"error": f"파일 처리 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


@api_bp.route("/reports/<category>", methods=["GET"])
def get_report_by_category(category: str):
    """Retrieve latest report document by category (optional month/quarter filter)."""
    if not category or category not in REPORT_TABLES:
        return jsonify({"error": "지원하지 않는 카테고리입니다."}), 400

    month_param = request.args.get("month")
    suffix = None
    requested_month = None
    
    if month_param:
        # 분기 형식 처리 (예: 2025-1Q, 2025-2Q, 2025-3Q)
        if month_param.endswith('Q') and '-' in month_param:
            try:
                year, quarter = month_param.split('-')
                quarter_num = int(quarter.replace('Q', ''))
                if quarter_num in [1, 2, 3, 4]:
                    # 분기별 월 매핑: 1Q(1-3월), 2Q(4-6월), 3Q(7-9월), 4Q(10-12월)
                    month_ranges = {
                        1: ['01', '02', '03'],
                        2: ['04', '05', '06'],
                        3: ['07', '08', '09'],
                        4: ['10', '11', '12']
                    }
                    months = month_ranges[quarter_num]
                    year_short = year[-2:] if len(year) == 4 else year
                    
                    # 파일명에 직접 분기 코드가 포함된 파일만 검색
                    table_cls = REPORT_TABLES[category]
                    session = get_session()
                    try:
                        # 파일명에 직접 분기 코드가 포함된 경우만 검색 (예: 2025-4Q, 2025-3Q)
                        quarter_pattern = f"%{month_param}%"
                        query = session.query(table_cls).filter(table_cls.original_filename.ilike(quarter_pattern))
                        report = query.order_by(table_cls.uploaded_at.desc()).first()
                        
                        if not report:
                            # 해당 분기 코드를 가진 파일이 없으면 에러 반환
                            return jsonify({"error": "보고서가 존재하지 않습니다."}), 404
                        
                        requested_month = month_param
                        
                        return jsonify(
                            {
                                "report": {
                                    "category": category,
                                    "category_label": REPORT_CATEGORY_LABELS.get(category, category),
                                    "original_filename": report.original_filename,
                                    "uploaded_at": report.uploaded_at.isoformat(),
                                    "requested_month": requested_month,
                                    "html_content": report.html_content,
                                }
                            }
                        )
                    finally:
                        session.close()
            except (ValueError, KeyError):
                pass
        
        # 반기 형식 처리 (예: 2025-하, 2025-상)
        if month_param.endswith(('하', '상')) and '-' in month_param:
            try:
                year, half = month_param.split('-')
                year_short = year[-2:] if len(year) == 4 else year
                
                # 반기별 월 매핑: 상반기(1-6월), 하반기(7-12월)
                if half == '상':
                    months = ['01', '02', '03', '04', '05', '06']
                elif half == '하':
                    months = ['07', '08', '09', '10', '11', '12']
                else:
                    raise ValueError("Invalid half")
                
                # 해당 반기의 모든 월 패턴으로 검색
                table_cls = REPORT_TABLES[category]
                session = get_session()
                try:
                    patterns = [f"%{year_short}_{month}%" for month in months]
                    conditions = [table_cls.original_filename.ilike(pattern) for pattern in patterns]
                    query = session.query(table_cls).filter(or_(*conditions))
                    report = query.order_by(table_cls.uploaded_at.desc()).first()
                    
                    if not report:
                        # Fallback to most recent report
                        report = session.query(table_cls).order_by(table_cls.uploaded_at.desc()).first()
                        requested_month = None
                    else:
                        requested_month = month_param
                    
                    if not report:
                        return jsonify({"error": "해당 조건에 맞는 보고서를 찾을 수 없습니다."}), 404
                    
                    return jsonify(
                        {
                            "report": {
                                "category": category,
                                "category_label": REPORT_CATEGORY_LABELS.get(category, category),
                                "original_filename": report.original_filename,
                                "uploaded_at": report.uploaded_at.isoformat(),
                                "requested_month": requested_month,
                                "html_content": report.html_content,
                            }
                        }
                    )
                finally:
                    session.close()
            except (ValueError, KeyError):
                pass
        
        # 기존 월 형식 처리
        normalized = month_param.replace("/", "-")
        for fmt in ("%Y-%m", "%y-%m"):
            try:
                dt = datetime.strptime(normalized, fmt)
                suffix = dt.strftime("%y_%m")
                requested_month = dt.strftime("%Y-%m")
                break
            except ValueError:
                continue

    table_cls = REPORT_TABLES[category]

    session = get_session()
    try:
        query = session.query(table_cls)
        if suffix and requested_month:
            # 파일명에 직접 날짜 형식이 포함된 파일 검색 (예: 2025-11)
            date_pattern = f"%{requested_month}%"
            query = query.filter(table_cls.original_filename.ilike(date_pattern))
        elif suffix:
            # 기존 패턴도 지원 (예: 25_11)
            like_pattern = f"%{suffix}%"
            query = query.filter(table_cls.original_filename.ilike(like_pattern))

        report = query.order_by(table_cls.uploaded_at.desc()).first()

        if not report and (suffix or requested_month):
            # 해당 날짜를 가진 파일이 없으면 에러 반환
            return jsonify({"error": "보고서가 존재하지 않습니다."}), 404

        if not report:
            return jsonify({"error": "보고서가 존재하지 않습니다."}), 404

        return jsonify(
            {
                "report": {
                    "category": category,
                    "category_label": REPORT_CATEGORY_LABELS.get(category, category),
                    "original_filename": report.original_filename,
                    "uploaded_at": report.uploaded_at.isoformat(),
                    "requested_month": requested_month,
                    "html_content": report.html_content,
                }
            }
        )
    finally:
        session.close()


@api_bp.route("/reports/<category>/list", methods=["GET"])
def list_reports_by_category(category: str):
    """List all reports for a given category."""
    if not category or category not in REPORT_TABLES:
        return jsonify({"error": "지원하지 않는 카테고리입니다."}), 400

    table_cls = REPORT_TABLES[category]
    session = get_session()
    try:
        reports = session.query(table_cls).order_by(table_cls.uploaded_at.desc()).all()
        return jsonify(
            {
                "reports": [
                    {
                        "id": report.id,
                        "original_filename": report.original_filename,
                        "uploaded_at": report.uploaded_at.isoformat(),
                    }
                    for report in reports
                ]
            }
        )
    finally:
        session.close()


@api_bp.route("/reports/<category>/<report_id>", methods=["GET"])
def get_report_by_id(category: str, report_id: str):
    """Get a specific report by category and ID."""
    if not category or category not in REPORT_TABLES:
        return jsonify({"error": "지원하지 않는 카테고리입니다."}), 400

    table_cls = REPORT_TABLES[category]
    session = get_session()
    try:
        report = session.query(table_cls).filter_by(id=report_id).first()
        if not report:
            return jsonify({"error": "보고서가 존재하지 않습니다."}), 404

        return jsonify(
            {
                "report": {
                    "id": report.id,
                    "category": category,
                    "category_label": REPORT_CATEGORY_LABELS.get(category, category),
                    "original_filename": report.original_filename,
                    "uploaded_at": report.uploaded_at.isoformat(),
                    "html_content": report.html_content,
                }
            }
        )
    finally:
        session.close()


@api_bp.route("/upload/pdf", methods=["POST"])
def upload_pdf():
    """Upload PDF file and extract metadata."""
    if "file" not in request.files:
        return jsonify({"error": "파일이 제공되지 않았습니다."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "파일을 선택하세요."}), 400

    if not is_allowed_pdf_file(file.filename):
        return jsonify({"error": "PDF 파일(.pdf)만 업로드 가능합니다."}), 400

    session = get_session()
    saved_path = None
    try:
        # Save file (this will fail if file is too large, caught by error handler)
        saved_path = save_upload_file(file, Config.PDF_FOLDER)

        # Extract PDF information (with full text)
        pdf_info = extract_pdf_info(saved_path, include_full_text=True)

        # Save to database (only store preview / metadata)
        pdf_content = PDFContent(
            original_filename=file.filename,
            stored_filename=saved_path.name,
            file_size_kb=int(pdf_info["file_size_kb"]),
            page_count=pdf_info["page_count"],
            preview_text=pdf_info["preview_text"],
        )
        session.add(pdf_content)
        session.commit()

        return jsonify(
            {
                "pdf": {
                    "id": pdf_content.id,
                    "original_filename": pdf_content.original_filename,
                    "file_size_kb": pdf_content.file_size_kb,
                    "page_count": pdf_content.page_count,
                    "preview_text": pdf_content.preview_text,
                    "full_text": pdf_info.get("full_text"),
                    "uploaded_at": pdf_content.uploaded_at.isoformat(),
                },
            }
        )
    except Exception as e:
        session.rollback()
        if saved_path and saved_path.exists():
            saved_path.unlink()
        return jsonify({"error": f"PDF 파일 처리 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


@api_bp.route("/datasets", methods=["GET"])
def list_datasets():
    """List all uploaded datasets."""
    session = get_session()
    try:
        datasets = session.query(Dataset).order_by(Dataset.uploaded_at.desc()).all()
        return jsonify(
            [
                {
                    "id": d.id,
                    "original_filename": d.original_filename,
                    "row_count": d.row_count,
                    "column_count": d.column_count,
                    "uploaded_at": d.uploaded_at.isoformat(),
                }
                for d in datasets
            ]
        )
    finally:
        session.close()


@api_bp.route("/datasets/<int:dataset_id>", methods=["GET"])
def get_dataset(dataset_id):
    """Get dataset data by ID."""
    session = get_session()
    try:
        dataset = session.query(Dataset).filter_by(id=dataset_id).first()
        if not dataset:
            return jsonify({"error": "데이터셋을 찾을 수 없습니다."}), 404

        file_path = Config.EXCEL_FOLDER / dataset.stored_filename
        excel_data = read_excel_file(file_path)

        return jsonify(
            {
                "dataset": {
                    "id": dataset.id,
                    "original_filename": dataset.original_filename,
                    "row_count": dataset.row_count,
                    "column_count": dataset.column_count,
                    "columns": json.loads(dataset.columns_json),
                    "uploaded_at": dataset.uploaded_at.isoformat(),
                },
                "data": excel_data["data"],
            }
        )
    finally:
        session.close()


@api_bp.route("/pdfs", methods=["GET"])
def list_pdfs():
    """List all uploaded PDF files."""
    session = get_session()
    try:
        pdfs = session.query(PDFContent).order_by(PDFContent.uploaded_at.desc()).all()
        return jsonify(
            [
                {
                    "id": p.id,
                    "original_filename": p.original_filename,
                    "file_size_kb": p.file_size_kb,
                    "page_count": p.page_count,
                    "preview_text": p.preview_text,
                    "uploaded_at": p.uploaded_at.isoformat(),
                }
                for p in pdfs
            ]
        )
    finally:
        session.close()


@api_bp.route("/pdfs/<int:pdf_id>", methods=["GET"])
def get_pdf(pdf_id):
    """Get PDF metadata by ID."""
    session = get_session()
    try:
        pdf = session.query(PDFContent).filter_by(id=pdf_id).first()
        if not pdf:
            return jsonify({"error": "PDF 파일을 찾을 수 없습니다."}), 404

        file_path = Config.PDF_FOLDER / pdf.stored_filename
        pdf_info = extract_pdf_info(file_path, include_full_text=True)

        return jsonify(
            {
                "pdf": {
                    "id": pdf.id,
                    "original_filename": pdf.original_filename,
                    "file_size_kb": pdf.file_size_kb,
                    "page_count": pdf.page_count,
                    "preview_text": pdf_info.get("preview_text", pdf.preview_text),
                    "full_text": pdf_info.get("full_text"),
                    "uploaded_at": pdf.uploaded_at.isoformat(),
                },
            }
        )
    finally:
        session.close()


@api_bp.route("/pdfs/<int:pdf_id>/download", methods=["GET"])
def download_pdf(pdf_id):
    """Download PDF file by ID."""
    session = get_session()
    try:
        pdf = session.query(PDFContent).filter_by(id=pdf_id).first()
        if not pdf:
            return jsonify({"error": "PDF 파일을 찾을 수 없습니다."}), 404

        file_path = Config.PDF_FOLDER / pdf.stored_filename
        if not file_path.exists():
            return jsonify({"error": "파일이 서버에서 삭제되었습니다."}), 404

        return send_file(
            str(file_path),
            as_attachment=True,
            download_name=pdf.original_filename,
            mimetype="application/pdf",
        )
    finally:
        session.close()


@api_bp.route("/charts/data", methods=["GET"])
def get_chart_data():
    """그래프 데이터를 반환 (2021년 이후 필터링, 그룹별). 현재 월 - 1의 _월_년 형식 파일만 사용."""
    from .utils import get_previous_month_year_suffix
    
    session = get_session()
    try:
        # 현재 월 - 1의 접미사 사용
        target_suffix = get_previous_month_year_suffix().lower()
        
        # 카테고리별로 데이터셋 그룹화
        groups = group_datasets_by_category()
        
        # 디버깅: 각 그룹의 파일명 출력
        debug_info = {
            "target_suffix": target_suffix,
            "drybulk_trade_files": [],
            "fleet_development_files": [],
            "indices_files": []
        }
        
        for group_name, dataset_ids in groups.items():
            for dataset_id in dataset_ids:
                dataset = session.query(Dataset).filter_by(id=dataset_id).first()
                if dataset:
                    if group_name == "drybulk_trade":
                        debug_info["drybulk_trade_files"].append({
                            "id": dataset.id,
                            "filename": dataset.original_filename,
                            "uploaded_at": dataset.uploaded_at.isoformat()
                        })
                    elif group_name == "fleet_development":
                        debug_info["fleet_development_files"].append({
                            "id": dataset.id,
                            "filename": dataset.original_filename,
                            "uploaded_at": dataset.uploaded_at.isoformat()
                        })
                    elif group_name == "indices":
                        debug_info["indices_files"].append({
                            "id": dataset.id,
                            "filename": dataset.original_filename,
                            "uploaded_at": dataset.uploaded_at.isoformat()
                        })
        
        print("\n=== 그래프 데이터 디버깅 정보 ===")
        print(f"대상 접미사 (현재 월 - 1): {target_suffix}")
        print(f"\nDry Bulk Trade 파일들:")
        for f in debug_info["drybulk_trade_files"]:
            print(f"  - {f['filename']} (ID: {f['id']}, 업로드: {f['uploaded_at']})")
        print(f"\nFleet Development 파일들:")
        for f in debug_info["fleet_development_files"]:
            print(f"  - {f['filename']} (ID: {f['id']}, 업로드: {f['uploaded_at']})")
        print(f"\nIndices 파일들:")
        for f in debug_info["indices_files"]:
            print(f"  - {f['filename']} (ID: {f['id']}, 업로드: {f['uploaded_at']})")
        print("=" * 50)
        
        result = {
            "drybulk_trade": [],
            "fleet_development": [],
            "indices": []
        }
        
        # 각 그룹별로 데이터 수집 (중복 파일명 제거 - 가장 최근 것만 사용)
        # suffix를 제외한 기본 파일명으로 비교하여 같은 파일의 다른 버전 제거
        import re
        
        def get_base_filename(filename: str) -> str:
            """파일명에서 suffix를 제거한 기본 이름 반환 (예: "SIN_Timeseries_Dry Bulk Trade_10_25.xlsx" -> "SIN_Timeseries_Dry Bulk Trade")"""
            # "_MM_YY.xlsx" 패턴 제거
            pattern = r'_\d{2}_\d{2}\.xlsx$'
            base = re.sub(pattern, '', filename, flags=re.IGNORECASE)
            return base.lower()
        
        seen_base_filenames = {}  # group_name -> {base_filename: (dataset_info, uploaded_at)}
        
        # Dry Bulk 관련 그룹만 처리 (container 관련 그룹은 제외)
        drybulk_groups = ["drybulk_trade", "fleet_development", "indices"]
        
        for group_name, dataset_ids in groups.items():
            # Dry Bulk 관련 그룹만 처리
            if group_name not in drybulk_groups:
                continue
            # 각 그룹의 데이터셋을 업로드 시간 순으로 정렬 (오래된 것부터)
            datasets_list = []
            for dataset_id in dataset_ids:
                dataset = session.query(Dataset).filter_by(id=dataset_id).first()
                if dataset:
                    datasets_list.append(dataset)
            
            # 업로드 시간 순으로 정렬 (최신 것부터)
            datasets_list.sort(key=lambda d: d.uploaded_at, reverse=True)
            
            for dataset in datasets_list:
                file_path = Config.EXCEL_FOLDER / dataset.stored_filename
                if not file_path.exists():
                    continue
                
                filename = dataset.original_filename
                
                # 현재 월 - 1 접미사가 포함된 파일만 처리
                if target_suffix not in filename.lower():
                    continue
                
                base_filename = get_base_filename(filename)
                
                # 이미 같은 기본 파일명이 있으면 업로드 시간 비교
                if group_name not in seen_base_filenames:
                    seen_base_filenames[group_name] = {}
                
                if base_filename in seen_base_filenames[group_name]:
                    # 이미 있는 경우, 더 최근 것만 유지 (정렬되어 있으므로 현재 것이 더 최신)
                    # 기존 것을 제거 (기본 파일명으로 비교)
                    existing_info, existing_time = seen_base_filenames[group_name][base_filename]
                    existing_base = get_base_filename(existing_info.get("filename", ""))
                    result[group_name] = [r for r in result[group_name] if get_base_filename(r.get("filename", "")) != base_filename]
                
                # 엑셀 데이터 읽기
                excel_data = read_excel_file(file_path, original_filename=dataset.original_filename)
                
                # Date 컬럼 찾기
                date_col = find_date_column(excel_data.get("selected_columns", excel_data.get("columns", [])))
                if not date_col:
                    continue
                
                # 2021년 이후 필터링
                filtered_data = filter_data_by_year(
                    excel_data.get("data", []),
                    date_col,
                    year=2021
                )
                
                if filtered_data:
                    dataset_info = {
                        "dataset_id": dataset.id,
                        "filename": dataset.original_filename,
                        "columns": excel_data.get("selected_columns", []),
                        "data": filtered_data,
                        "date_column": date_col
                    }
                    seen_base_filenames[group_name][base_filename] = (dataset_info, dataset.uploaded_at)
                    result[group_name].append(dataset_info)
        
        # 최종 결과에 사용된 파일명 출력
        print("\n=== 최종 그래프에 사용된 파일 ===")
        print(f"Dry Bulk Trade: {[r['filename'] for r in result['drybulk_trade']]}")
        print(f"Fleet Development: {[r['filename'] for r in result['fleet_development']]}")
        print(f"Indices: {[r['filename'] for r in result['indices']]}")
        print("=" * 50)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"그래프 데이터를 가져오는 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


@api_bp.route("/charts/data/bci", methods=["GET"])
def get_bci_chart_data():
    """BCI Index 전용 엔드포인트 - 빠른 응답을 위해 BCI 5TC 데이터만 반환."""
    from .utils import get_previous_month_year_suffix
    
    session = get_session()
    try:
        # 현재 월 - 1의 접미사 사용
        target_suffix = get_previous_month_year_suffix().lower()
        
        # BCI 5TC 파일 찾기
        datasets = session.query(Dataset).filter(
            Dataset.original_filename.ilike(f'%BCI 5TC%{target_suffix}%')
        ).order_by(Dataset.uploaded_at.desc()).all()
        
        if not datasets:
            return jsonify({"error": "BCI 5TC 데이터를 찾을 수 없습니다."}), 404
        
        # 가장 최근 파일 사용
        dataset = datasets[0]
        file_path = Config.EXCEL_FOLDER / dataset.stored_filename
        
        if not file_path.exists():
            return jsonify({"error": "BCI 5TC 파일이 서버에서 삭제되었습니다."}), 404
        
        # 엑셀 데이터 읽기
        excel_data = read_excel_file(file_path, original_filename=dataset.original_filename)
        
        # Date 컬럼 찾기
        date_col = find_date_column(excel_data.get("selected_columns", excel_data.get("columns", [])))
        if not date_col:
            return jsonify({"error": "날짜 컬럼을 찾을 수 없습니다."}), 404
        
        # 534544 코드가 포함된 컬럼 찾기
        target_column = None
        for col in excel_data.get("selected_columns", excel_data.get("columns", [])):
            if col != date_col and '534544' in str(col):
                target_column = col
                break
        
        if not target_column:
            return jsonify({"error": "BCI 컬럼(534544)을 찾을 수 없습니다."}), 404
        
        # 2021년 이후 필터링
        filtered_data = filter_data_by_year(
            excel_data.get("data", []),
            date_col,
            year=2021
        )
        
        if not filtered_data:
            return jsonify({"error": "2021년 이후 데이터가 없습니다."}), 404
        
        # 결과 반환
        result = {
            "filename": dataset.original_filename,
            "date_column": date_col,
            "target_column": target_column,
            "data": filtered_data,
            "columns": excel_data.get("selected_columns", [])
        }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"BCI 데이터를 가져오는 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()


@api_bp.route("/charts/data/container", methods=["GET"])
def get_container_chart_data():
    """Container 그래프 데이터를 반환 (2021년 이후 필터링, 그룹별). 현재 월 - 1의 _월_년 형식 파일만 사용."""
    from .utils import get_previous_month_year_suffix
    
    session = get_session()
    try:
        # 현재 월 - 1의 접미사 사용
        target_suffix = get_previous_month_year_suffix().lower()
        
        # 카테고리별로 데이터셋 그룹화
        groups = group_datasets_by_category()
        
        # 디버깅: 각 그룹의 파일명 출력
        print("\n=== Container 그래프 데이터 디버깅 정보 ===")
        print(f"대상 접미사 (현재 월 - 1): {target_suffix}")
        print(f"\nContainer Trade & Fleet 파일들:")
        for dataset_id in groups.get("container_trade_fleet", []):
            dataset = session.query(Dataset).filter_by(id=dataset_id).first()
            if dataset:
                print(f"  - {dataset.original_filename} (ID: {dataset.id})")
        print(f"\nSCFI Weekly 파일들:")
        for dataset_id in groups.get("scfi_weekly", []):
            dataset = session.query(Dataset).filter_by(id=dataset_id).first()
            if dataset:
                print(f"  - {dataset.original_filename} (ID: {dataset.id})")
        print("=" * 50)
        
        result = {
            "container_trade_fleet": [],
            "scfi_weekly": []
        }
        
        # 각 그룹별로 데이터 수집
        import re
        
        def get_base_filename(filename: str) -> str:
            """파일명에서 suffix를 제거한 기본 이름 반환"""
            pattern = r'_\d{2}_\d{2}\.xlsx$'
            base = re.sub(pattern, '', filename, flags=re.IGNORECASE)
            return base.lower()
        
        seen_base_filenames = {}
        
        for group_name in ["container_trade_fleet", "scfi_weekly"]:
            dataset_ids = groups.get(group_name, [])
            
            # 각 그룹의 데이터셋을 업로드 시간 순으로 정렬 (최신 것부터)
            datasets_list = []
            for dataset_id in dataset_ids:
                dataset = session.query(Dataset).filter_by(id=dataset_id).first()
                if dataset:
                    datasets_list.append(dataset)
            
            datasets_list.sort(key=lambda d: d.uploaded_at, reverse=True)
            
            for dataset in datasets_list:
                file_path = Config.EXCEL_FOLDER / dataset.stored_filename
                if not file_path.exists():
                    continue
                
                filename = dataset.original_filename
                
                # 현재 월 - 1 접미사가 포함된 파일만 처리
                if target_suffix not in filename.lower():
                    continue
                
                base_filename = get_base_filename(filename)
                
                # 이미 같은 기본 파일명이 있으면 제거
                if group_name not in seen_base_filenames:
                    seen_base_filenames[group_name] = {}
                
                if base_filename in seen_base_filenames[group_name]:
                    result[group_name] = [r for r in result[group_name] if get_base_filename(r.get("filename", "")) != base_filename]
                
                # 엑셀 데이터 읽기
                excel_data = read_excel_file(file_path, original_filename=dataset.original_filename)
                
                # Date 컬럼 찾기
                date_col = find_date_column(excel_data.get("selected_columns", excel_data.get("columns", [])))
                if not date_col:
                    continue
                
                # 2021년 이후 필터링
                filtered_data = filter_data_by_year(
                    excel_data.get("data", []),
                    date_col,
                    year=2021
                )
                
                if filtered_data:
                    dataset_info = {
                        "dataset_id": dataset.id,
                        "filename": dataset.original_filename,
                        "columns": excel_data.get("selected_columns", []),
                        "data": filtered_data,
                        "date_column": date_col
                    }
                    seen_base_filenames[group_name][base_filename] = (dataset_info, dataset.uploaded_at)
                    result[group_name].append(dataset_info)
        
        # 최종 결과에 사용된 파일명 출력
        print("\n=== 최종 Container 그래프에 사용된 파일 ===")
        print(f"Container Trade & Fleet: {[r['filename'] for r in result['container_trade_fleet']]}")
        print(f"SCFI Weekly: {[r['filename'] for r in result['scfi_weekly']]}")
        print("=" * 50)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Container 그래프 데이터를 가져오는 중 오류가 발생했습니다: {str(e)}"}), 500
    finally:
        session.close()
