#!/usr/bin/env python3
"""
테이블 구조 정확히 분석
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime

def analyze_table_structure():
    target_date = datetime(2025, 3, 28)
    date_str = target_date.strftime("%Y%m%d")
    year = target_date.strftime("%Y")
    url = f"https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date_str}.html"
    
    print(f"🔍 Analyzing table structure: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        score_tables = soup.find_all('table', class_='scoreTable')
        print(f"Found {len(score_tables)} scoreTable(s)")
        
        for i, table in enumerate(score_tables):
            print(f"\n📋 Table {i+1}:")
            rows = table.find_all('tr')
            print(f"  Rows: {len(rows)}")
            
            for j, row in enumerate(rows):
                cells = row.find_all(['td', 'th'])
                print(f"  Row {j+1}: {len(cells)} cells")
                
                for k, cell in enumerate(cells):
                    cell_class = cell.get('class', [])
                    cell_text = cell.get_text(strip=True).replace('\xa0', '')
                    print(f"    Cell {k+1}: '{cell_text}' (class: {cell_class})")
                    
            print()
                    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    analyze_table_structure()