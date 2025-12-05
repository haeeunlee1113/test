"""Re-extract PDF metadata and full text for existing database records."""

from __future__ import annotations

import argparse
from pathlib import Path

from app.config import Config
from app.database import get_session, init_engine
from app.models import PDFContent
from app.utils import extract_pdf_info


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Re-extract PDF data for existing records.")
    parser.add_argument(
        "--min-id",
        type=int,
        default=None,
        help="Start processing from the specified PDF id (inclusive).",
    )
    parser.add_argument(
        "--max-id",
        type=int,
        default=None,
        help="Stop processing at the specified PDF id (inclusive).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(f"옵션: min_id={args.min_id}, max_id={args.max_id}")

    init_engine(Config.DATABASE_URL)
    session = get_session()
    try:
        query = session.query(PDFContent).order_by(PDFContent.id)
        if args.min_id is not None:
            query = query.filter(PDFContent.id >= args.min_id)
        if args.max_id is not None:
            query = query.filter(PDFContent.id <= args.max_id)

        pdfs = query.all()
        print(f"총 {len(pdfs)}개의 PDF 레코드를 재처리합니다.")

        for pdf in pdfs:
            file_path: Path = Config.PDF_FOLDER / pdf.stored_filename
            if not file_path.exists():
                print(f"[건너뜀] ID={pdf.id} - 파일을 찾을 수 없습니다: {file_path.name}")
                continue

            print(f"[처리 시작] ID={pdf.id} - 파일={file_path.name}")

            try:
                info = extract_pdf_info(file_path, include_full_text=True)
            except Exception as exc:  # pragma: no cover - 로깅 목적
                print(f"[오류] ID={pdf.id} - 추출 실패: {exc}")
                continue

            pdf.page_count = info.get("page_count") or 0
            pdf.file_size_kb = int(info.get("file_size_kb") or 0)
            pdf.preview_text = info.get("preview_text")
            pdf.full_text = info.get("full_text")

            text_length = len(pdf.full_text) if pdf.full_text else 0
            print(
                f"[완료] ID={pdf.id} - pages={pdf.page_count}, "
                f"size={pdf.file_size_kb}KB, text_len={text_length}"
            )

        session.commit()
        print("모든 변경 사항을 커밋했습니다.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()

