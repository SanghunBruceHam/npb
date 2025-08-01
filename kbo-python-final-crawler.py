#!/usr/bin/env python3
"""
KBO 데이터 크롤링 시스템 - Python 최종 버전
실제 페이지 구조에 정확히 맞춘 파싱 로직
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
import os

class KBOFinalCrawler:
    def __init__(self):
        self.base_urls = {
            'daum_schedule': 'https://sports.daum.net/schedule/kbo'
        }
        
        self.team_mapping = {
            'KIA': 'KIA', 'KT': 'KT', 'LG': 'LG', 'NC': 'NC', 'SSG': 'SSG',
            '두산': '두산', '롯데': '롯데', '삼성': '삼성', '키움': '키움', '한화': '한화',
            'SK': 'SSG', '기아': 'KIA'
        }
        
        print("🏟️ KBO Python 최종 크롤러 초기화 완료")

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
        """다음 스포츠에서 KBO 데이터 가져오기 - 최종 개선 버전"""
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
            
            # 월별 스케줄 테이블이 로딩될 때까지 대기
            try:
                # 스케줄 테이블 또는 경기 카드가 나타날 때까지 대기
                WebDriverWait(driver, 10).until(
                    lambda d: d.find_elements(By.CSS_SELECTOR, '.box_game') or 
                             d.find_elements(By.CSS_SELECTOR, 'table')
                )
                print("✅ 페이지 로딩 완료")
            except:
                print("⚠️ 페이지 로딩 타임아웃")
            
            # 추가 대기
            time.sleep(3)
            
            # 스크린샷 저장
            driver.save_screenshot('daum-final-debug.png')
            print("📸 디버그 스크린샷 저장: daum-final-debug.png")
            
            # HTML 소스 가져오기
            html_source = driver.page_source
            
            # HTML 파일로 저장 (디버깅용)
            with open('daum-page-source.html', 'w', encoding='utf-8') as f:
                f.write(html_source)
            print("💾 HTML 소스 저장: daum-page-source.html")
            
            # BeautifulSoup으로 파싱
            soup = BeautifulSoup(html_source, 'html.parser')
            
            # 방법 1: 상단 날짜별 경기 카드에서 추출
            games = self.extract_from_daily_cards(soup)
            
            # 방법 2: 하단 월별 테이블에서 추출
            if len(games) < 50:  # 7월은 최소 50경기 이상이어야 함
                print("🔄 월별 테이블에서 추가 데이터 추출 시도...")
                table_games = self.extract_from_monthly_table(driver, soup)
                games.extend(table_games)
            
            print(f"✅ 총 {len(games)}개 경기 데이터 수집 완료")
            return games
            
        except Exception as e:
            print(f"❌ 다음 스포츠 크롤링 실패: {e}")
            import traceback
            traceback.print_exc()
            return []
        finally:
            time.sleep(5)  # 결과 확인을 위해 5초 대기
            driver.quit()

    def extract_from_daily_cards(self, soup):
        """상단 날짜별 경기 카드에서 데이터 추출"""
        print("🎯 날짜별 경기 카드에서 데이터 추출 시도...")
        
        games = []
        
        # 경기 박스 찾기
        game_boxes = soup.find_all('div', class_='box_game')
        print(f"📦 {len(game_boxes)}개 경기 박스 발견")
        
        for box in game_boxes:
            # 각 경기 카드 찾기
            match_cards = box.find_all('div', class_=re.compile('match|game'))
            
            for card in match_cards:
                try:
                    # 날짜 추출 - 카드 상단이나 주변에서
                    date_element = card.find_previous(text=re.compile(r'\d{2}\.\d{2}'))
                    if date_element:
                        date_match = re.search(r'(\d{2})\.(\d{2})', str(date_element))
                        if date_match:
                            month = date_match.group(1).zfill(2)
                            day = date_match.group(2).zfill(2)
                            game_date = f"2025-{month}-{day}"
                        else:
                            game_date = "2025-07-01"
                    else:
                        game_date = "2025-07-01"
                    
                    # 팀 정보와 점수 추출
                    # 팀 로고/이름 찾기
                    team_elements = card.find_all('span', class_=re.compile('team|club'))
                    if len(team_elements) < 2:
                        team_elements = card.find_all('img', alt=True)
                    
                    if len(team_elements) >= 2:
                        away_team = self.extract_team_name(team_elements[0])
                        home_team = self.extract_team_name(team_elements[1])
                        
                        # 점수 찾기
                        score_text = card.get_text()
                        # 점수 패턴: "2-2", "2 - 2", "2:2" 등
                        score_match = re.search(r'(\d+)\s*[-:]\s*(\d+)', score_text)
                        
                        if score_match and away_team and home_team:
                            away_score = int(score_match.group(1))
                            home_score = int(score_match.group(2))
                            
                            # 유효한 점수인지 확인 (0-30 범위)
                            if 0 <= away_score <= 30 and 0 <= home_score <= 30:
                                game = {
                                    'date': game_date,
                                    'away_team': self.normalize_team_name(away_team),
                                    'home_team': self.normalize_team_name(home_team),
                                    'away_score': away_score,
                                    'home_score': home_score,
                                    'source': 'daily_card'
                                }
                                
                                games.append(game)
                                print(f"✅ 카드에서 경기 추출: {game['date']} {game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']}")
                
                except Exception as e:
                    continue
        
        return games

    def extract_from_monthly_table(self, driver, soup):
        """하단 월별 테이블에서 데이터 추출"""
        print("🎯 월별 테이블에서 데이터 추출 시도...")
        
        games = []
        
        try:
            # JavaScript 실행으로 테이블 데이터 직접 추출
            table_data = driver.execute_script("""
                const games = [];
                const rows = document.querySelectorAll('table tr');
                let currentMonth = 7; // 7월
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 4) {
                        // 날짜 셀 확인
                        const dateCell = cells[0].textContent.trim();
                        const dayMatch = dateCell.match(/^(\\d{1,2})$/);
                        
                        if (dayMatch) {
                            const day = dayMatch[1].padStart(2, '0');
                            const date = `2025-${String(currentMonth).padStart(2, '0')}-${day}`;
                            
                            // 이후 셀들에서 경기 정보 찾기
                            for (let i = 1; i < cells.length; i++) {
                                const cellText = cells[i].textContent.trim();
                                const cellHTML = cells[i].innerHTML;
                                
                                // 팀명과 점수가 있는 셀 찾기
                                const teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화'];
                                const foundTeams = teams.filter(team => cellText.includes(team) || cellHTML.includes(team));
                                
                                if (foundTeams.length >= 2) {
                                    // 점수 찾기
                                    const scoreMatch = cellText.match(/(\\d+)\\s*[-:]\\s*(\\d+)/);
                                    if (scoreMatch) {
                                        games.push({
                                            date: date,
                                            teams: foundTeams,
                                            scores: [parseInt(scoreMatch[1]), parseInt(scoreMatch[2])],
                                            text: cellText
                                        });
                                    }
                                }
                            }
                        }
                    }
                });
                
                return games;
            """)
            
            print(f"📊 JavaScript로 {len(table_data)}개 경기 데이터 추출")
            
            # JavaScript 결과를 Python 형식으로 변환
            for data in table_data:
                if len(data['teams']) >= 2 and len(data['scores']) >= 2:
                    game = {
                        'date': data['date'],
                        'away_team': self.normalize_team_name(data['teams'][0]),
                        'home_team': self.normalize_team_name(data['teams'][1]),
                        'away_score': data['scores'][0],
                        'home_score': data['scores'][1],
                        'source': 'monthly_table'
                    }
                    
                    games.append(game)
                    print(f"✅ 테이블에서 경기 추출: {game['date']} {game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']}")
        
        except Exception as e:
            print(f"⚠️ JavaScript 실행 오류: {e}")
            
            # 대체 방법: BeautifulSoup으로 파싱
            tables = soup.find_all('table')
            for table in tables:
                if 'schedule' in str(table.get('class', [])).lower():
                    rows = table.find_all('tr')
                    print(f"📋 스케줄 테이블에서 {len(rows)}개 행 발견")
                    
                    for row in rows:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) >= 2:
                            row_text = ' '.join([cell.get_text(strip=True) for cell in cells])
                            
                            # 날짜가 있는 행인지 확인
                            date_match = re.search(r'(\d{1,2})', cells[0].get_text(strip=True))
                            if date_match:
                                day = date_match.group(1).zfill(2)
                                game_date = f"2025-07-{day}"
                                
                                # 각 셀에서 경기 정보 찾기
                                for cell in cells[1:]:
                                    cell_text = cell.get_text(strip=True)
                                    teams = self.extract_teams_from_text(cell_text)
                                    
                                    if len(teams) >= 2:
                                        score_match = re.search(r'(\d+)\s*[-:]\s*(\d+)', cell_text)
                                        if score_match:
                                            game = {
                                                'date': game_date,
                                                'away_team': self.normalize_team_name(teams[0]),
                                                'home_team': self.normalize_team_name(teams[1]),
                                                'away_score': int(score_match.group(1)),
                                                'home_score': int(score_match.group(2)),
                                                'source': 'monthly_table_bs'
                                            }
                                            
                                            if 0 <= game['away_score'] <= 30 and 0 <= game['home_score'] <= 30:
                                                games.append(game)
                                                print(f"✅ BS 테이블에서 경기 추출: {game['date']} {game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']}")
        
        return games

    def extract_team_name(self, element):
        """요소에서 팀명 추출"""
        if hasattr(element, 'get_text'):
            text = element.get_text(strip=True)
        elif hasattr(element, 'get'):
            text = element.get('alt', '') or element.get('title', '')
        else:
            text = str(element)
        
        teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화']
        for team in teams:
            if team in text:
                return team
        
        return None

    def extract_teams_from_text(self, text):
        """텍스트에서 팀명들 추출"""
        teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화']
        found_teams = []
        
        for team in teams:
            if team in text:
                found_teams.append(team)
        
        return found_teams

    def normalize_team_name(self, team_name):
        """팀명 정규화"""
        if not team_name:
            return None
        
        cleaned = team_name.strip()
        return self.team_mapping.get(cleaned, cleaned)

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

    def save_to_files(self, games, prefix='kbo-final'):
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
            
            # 날짜순 정렬
            unique_games.sort(key=lambda x: x['date'])
            
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
            print("\n🏟️ 처음 10개 경기:")
            for i, game in enumerate(unique_games[:10]):
                print(f"  {i+1}. {game['date']}: {game['away_team']} {game['away_score']}:{game['home_score']} {game['home_team']}")
            
            return unique_games
        else:
            print("❌ 수집된 경기 데이터가 없습니다.")
            return []

def main():
    """메인 실행 함수"""
    crawler = KBOFinalCrawler()
    
    print("=" * 60)
    print("🏟️ KBO Python 최종 크롤링 시스템")
    print("📡 다음 스포츠 실제 데이터 추출")
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