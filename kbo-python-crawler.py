#!/usr/bin/env python3
"""
KBO 데이터 크롤링 시스템 - Python 버전
LOPES-HUFS/KBO_data 프로젝트 참고하여 개발
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

class KBOPythonCrawler:
    def __init__(self):
        self.base_urls = {
            'naver_schedule': 'https://sports.naver.com/kbaseball/schedule/index',
            'naver_game': 'https://sports.naver.com/game/kbaseball/gameResult',
            'daum_schedule': 'https://sports.daum.net/schedule/kbo'
        }
        
        self.team_mapping = {
            'KIA': 'KIA', 'KT': 'KT', 'LG': 'LG', 'NC': 'NC', 'SSG': 'SSG',
            '두산': '두산', '롯데': '롯데', '삼성': '삼성', '키움': '키움', '한화': '한화',
            'SK': 'SSG',  # SK → SSG 변환
            '기아': 'KIA'  # 기아 → KIA 변환
        }
        
        print("🏟️ KBO Python 크롤러 초기화 완료")

    def setup_selenium_driver(self, headless=True):
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

    def get_today_schedule_naver(self):
        """네이버에서 오늘 경기 스케줄 가져오기"""
        print("📡 네이버에서 오늘 경기 스케줄 수집 중...")
        
        try:
            url = f"{self.base_urls['naver_schedule']}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 경기 정보 추출
            games = []
            game_elements = soup.find_all('div', class_='MatchBox')
            
            for game_element in game_elements:
                try:
                    # 팀명 추출
                    teams = game_element.find_all('span', class_='teamName')
                    if len(teams) >= 2:
                        away_team = teams[0].text.strip()
                        home_team = teams[1].text.strip()
                        
                        # 점수 또는 시간 추출
                        score_element = game_element.find('span', class_='score')
                        state = score_element.text.strip() if score_element else "정보없음"
                        
                        games.append({
                            'away_team': self.normalize_team_name(away_team),
                            'home_team': self.normalize_team_name(home_team),
                            'state': state,
                            'date': datetime.now().strftime('%Y-%m-%d')
                        })
                        
                except Exception as e:
                    print(f"⚠️ 게임 정보 추출 오류: {e}")
                    continue
            
            print(f"✅ 네이버에서 {len(games)}개 경기 정보 수집 완료")
            return games
            
        except Exception as e:
            print(f"❌ 네이버 스케줄 수집 실패: {e}")
            return []

    def get_monthly_schedule_daum(self, year=2025, month=7):
        """다음 스포츠에서 월별 경기 스케줄 가져오기 (Selenium 사용)"""
        print(f"📡 다음 스포츠에서 {year}년 {month}월 경기 스케줄 수집 중...")
        
        driver = self.setup_selenium_driver(headless=False)  # 디버깅을 위해 브라우저 표시
        if not driver:
            return []
        
        try:
            # 다음 스포츠 월별 스케줄 페이지
            target_month = f"{year}{month:02d}"
            url = f"{self.base_urls['daum_schedule']}?date={target_month}"
            
            print(f"🔗 접속 URL: {url}")
            driver.get(url)
            
            # 페이지 로딩 대기
            time.sleep(5)
            
            # JavaScript 데이터 로딩 대기
            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located((By.ID, "scheduleList"))
                )
                print("✅ 스케줄 데이터 로딩 완료")
            except:
                print("⚠️ 스케줄 데이터 로딩 타임아웃")
            
            # 추가 대기
            time.sleep(3)
            
            # 스크린샷 저장
            driver.save_screenshot('daum-python-crawler-debug.png')
            print("📸 디버그 스크린샷 저장: daum-python-crawler-debug.png")
            
            # HTML 소스 가져오기
            html_source = driver.page_source
            soup = BeautifulSoup(html_source, 'html.parser')
            
            # 스케줄 테이블에서 데이터 추출
            games = []
            schedule_table = soup.find('tbody', id='scheduleList')
            
            if schedule_table:
                rows = schedule_table.find_all('tr')
                print(f"📊 {len(rows)}개 행 발견")
                
                current_date = None
                
                for row_index, row in enumerate(rows):
                    cells = row.find_all('td')
                    if len(cells) == 0:
                        continue
                    
                    print(f"\n=== 행 {row_index + 1} 분석 ===")
                    
                    # 날짜 추출 (첫 번째 셀에서)
                    date_cell = cells[0].get_text(strip=True)
                    if date_cell and re.match(r'\d{2}\.\d{2}', date_cell):
                        # "07.01" 형식을 "2025-07-01" 형식으로 변환
                        month_day = date_cell.split('.')
                        current_date = f"{year}-{month_day[0]}-{month_day[1]}"
                        print(f"📅 날짜 발견: {current_date}")
                        continue
                    
                    if not current_date:
                        continue
                    
                    # 팀명과 점수 추출
                    team_images = row.find_all('img')
                    team_names = []
                    
                    for img in team_images:
                        alt_text = img.get('alt', '')
                        if alt_text in self.team_mapping:
                            team_names.append(self.normalize_team_name(alt_text))
                    
                    # 점수 추출
                    scores = []
                    for cell in cells:
                        cell_text = cell.get_text(strip=True)
                        if re.match(r'^\d+$', cell_text) and 0 <= int(cell_text) <= 30:
                            scores.append(int(cell_text))
                    
                    # 경기 정보 생성
                    if len(team_names) >= 2 and len(scores) >= 2:
                        game = {
                            'date': current_date,
                            'away_team': team_names[0],
                            'home_team': team_names[1],
                            'away_score': scores[0],
                            'home_score': scores[1],
                            'source': f'daum_row_{row_index + 1}'
                        }
                        
                        games.append(game)
                        print(f"✅ 경기 추출: {game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']} ({game['date']})")
            
            else:
                print("❌ 스케줄 테이블을 찾을 수 없음")
            
            print(f"✅ 다음 스포츠에서 총 {len(games)}개 경기 정보 수집 완료")
            return games
            
        except Exception as e:
            print(f"❌ 다음 스포츠 크롤링 실패: {e}")
            return []
        finally:
            driver.quit()

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
            if 'away_score' in game and 'home_score' in game:
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

    def save_to_files(self, games, prefix='kbo-python'):
        """데이터를 파일로 저장"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # JSON 파일 저장
        json_filename = f"{prefix}-{timestamp}.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(games, f, ensure_ascii=False, indent=2)
        print(f"💾 JSON 파일 저장: {json_filename}")
        
        # Clean.txt 형식 저장
        if games and 'away_score' in games[0]:  # 점수 정보가 있는 경우만
            clean_format = self.convert_to_clean_format(games)
            clean_filename = f"{prefix}-{timestamp}-clean.txt"
            with open(clean_filename, 'w', encoding='utf-8') as f:
                f.write(clean_format)
            print(f"💾 Clean.txt 파일 저장: {clean_filename}")
        
        return json_filename

    def run_full_crawling(self, year=2025, month=7):
        """전체 크롤링 실행"""
        print(f"🎯 {year}년 {month}월 KBO 데이터 수집 시작")
        
        # 1. 다음 스포츠에서 월별 경기 결과 수집
        games = self.get_monthly_schedule_daum(year, month)
        
        if games:
            # 2. 파일로 저장
            filename = self.save_to_files(games, f'kbo-{year}-{month:02d}')
            
            # 3. 결과 요약
            print(f"\n📊 크롤링 결과 요약:")
            print(f"- 총 경기 수: {len(games)}개")
            print(f"- 저장 파일: {filename}")
            
            # 4. 날짜별 경기 수 출력
            date_counts = {}
            for game in games:
                date = game['date']
                date_counts[date] = date_counts.get(date, 0) + 1
            
            print("\n📅 날짜별 경기 수:")
            for date in sorted(date_counts.keys()):
                print(f"  {date}: {date_counts[date]}개 경기")
            
            return games
        else:
            print("❌ 수집된 경기 데이터가 없습니다.")
            return []

def main():
    """메인 실행 함수"""
    crawler = KBOPythonCrawler()
    
    print("=" * 60)
    print("🏟️ KBO Python 크롤링 시스템")
    print("📡 LOPES-HUFS/KBO_data 프로젝트 기반")
    print("=" * 60)
    
    # 2025년 7월 데이터 수집
    results = crawler.run_full_crawling(2025, 7)
    
    print("\n" + "=" * 60)
    if results:
        print("✅ KBO Python 크롤링 완료!")
        print(f"📊 총 {len(results)}개 경기 데이터 수집 성공")
    else:
        print("❌ KBO Python 크롤링 실패")
    print("=" * 60)

if __name__ == "__main__":
    main()