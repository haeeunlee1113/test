#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Delete all records from deep_research reports table."""

import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import init_engine, get_session
from app.config import Config
from app.models import DeepResearchReport

def delete_all_deep_research():
    """Delete all records from reports_deep_research table."""
    # Initialize database engine
    init_engine(Config.DATABASE_URL)
    
    session = get_session()
    try:
        # Count records before deletion
        count_before = session.query(DeepResearchReport).count()
        print(f"삭제 전 deep_research 보고서 수: {count_before}개")
        
        if count_before == 0:
            print("삭제할 데이터가 없습니다.")
            return
        
        # Delete all records
        session.query(DeepResearchReport).delete()
        session.commit()
        
        # Count records after deletion
        count_after = session.query(DeepResearchReport).count()
        print(f"삭제 후 deep_research 보고서 수: {count_after}개")
        print(f"총 {count_before}개의 데이터가 삭제되었습니다.")
        print("테이블 구조는 유지되었습니다.")
        
    except Exception as e:
        session.rollback()
        print(f"오류 발생: {str(e)}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    print("=" * 50)
    print("deep_research 테이블의 모든 데이터 삭제 시작")
    print("=" * 50)
    delete_all_deep_research()
    print("=" * 50)
    print("작업 완료")
    print("=" * 50)

