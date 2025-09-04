#!/usr/bin/env python3
"""
크롤러 디버깅 - HTML 구조 확인
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime

def debug_crawl():
    target_date = datetime(2025, 3, 28)
    date_str = target_date.strftime("%Y%m%d")
    year = target_date.strftime("%Y")
    url = f"https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date_str}.html"
    
    print(f"🔍 Testing URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        print(f"✅ Status: {response.status_code}")
        print(f"📄 Content length: {len(response.text)} characters")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 제목 확인
        title = soup.find('title')
        if title:
            print(f"📋 Page title: {title.text}")
        
        # 경기 관련 클래스들 찾기
        print("\n🔍 Looking for game sections...")
        
        # 여러 가능한 클래스들 확인
        possible_classes = [
            'p-score-league',
            'score-league', 
            'game-league',
            'match-league',
            'result-league'
        ]
        
        for class_name in possible_classes:
            elements = soup.find_all('div', class_=class_name)
            if elements:
                print(f"Found {len(elements)} elements with class '{class_name}'")
        
        # 경기 관련 일반적인 요소들 찾기
        score_elements = soup.find_all(['div', 'span'], class_=lambda x: x and 'score' in str(x).lower())
        print(f"Found {len(score_elements)} elements with 'score' in class name")
        
        team_elements = soup.find_all(['div', 'span', 'a'], class_=lambda x: x and 'team' in str(x).lower())
        print(f"Found {len(team_elements)} elements with 'team' in class name")
        
        # 페이지의 주요 구조 출력
        print(f"\n📋 Main divs with classes:")
        main_divs = soup.find_all('div', class_=True)[:10]  # 처음 10개만
        for div in main_divs:
            classes = div.get('class', [])
            if classes:
                print(f"  - div class='{' '.join(classes)}'")
        
        # 실제 경기가 있는지 확인하기 위해 숫자 패턴 찾기
        import re
        score_pattern = re.compile(r'\d+\s*-\s*\d+')
        score_matches = score_pattern.findall(response.text)
        print(f"\n🎯 Found potential scores: {score_matches[:10] if score_matches else 'None'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_crawl()