# -*- coding: utf-8 -*-
"""Test inserting into datasets table."""

from app.database import init_engine, get_session, init_db
from app.config import Config
from app.models import Dataset
import json

# Initialize database
init_engine(Config.DATABASE_URL)
init_db()

# Test insert
session = get_session()
try:
    dataset = Dataset(
        original_filename='test.xlsx',
        stored_filename='test123.xlsx',
        sheet_name='Sheet1',
        row_count=10,
        column_count=5,
        columns_json=json.dumps(['col1', 'col2'], ensure_ascii=False),
    )
    session.add(dataset)
    session.commit()
    print(f"Success! Inserted dataset with id: {dataset.id}")
except Exception as e:
    session.rollback()
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    session.close()

















