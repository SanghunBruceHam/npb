#!/usr/bin/env python3

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'venv', 'lib', 'python3.13', 'site-packages'))

import requests
from bs4 import BeautifulSoup
import re

def debug_page(date_str="20250830"):
    """니칸스포츠 페이지 디버그"""
    url = f"https://www.nikkansports.com/baseball/professional/score/2025/pf-score-{date_str}.html"
    
    print(f"🔍 Debugging URL: {url}")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.5',
        'Referer': 'https://www.nikkansports.com/'
    })
    
    try:
        response = session.get(url, timeout=15)
        response.raise_for_status()
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.content, 'html.parser')
        
        print(f"📄 Page title: {soup.title.string if soup.title else 'No title'}")
        
        # 모든 테이블 찾기
        tables = soup.find_all('table')
        print(f"📊 Total tables found: {len(tables)}")
        
        game_tables = 0
        for i, table in enumerate(tables):
            rows = table.find_all('tr')
            if len(rows) < 3:
                continue
                
            # 첫 번째 행 확인
            header_row = rows[0]
            header_text = header_row.get_text()
            
            print(f"\n--- Table {i+1} ---")
            print(f"Rows: {len(rows)}")
            print(f"Header: {header_text[:100]}...")
            
            # 이닝 헤더가 있는지 확인
            if re.search(r'[１２３４５６７８９]', header_text):
                game_tables += 1
                print(f"✅ This looks like a GAME table!")
                
                # 팀 정보 추출 시도
                team_rows = [row for row in rows[1:] 
                            if len(row.find_all(['td', 'th'])) >= 10]
                
                print(f"Team rows found: {len(team_rows)}")
                
                if len(team_rows) >= 2:
                    for j, team_row in enumerate(team_rows[:2]):
                        cells = team_row.find_all(['td', 'th'])
                        team_name = cells[0].get_text(strip=True) if cells else "Unknown"
                        total_score = cells[-1].get_text(strip=True) if cells else "?"
                        print(f"  Team {j+1}: {team_name} - Score: {total_score}")
                        
                    # 파싱 테스트
                    try:
                        away_row, home_row = team_rows[0], team_rows[1]
                        away_cells = away_row.find_all(['td', 'th'])
                        home_cells = home_row.find_all(['td', 'th'])
                        
                        away_score_text = away_cells[-1].get_text(strip=True)
                        home_score_text = home_cells[-1].get_text(strip=True)
                        
                        # 홈팀 X 처리
                        if 'X' in home_score_text:
                            home_score = sum(int(cell.get_text(strip=True)) 
                                           for cell in home_cells[1:-1] 
                                           if cell.get_text(strip=True).isdigit())
                        else:
                            home_score = int(home_score_text) if home_score_text.isdigit() else 0
                            
                        away_score = int(away_score_text) if away_score_text.isdigit() else 0
                        
                        print(f"  📊 Parsed scores: Away {away_score} - Home {home_score}")
                        
                    except Exception as parse_error:
                        print(f"  ❌ Parse error: {parse_error}")
            else:
                print("❌ Not a game table")
        
        print(f"\n🏟️ Total game tables found: {game_tables}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_page("20250830")  # 8월 30일 테스트