# -*- coding: utf-8 -*-
"""Test script to read Excel file."""

from pathlib import Path
from app.utils import read_excel_file

file_path = Path(r"C:\Users\POSRI\Desktop\dashboard_xlsx\SIN_Timeseries_BCI 5TC.xlsx")

try:
    print(f"Reading file: {file_path}")
    print(f"File exists: {file_path.exists()}")
    
    if file_path.exists():
        excel_data = read_excel_file(file_path)
        print(f"\n=== Excel File Info ===")
        print(f"Rows: {excel_data['row_count']}")
        print(f"Columns: {excel_data['column_count']}")
        print(f"\nColumn names:")
        for i, col in enumerate(excel_data['columns'], 1):
            print(f"  {i}. {col}")
        
        print(f"\n=== First 5 rows ===")
        for i, row in enumerate(excel_data['data'][:5], 1):
            print(f"\nRow {i}:")
            for key, value in row.items():
                print(f"  {key}: {value}")
    else:
        print("File does not exist!")
        
except Exception as e:
    print(f"Error reading file: {e}")
    import traceback
    traceback.print_exc()













