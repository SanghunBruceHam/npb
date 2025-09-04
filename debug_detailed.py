#!/usr/bin/env python3
"""
상세 HTML 구조 분석
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime

def analyze_html_structure():
    target_date = datetime(2025, 3, 28)
    date_str = target_date.strftime("%Y%m%d")
    year = target_date.strftime("%Y")
    url = f"https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date_str}.html"
    
    print(f"🔍 Analyzing: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 경기 관련 가능한 컨테이너들 찾기
        print("📋 Looking for game containers...")
        
        # 테이블 형태 찾기
        tables = soup.find_all('table')
        print(f"Found {len(tables)} tables")
        
        for i, table in enumerate(tables[:3]):
            print(f"\nTable {i+1} classes: {table.get('class', [])}")
            rows = table.find_all('tr')[:3]  # 처음 3개 행만
            for j, row in enumerate(rows):
                cells = row.find_all(['td', 'th'])
                cell_texts = [cell.get_text(strip=True)[:20] for cell in cells[:5]]
                print(f"  Row {j+1}: {cell_texts}")
        
        # 특정 패턴의 div들 찾기
        print(f"\n🔍 Looking for score-related divs...")
        
        # 점수 관련 요소들
        score_divs = soup.find_all('div', class_=lambda x: x and any(word in ' '.join(x) for word in ['score', 'result', 'match', 'game']))
        print(f"Found {len(score_divs)} score-related divs")
        
        for i, div in enumerate(score_divs[:5]):
            classes = div.get('class', [])
            text = div.get_text(strip=True)[:50]
            print(f"  Div {i+1}: class='{' '.join(classes)}', text='{text}'")
        
        # 팀명이 포함된 요소들 찾기
        print(f"\n🏀 Looking for team names...")
        team_keywords = ['阪神', '巨人', 'ジャイアンツ', '中日', 'ヤクルト', 'DeNA', '広島']
        
        for keyword in team_keywords:
            elements = soup.find_all(text=lambda text: text and keyword in text)
            if elements:
                print(f"  Found '{keyword}': {len(elements)} times")
                # 첫 번째 발견 위치의 부모 요소 확인
                first_element = elements[0]
                parent = first_element.parent
                if parent:
                    print(f"    Parent: {parent.name}, class='{parent.get('class', [])}'")
        
        # JavaScript로 동적 로드되는지 확인
        scripts = soup.find_all('script')
        print(f"\n💻 Found {len(scripts)} script tags")
        
        for script in scripts:
            if script.string and ('score' in script.string.lower() or 'game' in script.string.lower()):
                print("  Found score/game related JavaScript")
                break
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    analyze_html_structure()