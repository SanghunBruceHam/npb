#!/usr/bin/env python3
"""
KBO 데이터 크롤링 시스템 - Python 개선 버전
실제 Daum Sports 페이지 구조에 맞게 파싱 로직 개선
"""

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time
import re
from datetime import datetime, timedelta
import pandas as pd
import os

class KBOImprovedCrawler:
    def __init__(self):
        self.base_urls = {
            'daum_schedule': 'https://sports.daum.net/schedule/kbo'
        }
        
        self.team_mapping = {
            'KIA': 'KIA', 'KT': 'KT', 'LG': 'LG', 'NC': 'NC', 'SSG': 'SSG',
            '두산': '두산', '롯데': '롯데', '삼성': '삼성', '키움': '키움', '한화': '한화',
            'SK': 'SSG', '기아': 'KIA'
        }
        
        print("🏟️ KBO Python 개선 크롤러 초기화 완료")

    def setup_selenium_driver(self, headless=False):
        """Selenium WebDriver 설정"""
        print("🚀 Selenium WebDriver 설정 중...")
        
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        
        try:
            driver = webdriver.Chrome(options=chrome_options)
            print("✅ Chrome WebDriver 설정 완료")
            return driver
        except Exception as e:
            print(f"❌ WebDriver 설정 실패: {e}")
            return None

    def get_daum_sports_data(self, year=2025, month=7):
        """다음 스포츠에서 KBO 데이터 가져오기 - 개선된 방법"""
        print(f"📡 다음 스포츠에서 {year}년 {month}월 KBO 데이터 수집 중...")
        
        driver = self.setup_selenium_driver(headless=False)
        if not driver:
            return []
        
        try:
            # 월별 스케줄 페이지로 이동
            target_month = f"{year}{month:02d}"
            url = f"{self.base_urls['daum_schedule']}?date={target_month}"
            
            print(f"🔗 접속 URL: {url}")
            driver.get(url)
            
            # 페이지 로딩 대기
            time.sleep(5)
            
            # 스크린샷 저장
            driver.save_screenshot('daum-improved-debug.png')
            print("📸 디버그 스크린샷 저장: daum-improved-debug.png")
            
            # 전체 HTML 소스 가져오기
            html_source = driver.page_source
            soup = BeautifulSoup(html_source, 'html.parser')
            
            # 방법 1: 경기 카드에서 직접 추출
            games = self.extract_from_game_cards(soup)
            
            if not games:
                # 방법 2: 스케줄 테이블에서 추출 (백업)
                games = self.extract_from_schedule_table(soup)
            
            print(f"✅ 총 {len(games)}개 경기 데이터 수집 완료")
            return games
            
        except Exception as e:
            print(f"❌ 다음 스포츠 크롤링 실패: {e}")
            return []
        finally:
            time.sleep(3)  # 확인을 위해 잠시 대기
            driver.quit()

    def extract_from_game_cards(self, soup):
        """경기 카드에서 데이터 추출 (메인 방법)"""
        print("🎯 경기 카드에서 데이터 추출 시도...")
        
        games = []
        
        # 경기 카드 찾기 - 다양한 선택자 시도
        card_selectors = [
            '.match_info',
            '.game_info', 
            '.match_card',
            '[class*="match"]',
            '[class*="game"]'
        ]
        
        game_cards = []
        for selector in card_selectors:
            cards = soup.select(selector)
            if cards:
                print(f"📋 '{selector}' 선택자로 {len(cards)}개 카드 발견")
                game_cards.extend(cards)
        
        # 중복 제거
        unique_cards = []
        seen_texts = set()
        for card in game_cards:
            card_text = card.get_text(strip=True)[:100]  # 처음 100자만 비교
            if card_text not in seen_texts:
                seen_texts.add(card_text)
                unique_cards.append(card)
        
        print(f"📋 중복 제거 후 {len(unique_cards)}개 고유 카드")
        
        # 각 카드에서 데이터 추출
        for card_index, card in enumerate(unique_cards):
            try:
                game_data = self.parse_game_card(card, card_index)
                if game_data:
                    games.append(game_data)
            except Exception as e:
                print(f"⚠️ 카드 {card_index + 1} 파싱 오류: {e}")
                continue
        
        return games

    def parse_game_card(self, card, card_index):
        """개별 경기 카드 파싱"""
        try:
            card_text = card.get_text(strip=True)
            
            # 팀명이 포함된 카드인지 확인
            teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화']
            found_teams = [team for team in teams if team in card_text]
            
            if len(found_teams) < 2:
                return None
            
            print(f"\n🎯 카드 {card_index + 1} 분석:")
            print(f"   텍스트: {card_text[:100]}...")
            print(f"   발견된 팀: {found_teams}")
            
            # 점수 패턴 찾기
            score_patterns = [
                r'(\d+)\s*:\s*(\d+)',  # 3:2 형태
                r'(\d+)\s*-\s*(\d+)',  # 3-2 형태
                r'(\d+)\s+(\d+)'       # 3 2 형태
            ]
            
            scores = []
            for pattern in score_patterns:
                matches = re.findall(pattern, card_text)
                for match in matches:
                    score1, score2 = int(match[0]), int(match[1])
                    if 0 <= score1 <= 30 and 0 <= score2 <= 30:  # 유효한 점수 범위
                        scores.append((score1, score2))
            
            if not scores:
                print(f"   ❌ 점수를 찾을 수 없음")
                return None
            
            # 날짜 추출
            date_patterns = [
                r'(\d{2})\.(\d{2})',    # 07.01 형태
                r'(\d{1,2})월\s*(\d{1,2})일',  # 7월 1일 형태
                r'2025[.-](\d{2})[.-](\d{2})'  # 2025-07-01 형태
            ]
            
            game_date = None
            for pattern in date_patterns:
                match = re.search(pattern, card_text)
                if match:
                    month = match.group(1).zfill(2)
                    day = match.group(2).zfill(2)
                    game_date = f"2025-{month}-{day}"
                    break
            
            if not game_date:
                # 기본값으로 현재 날짜 사용
                game_date = datetime.now().strftime('%Y-%m-%d')
            
            # 경기 데이터 생성
            game_data = {
                'date': game_date,
                'away_team': self.normalize_team_name(found_teams[0]),
                'home_team': self.normalize_team_name(found_teams[1]),
                'away_score': scores[0][0],
                'home_score': scores[0][1],
                'source': f'card_{card_index + 1}',
                'raw_text': card_text[:200]
            }
            
            print(f"   ✅ 경기 추출: {game_data['away_team']} {game_data['away_score']}:{game_data['home_score']} {game_data['home_team']} ({game_data['date']})")
            return game_data
            
        except Exception as e:
            print(f"   ❌ 카드 파싱 실패: {e}")
            return None

    def extract_from_schedule_table(self, soup):
        """스케줄 테이블에서 데이터 추출 (백업 방법)"""
        print("🎯 스케줄 테이블에서 데이터 추출 시도...")
        
        games = []
        
        # 테이블 찾기
        schedule_table = soup.find('tbody', id='scheduleList')
        if not schedule_table:
            print("❌ 스케줄 테이블을 찾을 수 없음")
            return []
        
        rows = schedule_table.find_all('tr')
        print(f"📊 테이블에서 {len(rows)}개 행 발견")
        
        current_date = None
        
        for row_index, row in enumerate(rows):
            cells = row.find_all('td')
            if len(cells) == 0:
                continue
            
            # 날짜 셀 확인
            date_cell = cells[0].get_text(strip=True)
            if re.match(r'\d{2}\.\d{2}', date_cell):
                month_day = date_cell.split('.')
                current_date = f"2025-{month_day[0]}-{month_day[1]}"
                continue
            
            if not current_date:
                continue
            
            # 팀명과 점수 추출
            row_text = row.get_text(strip=True)
            teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화']
            found_teams = [team for team in teams if team in row_text]
            
            if len(found_teams) >= 2:
                # 점수 추출
                scores = []
                for cell in cells:
                    cell_text = cell.get_text(strip=True)
                    if re.match(r'^\d+$', cell_text):
                        score = int(cell_text)
                        if 0 <= score <= 30:
                            scores.append(score)
                
                if len(scores) >= 2:
                    game_data = {
                        'date': current_date,
                        'away_team': self.normalize_team_name(found_teams[0]),
                        'home_team': self.normalize_team_name(found_teams[1]),
                        'away_score': scores[0],
                        'home_score': scores[1],
                        'source': f'table_row_{row_index + 1}',
                        'raw_text': row_text[:200]
                    }
                    
                    games.append(game_data)
                    print(f"✅ 테이블에서 경기 추출: {game_data['away_team']} {game_data['away_score']}:{game_data['home_score']} {game_data['home_team']} ({game_data['date']})")
        
        return games

    def normalize_team_name(self, team_name):
        """팀명 정규화"""
        if not team_name:
            return None
        
        cleaned = team_name.strip()
        return self.team_mapping.get(cleaned, cleaned)

    def convert_to_clean_format(self, games):
        """clean.txt 형식으로 변환"""
        print("🔄 clean.txt 형식으로 변환 중...")
        
        # 날짜별로 그룹화
        date_groups = {}
        for game in games:
            date = game['date']
            if date not in date_groups:
                date_groups[date] = []
            
            # clean.txt 형식: "원정팀 점수:점수 홈팀(H)"
            clean_line = f"{game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']}(H)"
            date_groups[date].append(clean_line)
        
        # 날짜 순으로 정렬하여 텍스트 생성
        result = []
        for date in sorted(date_groups.keys()):
            result.append(date)
            for game_line in date_groups[date]:
                result.append(game_line)
            result.append('')  # 빈 줄
        
        return '\n'.join(result).strip()

    def save_to_files(self, games, prefix='kbo-improved'):
        """데이터를 파일로 저장"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # JSON 파일 저장
        json_filename = f"{prefix}-{timestamp}.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(games, f, ensure_ascii=False, indent=2)
        print(f"💾 JSON 파일 저장: {json_filename}")
        
        # Clean.txt 형식 저장
        if games:
            clean_format = self.convert_to_clean_format(games)
            clean_filename = f"{prefix}-{timestamp}-clean.txt"
            with open(clean_filename, 'w', encoding='utf-8') as f:
                f.write(clean_format)
            print(f"💾 Clean.txt 파일 저장: {clean_filename}")
        
        return json_filename

    def run_crawling(self, year=2025, month=7):
        """크롤링 실행"""
        print(f"🎯 {year}년 {month}월 KBO 데이터 수집 시작")
        
        # 다음 스포츠에서 데이터 수집
        games = self.get_daum_sports_data(year, month)
        
        if games:
            # 중복 제거
            unique_games = self.remove_duplicates(games)
            print(f"🔄 중복 제거 후: {len(unique_games)}개 경기")
            
            # 파일로 저장
            filename = self.save_to_files(unique_games, f'kbo-{year}-{month:02d}')
            
            # 결과 요약
            print(f"\n📊 크롤링 결과 요약:")
            print(f"- 총 경기 수: {len(unique_games)}개")
            print(f"- 저장 파일: {filename}")
            
            # 날짜별 경기 수 출력
            date_counts = {}
            for game in unique_games:
                date = game['date']
                date_counts[date] = date_counts.get(date, 0) + 1
            
            print("\n📅 날짜별 경기 수:")
            for date in sorted(date_counts.keys()):
                print(f"  {date}: {date_counts[date]}개 경기")
            
            # 샘플 경기 출력
            print("\n🏟️ 샘플 경기들:")
            for game in unique_games[:10]:
                print(f"  {game['date']}: {game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']}")
            
            return unique_games
        else:
            print("❌ 수집된 경기 데이터가 없습니다.")
            return []

    def remove_duplicates(self, games):
        """중복 경기 제거"""
        unique_games = []
        seen_games = set()
        
        for game in games:
            # 게임 식별자 생성
            game_key = f"{game['date']}-{game['away_team']}-{game['home_team']}-{game['away_score']}-{game['home_score']}"
            
            if game_key not in seen_games:
                seen_games.add(game_key)
                unique_games.append(game)
        
        return unique_games

def main():
    """메인 실행 함수"""
    crawler = KBOImprovedCrawler()
    
    print("=" * 60)
    print("🏟️ KBO Python 개선 크롤링 시스템")
    print("📡 실제 페이지 구조에 맞게 최적화")
    print("=" * 60)
    
    # 2025년 7월 데이터 수집
    results = crawler.run_crawling(2025, 7)
    
    print("\n" + "=" * 60)
    if results:
        print("✅ KBO Python 크롤링 성공!")
        print(f"📊 총 {len(results)}개 경기 데이터 수집 완료")
    else:
        print("❌ KBO Python 크롤링 실패")
    print("=" * 60)

if __name__ == "__main__":
    main()