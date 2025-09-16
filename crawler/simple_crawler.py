#!/usr/bin/env python3
"""
NPB Simple Crawler - 직접 TXT 저장 방식
크롤링 → TXT 저장 → JavaScript 처리 → JSON
"""

try:
    import requests
    from bs4 import BeautifulSoup
    CRAWLING_ENABLED = True
except ImportError:
    print("⚠️ Web crawling dependencies not available (requests, beautifulsoup4)")
    print("📄 Using existing data conversion instead...")
    CRAWLING_ENABLED = False
    requests = None
    BeautifulSoup = None

# Optional Selenium support (dynamic pages)
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from webdriver_manager.chrome import ChromeDriverManager
    SELENIUM_AVAILABLE = True
except Exception:
    SELENIUM_AVAILABLE = False

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import time
import logging
import sys
import re

class SimpleCrawler:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data" / "simple"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.setup_logging()
        
        # NPB 팀 정보 (웹사이트 표시명 기준)
        self.teams = {
            # 센트럴리그
            'ジャイアンツ': {'id': 1, 'abbr': 'YOG', 'name': '読売ジャイアンツ', 'league': 'Central'},
            '巨人': {'id': 1, 'abbr': 'YOG', 'name': '読売ジャイアンツ', 'league': 'Central'},
            '巨': {'id': 1, 'abbr': 'YOG', 'name': '読売ジャイアンツ', 'league': 'Central'},  # NPB 축약형
            '阪神': {'id': 2, 'abbr': 'HAN', 'name': '阪神タイガース', 'league': 'Central'},
            '神': {'id': 2, 'abbr': 'HAN', 'name': '阪神タイガース', 'league': 'Central'},  # NPB 1문자 표기
            '阪': {'id': 2, 'abbr': 'HAN', 'name': '阪神タイガース', 'league': 'Central'},  # NPB 축약형
            'ＤｅＮＡ': {'id': 3, 'abbr': 'YDB', 'name': '横浜DeNAベイスターズ', 'league': 'Central'},
            'DeNA': {'id': 3, 'abbr': 'YDB', 'name': '横浜DeNAベイスターズ', 'league': 'Central'},
            'デ': {'id': 3, 'abbr': 'YDB', 'name': '横浜DeNAベイスターズ', 'league': 'Central'},
            'Ｄ': {'id': 3, 'abbr': 'YDB', 'name': '横浜DeNAベイスターズ', 'league': 'Central'},  # NPB 축약형
            '中日': {'id': 5, 'abbr': 'CHU', 'name': '中日ドラゴンズ', 'league': 'Central'},
            '中': {'id': 5, 'abbr': 'CHU', 'name': '中日ドラゴンズ', 'league': 'Central'},  # NPB 축약형
            '広島': {'id': 4, 'abbr': 'HIR', 'name': '広島東洋カープ', 'league': 'Central'},
            '広': {'id': 4, 'abbr': 'HIR', 'name': '広島東洋カープ', 'league': 'Central'},  # NPB 축약형
            'ヤクルト': {'id': 6, 'abbr': 'YAK', 'name': '東京ヤクルトスワローズ', 'league': 'Central'},
            'ヤ': {'id': 6, 'abbr': 'YAK', 'name': '東京ヤクルトスワローズ', 'league': 'Central'},  # NPB 축약형
            
            # 퍼시픽리그
            'ソフトバンク': {'id': 7, 'abbr': 'SOF', 'name': '福岡ソフトバンクホークス', 'league': 'Pacific'},
            'ソ': {'id': 7, 'abbr': 'SOF', 'name': '福岡ソフトバンクホークス', 'league': 'Pacific'},  # NPB 축약형
            'ロッテ': {'id': 8, 'abbr': 'LOT', 'name': '千葉ロッテマリーンズ', 'league': 'Pacific'},
            'ロ': {'id': 8, 'abbr': 'LOT', 'name': '千葉ロッテマリーンズ', 'league': 'Pacific'},  # NPB 축약형
            '楽天': {'id': 9, 'abbr': 'RAK', 'name': '東北楽天ゴールデンイーグルス', 'league': 'Pacific'},
            '楽': {'id': 9, 'abbr': 'RAK', 'name': '東北楽天ゴールデンイーグルス', 'league': 'Pacific'},  # NPB 축약형
            'オリックス': {'id': 10, 'abbr': 'ORI', 'name': 'オリックスバファローズ', 'league': 'Pacific'},
            'オ': {'id': 10, 'abbr': 'ORI', 'name': 'オリックスバファローズ', 'league': 'Pacific'},  # NPB 축약형
            '西武': {'id': 11, 'abbr': 'SEI', 'name': '埼玉西武ライオンズ', 'league': 'Pacific'},
            '西': {'id': 11, 'abbr': 'SEI', 'name': '埼玉西武ライオンズ', 'league': 'Pacific'},  # NPB 축약형
            '日本ハム': {'id': 12, 'abbr': 'NIP', 'name': '北海道日本ハムファイターズ', 'league': 'Pacific'},
            '日': {'id': 12, 'abbr': 'NIP', 'name': '北海道日本ハムファイターズ', 'league': 'Pacific'}  # NPB 축약형
        }

        # 홈팀 기본 구장 매핑 (표시용 추정치)
        self.default_stadium_by_abbr = {
            'YOG': '東京ドーム',
            'HAN': '阪神甲子園球場',
            'CHU': 'バンテリンドーム ナゴヤ',
            'YDB': '横浜スタジアム',
            'HIR': 'MAZDA Zoom-Zoom スタジアム広島',
            'YAK': '明治神宮野球場',
            'SOF': '福岡PayPayドーム',
            'LOT': 'ZOZOマリンスタジアム',
            'SEI': 'ベルーナドーム',
            'ORI': '京セラドーム大阪',
            'NIP': 'エスコンフィールドHOKKAIDO',
            'RAK': '楽天モバイルパーク宮城',
        }
        # Preferred Japanese short labels by team abbr
        self.abbr_to_ja_short = {
            'YOG': '巨人',
            'HAN': '阪神',
            'YDB': 'ＤｅＮＡ',
            'HIR': '広島',
            'CHU': '中日',
            'YAK': 'ヤクルト',
            'SOF': 'ソフトバンク',
            'LOT': 'ロッテ',
            'RAK': '楽天',
            'ORI': 'オリックス',
            'SEI': '西武',
            'NIP': '日本ハム',
        }
        # Canonical ID→Team mapping for validation/repair
        self.id_to_team = {
            1: {'abbr': 'YOG', 'league': 'Central'},
            2: {'abbr': 'HAN', 'league': 'Central'},
            3: {'abbr': 'YDB', 'league': 'Central'},
            4: {'abbr': 'HIR', 'league': 'Central'},
            5: {'abbr': 'CHU', 'league': 'Central'},
            6: {'abbr': 'YAK', 'league': 'Central'},
            7: {'abbr': 'SOF', 'league': 'Pacific'},
            8: {'abbr': 'LOT', 'league': 'Pacific'},
            9: {'abbr': 'RAK', 'league': 'Pacific'},
            10: {'abbr': 'ORI', 'league': 'Pacific'},
            11: {'abbr': 'SEI', 'league': 'Pacific'},
            12: {'abbr': 'NIP', 'league': 'Pacific'},
        }
        self.valid_abbrs = {v['abbr'] for v in self.id_to_team.values()}
        self.valid_leagues = {'Central', 'Pacific'}
        # Selenium driver holder
        self._driver = None
        self.use_selenium = (os.environ.get('USE_SELENIUM') == '1') and SELENIUM_AVAILABLE
    
    def setup_logging(self):
        log_dir = self.project_root / "logs" / "simple_crawler"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = log_dir / f"crawler_{datetime.now().strftime('%Y%m%d')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('simple_crawler')

    # ===== Selenium helpers =====
    def ensure_driver(self):
        if not SELENIUM_AVAILABLE:
            return None
        if self._driver is not None:
            return self._driver
        try:
            from selenium.webdriver.chrome.service import Service as ChromeService
            options = ChromeOptions()
            options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1280,800')
            service = ChromeService(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
            self._driver = driver
            self.logger.info('🧭 Selenium Chrome driver initialized')
            return driver
        except Exception as e:
            self.logger.warning(f"⚠️ Selenium init failed: {e}")
            return None

    def fetch_soup(self, url, wait_css=None, timeout=15):
        """Fetch URL and return BeautifulSoup; try requests first, fallback to Selenium when configured/needed."""
        # Try requests
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'}
            resp = requests.get(url, timeout=timeout, headers=headers)
            if resp.status_code == 200 and resp.content:
                return BeautifulSoup(resp.content, 'html.parser')
            self.logger.info(f"ℹ️ requests returned {resp.status_code} for {url}, considering Selenium fallback")
        except Exception as e:
            self.logger.info(f"ℹ️ requests failed for {url}: {e}")

        # Fallback to Selenium when available/desired
        if not SELENIUM_AVAILABLE:
            return None
        driver = self.ensure_driver()
        if driver is None:
            return None
        try:
            driver.get(url)
            if wait_css:
                WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, wait_css)))
            html = driver.page_source
            return BeautifulSoup(html, 'html.parser')
        except Exception as e:
            self.logger.warning(f"⚠️ Selenium fetch failed: {e}")
            return None
    
    def get_team_info(self, team_name):
        """팀명으로 팀 정보 찾기"""
        for key, info in self.teams.items():
            if key in team_name:
                return info
        return None
    
    def convert_existing_data_to_txt(self):
        """기존 JSON → TXT 역변환 (크롤링 불가 시 fallback)"""
        self.logger.info("📄 Converting existing JSON data to TXT format (fallback)...")
        
        try:
            # Use existing json_to_txt_converter script
            json_to_txt = self.project_root / 'scripts' / 'json_to_txt_converter.py'
            if json_to_txt.exists():
                result = os.system(f"cd {self.project_root} && python3 {json_to_txt}")
                if result == 0:
                    self.logger.info("✅ JSON to TXT conversion completed")
                    return True
                else:
                    self.logger.error("❌ JSON to TXT conversion failed")
                    return False
            else:
                # If converter not present, try to proceed with existing TXT files
                games_txt = self.data_dir / 'games_raw.txt'
                teams_txt = self.data_dir / 'teams_raw.txt'
                if games_txt.exists() and teams_txt.exists():
                    self.logger.info("⚠️ Converter not found, but TXT files already exist. Proceeding.")
                    return True
                self.logger.error("❌ JSON to TXT converter not found and TXT files missing")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ JSON→TXT conversion error: {e}")
            return False

    def crawl_date(self, target_date):
        """특정 날짜의 경기 결과 크롤링"""
        if not CRAWLING_ENABLED:
            return []  # Skip actual crawling if dependencies unavailable
            
        self.logger.info(f"🔍 Crawling: {target_date.strftime('%Y-%m-%d')}")
        
        # 1. NPB 공식 사이트에서 경기 정보 시도
        games = self.crawl_game_detail(target_date)
        
        # 2. NPB에서 정보를 가져오지 못했으면 닛칸스포츠에서 시도
        if not games:
            games = self.crawl_from_nikkansports(target_date)
        
        # 3. 경기 상태 로그 출력
        for game in games:
            if game.get('status') == 'completed':
                self.logger.info(f"✅ Completed: {game['away_team_abbr']} {game.get('away_score', 0)}-{game.get('home_score', 0)} {game['home_team_abbr']}")
            elif game.get('status') == 'postponed':
                self.logger.info(f"⏸️ Postponed: {game['away_team_abbr']} vs {game['home_team_abbr']}")
            else:
                self.logger.info(f"📅 Scheduled: {game['away_team_abbr']} vs {game['home_team_abbr']}")
        
        self.logger.info(f"✅ Found {len(games)} games on {target_date.strftime('%Y-%m-%d')}")
        return games
        
    def crawl_from_nikkansports(self, target_date):
        """닛칸스포츠에서 경기 결과 크롤링 (기존 방식)"""
        # URL 형식: https://www.nikkansports.com/baseball/professional/score/2025/pf-score-20250328.html
        date_str = target_date.strftime("%Y%m%d")
        year = target_date.strftime("%Y")
        url = f"https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date_str}.html"
        
        self.logger.info(f"📰 Trying Nikkansports: {target_date.strftime('%Y-%m-%d')}")
        
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
            }
            response = requests.get(url, timeout=15, headers=headers)
            response.raise_for_status()
            # Use raw content so BeautifulSoup can detect meta charset correctly
            soup = BeautifulSoup(response.content, 'html.parser')
            games = []
            # Keep track of parsed games to prevent duplicates while preferring richer entries
            strict_games = {}
            symmetric_map = {}

            def build_symmetric_key(game):
                """Return an orientation-agnostic key for duplicate detection."""
                date = game.get('date')
                home_id = int(game.get('home_team_id'))
                away_id = int(game.get('away_team_id'))
                min_id, max_id = sorted([home_id, away_id])

                def score_token(val):
                    if isinstance(val, int):
                        return f"{val:02d}"
                    if val is None:
                        return 'NA'
                    try:
                        return f"{int(val):02d}"
                    except Exception:
                        return str(val)

                score_signature = tuple(sorted([
                    score_token(game.get('home_score')),
                    score_token(game.get('away_score'))
                ]))

                status = game.get('status')
                final_inning = game.get('final_inning')
                game_time = game.get('game_time')
                return (date, min_id, max_id, score_signature, status, final_inning, game_time)
            
            # scoreTable 클래스의 테이블들에서 경기 결과 파싱
            score_tables = soup.find_all('table', class_='scoreTable')
            # 레이아웃/차단 이슈로 비어 있을 때 한 번 재시도
            if not score_tables:
                time.sleep(1)
                response = requests.get(url, timeout=20, headers=headers)
                response.raise_for_status()
                soup = BeautifulSoup(response.content, 'html.parser')
                score_tables = soup.find_all('table', class_='scoreTable')
            
            for table in score_tables:
                try:
                    rows = table.find_all('tr')
                    if len(rows) < 3:  # 헤더 + 2팀 최소 필요
                        continue
                    
                    # 팀명 추출 (두 번째, 세 번째 행)
                    away_row = rows[1]  # 첫 번째 팀 (away)
                    home_row = rows[2]  # 두 번째 팀 (home)
                    
                    # 팀명에서 공백 제거하고 매핑
                    away_team_text = away_row.find('td', class_='team').get_text(strip=True).replace('\xa0', '')
                    home_team_text = home_row.find('td', class_='team').get_text(strip=True).replace('\xa0', '')
                    
                    away_team = self.get_team_info(away_team_text)
                    home_team = self.get_team_info(home_team_text)
                    
                    if not away_team or not home_team:
                        self.logger.warning(f"⚠️ Team not found: {away_team_text} vs {home_team_text}")
                        continue
                    
                    # totalScore 클래스에서 총점 추출
                    away_score_cell = away_row.find('td', class_='totalScore')
                    home_score_cell = home_row.find('td', class_='totalScore')
                    
                    if not away_score_cell or not home_score_cell:
                        self.logger.warning(f"⚠️ Could not find totalScore cells")
                        continue
                    
                    # 점수 텍스트 추출
                    away_score_text = away_score_cell.get_text(strip=True)
                    home_score_text = home_score_cell.get_text(strip=True)

                    # 숫자 파싱 유틸 (풀와이드 숫자 포함). 실패 시 None 반환하여 스킵
                    def convert_jp_number(text: str):
                        if text is None:
                            return None
                        # 전각 숫자를 반각으로 치환
                        trans = str.maketrans('０１２３４５６７８９', '0123456789')
                        t = text.translate(trans)
                        # 흔한 비숫자 기호 제거 (대쉬, 공백)
                        t = t.replace('\u2014', '-')\
                             .replace('\u2013', '-')\
                             .replace('－', '-')\
                             .replace('—', '-')\
                             .strip()
                        # 명백한 비완료/취소 표시 처리: 숫자가 없으면 None
                        if not any(ch.isdigit() for ch in t):
                            return None
                        # 숫자만 남기기 (예: '10' 그대로, 'X' 등 제거)
                        cleaned = ''.join(ch for ch in t if ch.isdigit())
                        if cleaned == '':
                            return None
                        try:
                            return int(cleaned)
                        except Exception:
                            return None

                    away_score = convert_jp_number(away_score_text)
                    home_score = convert_jp_number(home_score_text)

                    # 경기 상태 정보 추출을 먼저 수행해 중도 취소 등을 감지
                    game_status_info = self.extract_game_status(table)
                    status = game_status_info['status']

                    if status != 'postponed':
                        score_tokens = f"{away_score_text} {home_score_text}"
                        postponed_markers = ['中止', '雨天', '降雨', 'ノーゲーム', 'ノーコンテスト', '打切', '打ち切り', '延期', 'サスペンデッド']
                        if any(marker in score_tokens for marker in postponed_markers):
                            status = 'postponed'
                            game_status_info['status'] = 'postponed'

                    # 진행 중인 경기는 저장하지 않음
                    if status == 'inprogress':
                        self.logger.info(f"⏭️ Skipping in-progress game: {away_team['abbr']} vs {home_team['abbr']}")
                        continue

                    if status == 'postponed':
                        away_score = None
                        home_score = None
                    elif away_score is None or home_score is None:
                        self.logger.info(
                            f"⏭️  Skipping unparsed/unfinished game: {away_team['abbr']} vs {home_team['abbr']} (away='{away_score_text}', home='{home_score_text}')"
                        )
                        continue

                    # 리그 판단: 교류전 확인 후 분류
                    home_league = home_team['league']
                    away_league = away_team['league']

                    if home_league == away_league:
                        # 같은 리그 내 경기
                        league = home_league
                    else:
                        # 교류전: 홈팀 리그로 분류
                        league = home_league

                    # 점수가 있으면서 상태가 불분명할 때만 추가 확인
                    if home_score is not None and away_score is not None and status == 'scheduled':
                        # 더 정확한 완료 상태 판단
                        status = self.determine_completion_status(table, game_status_info)

                    # 상세 경기 정보 수집 (완료된 경기는 더 많은 정보 수집)
                    detailed_info = {}
                    if status == 'completed':
                        detailed_info = self.extract_detailed_game_info(table, away_team, home_team)

                    # 무승부 판정(강화): 완료 && 동점 → 무승부로 간주
                    # 키워드 보강(로그용): 引き分け/引分/規定により引き分け など
                    is_draw = False
                    final_inning = None
                    if status == 'completed' and home_score is not None and away_score is not None:
                        innings_home = detailed_info.get('inning_scores_home') or []
                        innings_away = detailed_info.get('inning_scores_away') or []
                        final_inning = max(len(innings_home), len(innings_away)) if (innings_home or innings_away) else None
                        if home_score == away_score:
                            is_draw = True
                            page_text = table.get_text(' ', strip=True)
                            if any(k in page_text for k in ['引き分け', '引分', '規定により引き分け']):
                                self.logger.info("🤝 Draw detected by keyword")
                            elif final_inning is not None:
                                self.logger.info(f"🤝 Draw detected by equal score @ {final_inning}回")

                    winner = None
                    if home_score is not None and away_score is not None:
                        if home_score > away_score:
                            winner = 'home'
                        elif away_score > home_score:
                            winner = 'away'
                        else:
                            winner = 'draw'

                    # 경기 정보 (확장된 필드)
                    game = {
                        'date': target_date.strftime('%Y-%m-%d'),
                        'home_team_id': home_team['id'],
                        'home_team_name': home_team['name'],
                        'home_team_abbr': home_team['abbr'],
                        'away_team_id': away_team['id'],
                        'away_team_name': away_team['name'],
                        'away_team_abbr': away_team['abbr'],
                        'home_score': home_score,
                        'away_score': away_score,
                        'league': league,
                        'status': status,
                        'inning': game_status_info.get('inning'),
                        'inning_half': game_status_info.get('inning_half'),
                        'game_time': game_status_info.get('game_time'),
                        'is_draw': is_draw,
                        'winner': winner,
                        # 확장 필드들
                        'stadium': detailed_info.get('stadium'),
                        'game_duration': detailed_info.get('game_duration'),
                        'attendance': detailed_info.get('attendance'),
                        'inning_scores_away': detailed_info.get('inning_scores_away', []),
                        'inning_scores_home': detailed_info.get('inning_scores_home', []),
                        'hits_away': detailed_info.get('hits_away'),
                        'hits_home': detailed_info.get('hits_home'),
                        'errors_away': detailed_info.get('errors_away'),
                        'errors_home': detailed_info.get('errors_home'),
                        'winning_pitcher': detailed_info.get('winning_pitcher'),
                        'losing_pitcher': detailed_info.get('losing_pitcher'),
                        'save_pitcher': detailed_info.get('save_pitcher'),
                        'home_runs': detailed_info.get('home_runs', []),
                        'weather': detailed_info.get('weather'),
                        'temperature': detailed_info.get('temperature'),
                        'final_inning': final_inning
                    }

                    strict_key = (game['date'], game['home_team_id'], game['away_team_id'])
                    symmetric_key = build_symmetric_key(game)

                    existing_game = strict_games.get(strict_key)
                    if existing_game:
                        if self.is_game_data_better(game, existing_game):
                            strict_games[strict_key] = game
                            self.logger.info(f"🔄 Updated duplicate game with richer data: {away_team['abbr']} vs {home_team['abbr']}")
                        else:
                            self.logger.info(f"⏭️ Duplicate game skipped (existing data richer): {away_team['abbr']} vs {home_team['abbr']}")
                        continue

                    mirrored_key = symmetric_map.get(symmetric_key)
                    if mirrored_key is not None:
                        existing_game = strict_games.get(mirrored_key)
                        if existing_game and self.is_game_data_better(game, existing_game):
                            strict_games[mirrored_key] = game
                            self.logger.info(f"🔄 Replaced mirrored duplicate with richer data: {away_team['abbr']} vs {home_team['abbr']}")
                        else:
                            self.logger.info(f"⏭️ Mirrored duplicate skipped: {away_team['abbr']} vs {home_team['abbr']}")
                        continue

                    strict_games[strict_key] = game
                    symmetric_map[symmetric_key] = strict_key

                    score_log = f"{away_score}-{home_score}" if (home_score is not None and away_score is not None) else "--"
                    status_text = f" [{game['status'].upper()}]" if game['status'] != 'completed' else ""
                    self.logger.info(f"✅ Parsed: {away_team['abbr']} {score_log} {home_team['abbr']}{status_text}")
                    
                except Exception as e:
                    self.logger.warning(f"⚠️ Failed to parse table: {e}")
                    continue
            
            games = list(strict_games.values())
            return games
            
        except Exception as e:
            self.logger.error(f"❌ Failed to crawl from Nikkansports {target_date.strftime('%Y-%m-%d')}: {e}")
            return []
    
    def extract_game_status(self, table):
        """경기 상태 정보 추출 (이닝, 진행상황, 시간 등)"""
        status_info = {
            'status': 'scheduled',  # 기본값: 예정
            'inning': None,
            'inning_half': None,
            'game_time': None
        }
        
        try:
            # 1. H5 태그에서 [試合中止] 또는 [試合終了] 확인
            header = table.find_previous_sibling('h5')
            if header:
                header_text = header.get_text()
                if '試合中止' in header_text:
                    status_info['status'] = 'postponed'
                    return status_info
                draw_keywords = ['引き分け', '引分', '規定により引き分け']
                cold_keywords = ['降雨コールド', 'コールドゲーム', '降雨コール']
                if any(k in header_text for k in draw_keywords + cold_keywords):
                    status_info['status'] = 'completed'
                    inning_match = re.search(r'(?:延長)?(\d+)回', header_text)
                    if inning_match:
                        try:
                            status_info['inning'] = int(inning_match.group(1))
                        except Exception:
                            pass
                    half_match = re.search(r'(表|裏)', header_text)
                    if half_match:
                        status_info['inning_half'] = 'top' if half_match.group(1) == '表' else 'bottom'
                if '試合終了' in header_text:
                    status_info['status'] = 'completed'

            # 2. 경기 진행 상태 확인 (더 구체적인 키워드)
            status_elements = table.find_all(['td', 'th'], class_=['status', 'inning', 'gameStatus'])
            for elem in status_elements:
                text = elem.get_text(strip=True)
                
                # 진행중 상태 키워드 개선 (더 정확한 패턴 매칭)
                # "8회말", "9회표", "延長10回裏" 등의 패턴
                inning_pattern = re.search(r'(?:延長)?(\d+)回([表裏])', text)
                if inning_pattern:
                    status_info['status'] = 'inprogress' 
                    status_info['inning'] = int(inning_pattern.group(1))
                    status_info['inning_half'] = 'top' if inning_pattern.group(2) == '表' else 'bottom'
                    self.logger.info(f"🔄 In-progress game detected: {status_info['inning']}회 {status_info['inning_half']}")
                    return status_info
                
                # 기타 진행중 키워드 (더 구체적으로)
                inprogress_keywords = ['試合中', '中断中', 'プレイボール', '攻撃中', '守備中']
                if any(keyword in text for keyword in inprogress_keywords):
                    status_info['status'] = 'inprogress'
                    self.logger.info(f"🔄 In-progress game detected by keyword: {text}")
                    return status_info

                # 완료 상태 키워드
                completion_keywords = ['試合終了', '終了', 'ゲーム終了', 'GAME SET', 'FINAL', '最終', '引き分け', '引分', '規定により引き分け']
                if any(keyword in text for keyword in completion_keywords):
                    status_info['status'] = 'completed'
                
                # 연기/중지/노게임 상태 키워드 강화
                elif any(keyword in text for keyword in ['雨天中止', '中止', '延期', 'サスペンデッド', 'ノーゲーム', 'ノーコンテスト', '打切', '打ち切り']):
                    status_info['status'] = 'postponed'

        except Exception as e:
            self.logger.warning(f"⚠️ Could not extract game status: {e}")
            
        return status_info
    
    def determine_completion_status(self, table, game_status_info):
        """완료/취소를 텍스트 키워드로만 보수적으로 판정"""
        try:
            if game_status_info.get('status') == 'completed':
                return 'completed'

            text = table.get_text(" ", strip=True)
            if any(k in text for k in ['試合終了', 'ゲームセット', '引き分け', 'コールド']):
                return 'completed'
            if any(k in text for k in ['雨天中止', '中止', '延期', 'サスペンデッド', 'ノーゲーム', 'ノーコンテスト', '打切', '打ち切り']):
                return 'postponed'
            return 'scheduled'
        except Exception as e:
            self.logger.warning(f"⚠️ Error determining completion status: {e}")
            return 'scheduled'
    
    def extract_detailed_game_info(self, table, away_team, home_team):
        """완료된 경기의 상세 정보 추출"""
        detailed_info = {}
        
        try:
            # 1. 이닝별 득점 추출
            score_rows = table.find_all('tr')
            if len(score_rows) >= 3:
                header_row = score_rows[0]
                away_row = score_rows[1]  # 원정팀
                home_row = score_rows[2]  # 홈팀
                
                away_innings = []
                home_innings = []

                # Find the index of the total score column ('R' or '計')
                total_col_idx = -1
                header_cells = header_row.find_all(['th', 'td'])
                for i, cell in enumerate(header_cells):
                    text = cell.get_text(strip=True)
                    if text == 'R' or text == '計':
                        total_col_idx = i
                        break
                
                away_cells = away_row.find_all('td')
                home_cells = home_row.find_all('td')

                # Slice inning cells based on the location of the 'R' column
                # It starts after the team name (index 0)
                if total_col_idx != -1:
                    inning_cells_away = away_cells[1:total_col_idx]
                    inning_cells_home = home_cells[1:total_col_idx]
                else:
                    # Fallback to old logic if 'R' is not found
                    inning_cells_away = away_cells[1:-3] if len(away_cells) > 4 else away_cells[1:]
                    inning_cells_home = home_cells[1:-3] if len(home_cells) > 4 else home_cells[1:]

                def parse_inning_cell(raw_text):
                    """Convert inning cell text (including walk-off markers like '1X') to an int/None."""
                    t = raw_text.translate(str.maketrans('０１２３４５６７８９', '0123456789'))
                    t = t.replace('\u2014', '-').replace('－', '-').replace('—', '-')
                    t = t.replace('Ｘ', 'X').replace('ｘ', 'X').replace('x', 'X').strip()

                    digits = ''.join(ch for ch in t if ch.isdigit())
                    if digits:
                        return int(digits)
                    if 'X' in t:
                        return None
                    # 완료 경기에서 비어 있거나 기호만 있는 칸은 0으로 취급
                    return 0

                for i, cell in enumerate(inning_cells_away, 1):
                    if i > 15:  # 최대 15회까지만
                        break
                    text = cell.get_text(strip=True)
                    away_innings.append(parse_inning_cell(text))
                
                for i, cell in enumerate(inning_cells_home, 1):
                    if i > 15:  # 최대 15회까지만
                        break
                    text = cell.get_text(strip=True)
                    home_innings.append(parse_inning_cell(text))
                
                detailed_info['inning_scores_away'] = away_innings
                detailed_info['inning_scores_home'] = home_innings
                
                # 2. R(득점), H(안타), E(실책) 정보 추출
                # 보통 테이블의 마지막 3개 컬럼이 R, H, E
                try:
                    away_rhe = away_cells[-3:]
                    home_rhe = home_cells[-3:]
                    
                    if len(away_rhe) >= 3:
                        detailed_info['hits_away'] = int(away_rhe[1].get_text(strip=True)) if away_rhe[1].get_text(strip=True).isdigit() else None
                        detailed_info['errors_away'] = int(away_rhe[2].get_text(strip=True)) if away_rhe[2].get_text(strip=True).isdigit() else None
                    
                    if len(home_rhe) >= 3:
                        detailed_info['hits_home'] = int(home_rhe[1].get_text(strip=True)) if home_rhe[1].get_text(strip=True).isdigit() else None
                        detailed_info['errors_home'] = int(home_rhe[2].get_text(strip=True)) if home_rhe[2].get_text(strip=True).isdigit() else None
                        
                except (ValueError, IndexError):
                    pass
            
            # 3. 구장 정보 추출 (페이지에서 구장명 찾기)
            stadium_elements = table.find_parent().find_all(text=lambda text: text and any(
                stadium in text for stadium in ['ドーム', '球場', 'スタジアム', 'パーク']
            ))
            if stadium_elements:
                detailed_info['stadium'] = stadium_elements[0].strip()
            else:
                # 기본 구장으로 추정
                detailed_info['stadium'] = self.default_stadium_by_abbr.get(home_team['abbr'], '구장미정')
            
            # 4. 추가 경기 정보 (시간, 관중 등)
            info_elements = table.find_parent().find_all(['p', 'div'], class_=['game-info', 'match-info'])
            for elem in info_elements:
                text = elem.get_text()
                
                # 경기 시간 추출 (예: "2시간 35분")
                time_match = re.search(r'(\d+)時間(\d+)分', text)
                if time_match:
                    hours = int(time_match.group(1))
                    minutes = int(time_match.group(2))
                    detailed_info['game_duration'] = f"{hours}:{minutes:02d}"
                
                # 관중 수 추출 (예: "관중 35,000명")
                attendance_match = re.search(r'(\d{1,3}(?:,\d{3})*)', text)
                if attendance_match and '観客' in text:
                    detailed_info['attendance'] = int(attendance_match.group(1).replace(',', ''))
                
                # 날씨 정보
                if '晴' in text:
                    detailed_info['weather'] = '晴れ'
                elif '曇' in text:
                    detailed_info['weather'] = '曇り'
                elif '雨' in text:
                    detailed_info['weather'] = '雨'
                
                # 온도 정보
                temp_match = re.search(r'(\d+)度', text)
                if temp_match:
                    detailed_info['temperature'] = int(temp_match.group(1))
            
            self.logger.info(f"📊 Collected detailed info: stadium={detailed_info.get('stadium', 'N/A')}, innings={len(detailed_info.get('inning_scores_away', []))}")
            
        except Exception as e:
            self.logger.warning(f"⚠️ Error extracting detailed game info: {e}")
        
        return detailed_info
    
    def validate_game_data(self, game):
        """경기 데이터 유효성 검사"""
        required_fields = ['date', 'home_team_id', 'away_team_id', 'home_team_abbr', 'away_team_abbr', 'league']
        
        # 필수 필드 확인
        for field in required_fields:
            if field not in game or game[field] is None:
                self.logger.warning(f"⚠️ Missing required field: {field}")
                return False
        
        # 날짜 형식 검사
        try:
            from datetime import datetime
            datetime.strptime(game['date'], '%Y-%m-%d')
        except ValueError:
            self.logger.warning(f"⚠️ Invalid date format: {game['date']}")
            return False
        
        # 팀 ID 검사 (1-12 범위)
        if not (1 <= game['home_team_id'] <= 12) or not (1 <= game['away_team_id'] <= 12):
            self.logger.warning(f"⚠️ Invalid team IDs: home={game['home_team_id']}, away={game['away_team_id']}")
            return False
        
        # 같은 팀 경기 검사
        if game['home_team_id'] == game['away_team_id']:
            self.logger.warning(f"⚠️ Same team playing: {game['home_team_abbr']}")
            return False
        
        # 스코어 검사 (있으면 0 이상)
        if game.get('home_score') is not None:
            if not isinstance(game['home_score'], int) or game['home_score'] < 0:
                self.logger.warning(f"⚠️ Invalid home score: {game['home_score']}")
                return False
        
        if game.get('away_score') is not None:
            if not isinstance(game['away_score'], int) or game['away_score'] < 0:
                self.logger.warning(f"⚠️ Invalid away score: {game['away_score']}")
                return False
        
        # 리그 검사
        if game['league'] not in ['Central', 'Pacific']:
            self.logger.warning(f"⚠️ Invalid league: {game['league']}")
            return False
        
        return True
    
    def is_game_data_better(self, new_game, existing_game):
        """새 게임 데이터가 기존 데이터보다 더 완전한지 판단"""
        # 0) 기존 데이터가 명백히 잘못된 경우(약어/리그) 새 데이터 우선
        def is_valid_game(g):
            return (
                isinstance(g.get('home_team_abbr'), str) and g['home_team_abbr'] in self.valid_abbrs and
                isinstance(g.get('away_team_abbr'), str) and g['away_team_abbr'] in self.valid_abbrs and
                g.get('league') in self.valid_leagues
            )

        existing_valid = is_valid_game(existing_game)
        new_valid = is_valid_game(new_game)
        if new_valid and not existing_valid:
            return True
        if existing_valid and not new_valid:
            return False

        # 1. 완료된 경기가 미완료 경기보다 우선
        new_status = new_game.get('status', 'scheduled')
        existing_status = existing_game.get('status', 'scheduled')
        
        if new_status == 'completed' and existing_status != 'completed':
            return True
        elif existing_status == 'completed' and new_status != 'completed':
            return False
        
        # 2. 스코어가 있는 경기가 없는 경기보다 우선
        new_has_scores = (new_game.get('home_score') is not None and 
                         new_game.get('away_score') is not None)
        existing_has_scores = (existing_game.get('home_score') is not None and 
                              existing_game.get('away_score') is not None)
        
        if new_has_scores and not existing_has_scores:
            return True
        elif existing_has_scores and not new_has_scores:
            return False
        
        # 3. 이닝 정보가 더 많은 데이터를 우선
        new_innings_len = len(new_game.get('inning_scores_home') or [])
        existing_innings_len = len(existing_game.get('inning_scores_home') or [])
        if new_innings_len > existing_innings_len:
            return True
        if existing_innings_len > new_innings_len:
            return False

        # 4. 더 많은 정보가 있는 경기 우선 (기존 로직)
        info_keys = [
            'inning', 'game_time', 'hits_home', 'hits_away', 'errors_home', 'errors_away',
            'stadium', 'game_duration', 'attendance', 'weather'
        ]
        new_info_count = sum(1 for key in info_keys if new_game.get(key) is not None)
        existing_info_count = sum(1 for key in info_keys if existing_game.get(key) is not None)
        
        return new_info_count > existing_info_count
    
    def save_games_to_txt(self, games, filename="games_raw.txt"):
        """경기 결과를 TXT 파일로 저장 - 날짜별 그룹화 형태
        upcoming_games_raw.txt의 경우, 구장/경기시간 필드를 끝에 추가하고 전체 파일을 재작성합니다.
        """
        if not games:
            return
        
        file_path = self.data_dir / filename
        is_upcoming = (filename == "upcoming_games_raw.txt")
        
        # upcoming도 새로운 날짜별 그룹화 형식으로 저장
        if is_upcoming:
            self.save_upcoming_games_grouped_by_date(games, file_path)
            return

        # games_raw.txt는 새로운 날짜별 그룹화 형식으로 저장
        self.save_games_grouped_by_date(games, file_path)
        
    def save_games_grouped_by_date(self, new_games, file_path):
        """경기를 날짜별로 그룹화해서 예쁘게 저장"""
        # 기존 데이터 읽기 (기존이 파이프 형식이면 파싱)
        existing_games = {}
        
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                lines = content.split('\n')
                # 파이프 형식 여부는 '주석이 아닌' 라인에서 판단 (메타 주석의 | 무시)
                pipe_mode = any(('|' in ln) and (not ln.strip().startswith('#')) for ln in lines)
                if pipe_mode:
                    # 구(파이프) 형식 파싱
                    for line in lines:
                        if line.startswith('#') or not line.strip():
                            continue
                        parts = line.strip().split('|')
                        if len(parts) >= 12:
                            game_data = {
                                'date': parts[0],
                                'home_team_id': int(parts[1]),
                                'home_team_abbr': parts[2],
                                'home_team_name': parts[3],
                                'away_team_id': int(parts[4]),
                                'away_team_abbr': parts[5],
                                'away_team_name': parts[6],
                                'home_score': None if parts[7] == 'NULL' else int(parts[7]),
                                'away_score': None if parts[8] == 'NULL' else int(parts[8]),
                                'league': parts[9],
                                'status': parts[10],
                                'is_draw': parts[11] == '1'
                            }
                            game_key = (parts[0], parts[1], parts[4])
                            existing_games[game_key] = game_data
                else:
                    # 새(가독) 형식 파싱 (날짜별 그룹화)
                    current_date = None
                    i = 0
                    while i < len(lines):
                        line = lines[i].strip()
                        if line.startswith('# 202'):
                            current_date = line[2:]
                            i += 1
                            continue
                        if current_date and line and not line.startswith('#'):
                            game_match = re.match(r'^(\w+)\s+((\d+)-(\d+)|vs)\s+(\w+)\s+\((\w+)\)(.*)$', line)
                            if game_match and i + 1 < len(lines):
                                meta_line = lines[i + 1]
                                meta_match = re.match(r'^#\s*(\d+)\|(\d+)\|([^|]+)\|([^|]+)$', meta_line)
                                if meta_match:
                                    gm = game_match.groups()
                                    away_abbr = gm[0]
                                    score_part = gm[1]
                                    away_score_str = gm[2]
                                    home_score_str = gm[3]
                                    home_abbr = gm[4]
                                    league = gm[5]
                                    status_info = gm[6] if len(gm) > 6 else ''

                                    away_id, home_id, away_name, home_name = meta_match.groups()
                                    away_id_i = int(away_id)
                                    home_id_i = int(home_id)

                                    # Repair invalid abbr/league using IDs
                                    if home_abbr not in self.valid_abbrs and home_id_i in self.id_to_team:
                                        home_abbr = self.id_to_team[home_id_i]['abbr']
                                    if away_abbr not in self.valid_abbrs and away_id_i in self.id_to_team:
                                        away_abbr = self.id_to_team[away_id_i]['abbr']
                                    if league not in self.valid_leagues and home_id_i in self.id_to_team:
                                        league = self.id_to_team[home_id_i]['league']

                                    game_data = {
                                        'date': current_date,
                                        'home_team_id': home_id_i,
                                        'home_team_abbr': home_abbr,
                                        'home_team_name': home_name,
                                        'away_team_id': away_id_i,
                                        'away_team_abbr': away_abbr,
                                        'away_team_name': away_name,
                                        'home_score': int(home_score_str) if home_score_str else None,
                                        'away_score': int(away_score_str) if away_score_str else None,
                                        'league': league,
                                        'status': 'completed' if score_part != 'vs' else 'scheduled',
                                        'is_draw': '[DRAW]' in (status_info or '')
                                    }
                                    game_key = (current_date, home_id, away_id)
                                    existing_games[game_key] = game_data
                                    i += 2
                                    continue
                        i += 1
            except Exception as e:
                self.logger.warning(f"Failed to read existing file: {e}")
        
        # 새 게임 데이터 검증 및 처리
        validated_games = []
        for game in new_games:
            if self.validate_game_data(game):
                validated_games.append(game)
            else:
                self.logger.warning(f"⚠️ Invalid game data skipped: {game.get('away_team_abbr', 'UNK')} vs {game.get('home_team_abbr', 'UNK')} on {game.get('date', 'UNK')}")
        
        # REWRITE_DATES 모드: 새 게임이 포함된 날짜의 기존 레코드를 모두 제거
        try:
            rewrite_flag = os.environ.get('REWRITE_DATES', '').upper()
        except Exception:
            rewrite_flag = ''
        target_dates = {g['date'] for g in validated_games}
        if rewrite_flag in ('AUTO', 'ALL', '1', 'TRUE', 'YES') and target_dates:
            existing_games = {k: v for k, v in existing_games.items() if v.get('date') not in target_dates}

        # 중복 제거 및 병합
        for game in validated_games:
            game_key = (game['date'], str(game['home_team_id']), str(game['away_team_id']))
            
            # 중복 확인 및 더 완전한 데이터 선택
            if game_key in existing_games:
                existing = existing_games[game_key]
                # 새 데이터가 더 완전하면 교체
                if self.is_game_data_better(game, existing):
                    existing_games[game_key] = game
                    self.logger.info(f"🔄 Updated game: {game['away_team_abbr']} vs {game['home_team_abbr']} on {game['date']}")
            else:
                existing_games[game_key] = game
        
        # 날짜별로 그룹화
        games_by_date = {}
        for game in existing_games.values():
            date = game['date']
            if date not in games_by_date:
                games_by_date[date] = []
            games_by_date[date].append(game)
        
        # 새 형식으로 파일 쓰기
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("# NPB GAMES DATA\n")
            f.write(f"# UPDATED: {datetime.now().isoformat()}\n")
            f.write("# FORMAT: Date-grouped games with readable format\n")
            f.write("#\n")
            
            # 날짜순 정렬
            for date in sorted(games_by_date.keys()):
                f.write(f"\n# {date}\n")
                
                for game in games_by_date[date]:
                    # 팀 레이블(일본어 짧은 표기) 준비
                    away_label = self.abbr_to_ja_short.get(game['away_team_abbr'], (game.get('away_team_name') or '')[:2] or game['away_team_abbr'])
                    home_label = self.abbr_to_ja_short.get(game['home_team_abbr'], (game.get('home_team_name') or '')[:2] or game['home_team_abbr'])
                    # 스코어 표시
                    if game['home_score'] is not None and game['away_score'] is not None:
                        score = f"{game['away_score']}-{game['home_score']}"
                    else:
                        score = "vs"
                    
                    # 무승부 표시
                    draw_mark = " [DRAW]" if game.get('is_draw', False) else ""
                    
                    # 상태 표시 
                    status_mark = ""
                    if game.get('status') == 'scheduled':
                        status_mark = " [SCHEDULED]"
                    elif game.get('status') == 'postponed':
                        status_mark = " [POSTPONED]"
                    
                    # 게임 라인 작성: 日本ハム 0-0 阪神 (League) [DRAW] @ Stadium 
                    game_line = f"{away_label} {score} {home_label} ({game['league']}){draw_mark}{status_mark}"
                    
                    stadium = game.get('stadium') or self.default_stadium_by_abbr.get(game.get('home_team_abbr'), '')
                    info_tokens = []
                    if stadium:
                        info_tokens.append(f"@ {stadium}")
                    # 경기 시간/소요 시간/관중 정보는 존재 시 덧붙임
                    if game.get('game_time') and game.get('status') != 'completed':
                        info_tokens.append(game['game_time'])
                    if game.get('game_duration'):
                        info_tokens.append(f"⏱️{game['game_duration']}")
                    if game.get('attendance'):
                        try:
                            info_tokens.append(f"👥{int(game['attendance']):,}명")
                        except Exception:
                            info_tokens.append(f"👥{game['attendance']}")
                    if info_tokens:
                        game_line += " " + " ".join(info_tokens)
                    
                    f.write(f"{game_line}\n")
                    
                    inning_line = None
                    away_innings = game.get('inning_scores_away') or []
                    home_innings = game.get('inning_scores_home') or []
                    if away_innings or home_innings:
                        max_innings = max(len(away_innings), len(home_innings))
                        if max_innings > 0:
                            parts = []
                            for idx in range(max_innings):
                                away_score = away_innings[idx] if idx < len(away_innings) else "X"
                                home_score = home_innings[idx] if idx < len(home_innings) else "X"
                                if away_score is None:
                                    away_score = "X"
                                if home_score is None:
                                    home_score = "X"
                                parts.append(f"{idx + 1}회({away_score}-{home_score})")
                            inning_line = "이닝별: " + " ".join(parts)
                    
                    if inning_line:
                        f.write(f"# 📊 {inning_line}\n")
        
        total_games = sum(len(games) for games in games_by_date.values())
        self.logger.info(f"📄 Saved {total_games} games grouped by {len(games_by_date)} dates to {file_path}")
    
    def save_upcoming_games_grouped_by_date(self, games, file_path):
        """예정 경기를 날짜별로 그룹화해서 저장 (구장/시간 정보 포함)"""
        # 날짜별로 그룹화
        games_by_date = {}
        for game in games:
            date = game['date']
            if date not in games_by_date:
                games_by_date[date] = []
            games_by_date[date].append(game)
        
        # 새 형식으로 파일 쓰기
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write("# NPB SCHEDULED GAMES DATA\n")
            f.write(f"# UPDATED: {datetime.now().isoformat()}\n")
            f.write("# FORMAT: Date-grouped scheduled games with venue and time info\n")
            f.write("#\n")
            
            # 날짜순 정렬
            for date in sorted(games_by_date.keys()):
                f.write(f"\n# {date}\n")
                
                for game in games_by_date[date]:
                    # 팀 레이블(일본어 짧은 표기) 준비
                    away_label = self.abbr_to_ja_short.get(game['away_team_abbr'], (game.get('away_team_name') or '')[:2] or game['away_team_abbr'])
                    home_label = self.abbr_to_ja_short.get(game['home_team_abbr'], (game.get('home_team_name') or '')[:2] or game['home_team_abbr'])
                    # 구장 정보 가져오기
                    stadium = game.get('stadium')
                    if not stadium:
                        abbr = game.get('home_team_abbr')
                        stadium = self.default_stadium_by_abbr.get(abbr, '구장미정')
                    
                    # 경기 시간
                    game_time = game.get('game_time', '시간미정')
                    
                    # 예정 경기 라인: ヤクルト vs 巨人 (Central) [SCHEDULED] @ 明治神宮野球場 18:00
                    game_line = f"{away_label} vs {home_label} ({game['league']}) [SCHEDULED] @ {stadium} {game_time}"
                    
                    # 메타데이터 주석 - 어웨이팀이 먼저
                    meta_line = f"# {game['away_team_id']}|{game['home_team_id']}|{game['away_team_name']}|{game['home_team_name']}"
                    
                    f.write(f"{game_line}\n")
                    f.write(f"{meta_line}\n")
        
        total_games = sum(len(games) for games in games_by_date.values())
        self.logger.info(f"📄 Saved {total_games} scheduled games grouped by {len(games_by_date)} dates to {file_path}")
    
    def save_teams_to_txt(self):
        """팀 정보를 TXT 파일로 저장"""
        # Skip writing unless explicitly enabled
        try:
            if str(os.environ.get('WRITE_TEAMS_TXT', '')).lower() not in ('1','true','yes'):
                self.logger.info("⏭️ Skipping teams_raw.txt write (WRITE_TEAMS_TXT not set)")
                return
        except Exception:
            return
        file_path = self.data_dir / "teams_raw.txt"
        
        lines = []
        lines.append("# NPB_TEAMS_DATA")
        lines.append(f"# UPDATED: {datetime.now().isoformat()}")
        lines.append("# FORMAT: TEAM_ID|TEAM_ABBR|TEAM_NAME|LEAGUE")
        
        # 중복 제거: 고정 12팀만 출력 (id 오름차순)
        canonical = {
            1: {'id':1,'abbr':'YOG','name':'読売ジャイアンツ','league':'Central'},
            2: {'id':2,'abbr':'HAN','name':'阪神タイガース','league':'Central'},
            3: {'id':3,'abbr':'YDB','name':'横浜DeNAベイスターズ','league':'Central'},
            4: {'id':4,'abbr':'HIR','name':'広島東洋カープ','league':'Central'},
            5: {'id':5,'abbr':'CHU','name':'中日ドラゴンズ','league':'Central'},
            6: {'id':6,'abbr':'YAK','name':'東京ヤクルトスワローズ','league':'Central'},
            7: {'id':7,'abbr':'SOF','name':'福岡ソフトバンクホークス','league':'Pacific'},
            8: {'id':8,'abbr':'LOT','name':'千葉ロッテマリーンズ','league':'Pacific'},
            9: {'id':9,'abbr':'RAK','name':'東北楽天ゴールデンイーグルス','league':'Pacific'},
            10:{'id':10,'abbr':'ORI','name':'オリックスバファローズ','league':'Pacific'},
            11:{'id':11,'abbr':'SEI','name':'埼玉西武ライオンズ','league':'Pacific'},
            12:{'id':12,'abbr':'NIP','name':'北海道日本ハムファイターズ','league':'Pacific'},
        }
        for team_id in sorted(canonical.keys()):
            info = canonical[team_id]
            line = "|".join([
                str(info['id']),
                info['abbr'],
                info['name'],
                info['league']
            ])
            lines.append(line)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        
        self.logger.info(f"📄 Saved teams to {file_path}")
    
    def crawl_full_season(self, start_date="2025-03-28"):
        """NPB 시즌 전체 크롤링 (3월 28일부터)"""
        self.logger.info(f"🚀 Starting full NPB season crawl from {start_date}...")
        
        if not CRAWLING_ENABLED:
            self.logger.error("❌ Web crawling dependencies (requests, beautifulsoup4) are not installed. Cannot crawl.")
            self.logger.error("Please install them using: pip install -r crawler/requirements.txt")
            return 0 # Indicate failure
        
        all_games = []
        start = datetime.strptime(start_date, "%Y-%m-%d")
        today = datetime.now()
        
        # 당일 경기도 포함 (완료된 경기는 수집)
        end_date = today
        current_date = start
        total_days = (end_date - start).days + 1
        
        self.logger.info(f"📅 Crawling {total_days} days from {start_date} to {today.strftime('%Y-%m-%d')}")
        
        day_count = 0
        while current_date <= end_date:
            day_count += 1
            games = self.crawl_date(current_date)
            
            if games:
                all_games.extend(games)
                self.logger.info(f"📅 {current_date.strftime('%Y-%m-%d')}: {len(games)} games")
            else:
                # 경기 없는 날 (휴식일)
                pass
            
            # 진행률 표시
            if day_count % 10 == 0 or day_count == total_days:
                progress = (day_count / total_days) * 100
                self.logger.info(f"🔄 Progress: {day_count}/{total_days} days ({progress:.1f}%)")
            
            current_date += timedelta(days=1)
            
            # 요청 간격 (서버 부하 방지) — 속도 향상
            time.sleep(0.1)
        
        # 경기 결과 저장
        if all_games:
            self.save_games_to_txt(all_games)
        
        # 팀 정보 저장
        self.save_teams_to_txt()
        
        self.logger.info(f"🏆 **FULL SEASON CRAWL SUMMARY**")
        self.logger.info(f"Total games: {len(all_games)}")
        self.logger.info(f"Draws: {sum(1 for g in all_games if g['is_draw'])}")
        self.logger.info(f"Period: {start_date} to {today.strftime('%Y-%m-%d')}")
        
        # 시즌 통계
        if all_games:
            teams_count = {}
            for game in all_games:
                home_team = game['home_team_abbr']
                away_team = game['away_team_abbr']
                teams_count[home_team] = teams_count.get(home_team, 0) + 1
                teams_count[away_team] = teams_count.get(away_team, 0) + 1
            
            self.logger.info("📊 **TEAM GAMES COUNT**:")
            for team, count in sorted(teams_count.items()):
                self.logger.info(f"  {team}: {count} games")
        
        return len(all_games)

    def crawl_multiple_days(self, days=7):
        """여러 날짜 크롤링"""
        self.logger.info(f"🚀 Starting simple crawl for last {days} days...")
        
        if not CRAWLING_ENABLED:
            self.logger.error("❌ Web crawling dependencies (requests, beautifulsoup4) are not installed. Cannot crawl.")
            self.logger.error("Please install them using: pip install -r crawler/requirements.txt")
            return 0 # Indicate failure
        
        all_games = []
        today = datetime.now()
        
        for i in range(0, days):  # 오늘부터 시작  
            target_date = today - timedelta(days=i)
            games = self.crawl_date(target_date)
            all_games.extend(games)
            
            # 요청 간격 — 속도 향상
            if i < days:
                time.sleep(0.1)
        
        # 경기 결과 저장
        if all_games:
            self.save_games_to_txt(all_games)
        
        # 팀 정보 저장
        self.save_teams_to_txt()
        
        self.logger.info(f"🏆 **SIMPLE CRAWL SUMMARY**")
        self.logger.info(f"Total games: {len(all_games)}")
        self.logger.info(f"Draws: {sum(1 for g in all_games if g['is_draw'])}")
        
        return len(all_games)



    def crawl_upcoming_games(self, days_ahead=3):
        """예정 경기 크롤링 (NPB 공식 사이트에서)"""
        if not CRAWLING_ENABLED:
            return []
            
        self.logger.info(f"🔍 Crawling upcoming games for next {days_ahead} days...")
        
        all_upcoming_games = []
        today = datetime.now()
        
        for i in range(days_ahead):
            target_date = today + timedelta(days=i)
            games = self.crawl_upcoming_date(target_date)
            all_upcoming_games.extend(games)
            
            # 요청 간격
            if i < days_ahead - 1:
                time.sleep(1)
        
        if all_upcoming_games:
            self.save_games_to_txt(all_upcoming_games, "upcoming_games_raw.txt")
        
        self.logger.info(f"📅 Found {len(all_upcoming_games)} upcoming games")
        return all_upcoming_games

    def crawl_game_detail(self, target_date):
        """특정 날짜의 경기 상세 정보 크롤링 (NPB 공식 사이트)"""
        if not CRAWLING_ENABLED:
            return []
            
        # NPB 공식 스코어 페이지 형식: https://npb.jp/scores/2025/0908/
        date_str = target_date.strftime("%m%d")
        year = target_date.year
        url = f"https://npb.jp/scores/{year}/{date_str}/"
        
        self.logger.info(f"🔍 Checking game details: {target_date.strftime('%Y-%m-%d')}")
        
        try:
            soup = self.fetch_soup(url, wait_css='table') or BeautifulSoup(b'', 'html.parser')
            games = []
            
            # NPB 스코어 페이지에서 각 경기 링크 찾기
            game_links = soup.find_all('a', href=lambda x: x and '/scores/' in x and target_date.strftime('%Y') in x)
            
            for link in game_links:
                href = link.get('href')
                if href and 'detail' not in href:  # 상세 페이지가 아닌 메인 경기 링크만
                    full_url = f"https://npb.jp{href}" if href.startswith('/') else href
                    
                    # 각 경기의 상세 정보 크롤링
                    game_detail = self.crawl_single_game(full_url, target_date)
                    if game_detail:
                        games.append(game_detail)
                    
                    # 요청 간격
                    time.sleep(0.5)
            
            return games
            
        except Exception as e:
            self.logger.error(f"❌ Failed to crawl games for {target_date.strftime('%Y-%m-%d')}: {e}")
            return []

    def crawl_single_game(self, game_url, target_date):
        """단일 경기의 상세 정보 크롤링"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
            }
            soup = self.fetch_soup(game_url, wait_css='table')
            
            # 경기 정보 추출
            game_info = {
                'date': target_date.strftime('%Y-%m-%d'),
                'status': 'scheduled',  # 기본값을 scheduled로 설정
                'inning': None,
                'inning_half': None,
                'inning_scores': {'away': [], 'home': []},
                'current_situation': {}
            }
            
            # 1. 팀 정보 및 최종 스코어 추출
            score_table = soup.find('table', class_='score-table')
            if score_table:
                rows = score_table.find_all('tr')
                if len(rows) >= 3:  # 헤더 + away + home
                    away_row = rows[1]
                    home_row = rows[2]
                    
                    # 팀명 추출
                    away_team_cell = away_row.find('td', class_='team')
                    home_team_cell = home_row.find('td', class_='team')
                    
                    if away_team_cell and home_team_cell:
                        away_team_text = away_team_cell.get_text(strip=True)
                        home_team_text = home_team_cell.get_text(strip=True)
                        
                        away_team = self.get_team_info(away_team_text)
                        home_team = self.get_team_info(home_team_text)
                        
                        if away_team and home_team:
                            game_info['away_team_id'] = away_team['id']
                            game_info['away_team_abbr'] = away_team['abbr']
                            game_info['away_team_name'] = away_team['name']
                            game_info['home_team_id'] = home_team['id']
                            game_info['home_team_abbr'] = home_team['abbr']
                            game_info['home_team_name'] = home_team['name']
                            # 리그 판단: 교류전 확인 후 분류
                            home_league = home_team['league']
                            away_league = away_team['league']
                            
                            if home_league == away_league:
                                # 같은 리그 내 경기
                                game_info['league'] = home_league
                            else:
                                # 교류전: 홈팀 리그로 분류
                                game_info['league'] = home_league
                            
                            # 최종 스코어 추출
                            away_total = away_row.find('td', class_='total')
                            home_total = home_row.find('td', class_='total')
                            
                            if away_total and home_total:
                                away_score_text = away_total.get_text(strip=True)
                                home_score_text = home_total.get_text(strip=True)
                                
                                # 스코어 데이터는 항상 수집 (진행중이든 완료든)
                                try:
                                    game_info['away_score'] = int(away_score_text)
                                    game_info['home_score'] = int(home_score_text)
                                    game_info['is_draw'] = game_info['away_score'] == game_info['home_score']
                                    game_info['winner'] = 'home' if game_info['home_score'] > game_info['away_score'] else ('away' if game_info['away_score'] > game_info['home_score'] else 'draw')
                                except ValueError:
                                    self.logger.warning(f"⚠️ Could not parse scores: away='{away_score_text}', home='{home_score_text}'")
                                    return None
                            
                            # 이닝별 스코어 추출
                            inning_cells_away = away_row.find_all('td', class_='inning')
                            inning_cells_home = home_row.find_all('td', class_='inning')
                            
                            for cell in inning_cells_away:
                                score_text = cell.get_text(strip=True)
                                if score_text.isdigit():
                                    game_info['inning_scores']['away'].append(int(score_text))
                                elif score_text == 'X':
                                    game_info['inning_scores']['away'].append(None)  # 하위팀 9회말은 X
                            
                            for cell in inning_cells_home:
                                score_text = cell.get_text(strip=True)
                                if score_text.isdigit():
                                    game_info['inning_scores']['home'].append(int(score_text))
                                elif score_text == 'X':
                                    game_info['inning_scores']['home'].append(None)
            
            # 2. 경기 상태 정보 추출
            status_section = soup.find('div', class_=['game-status'])
            if status_section:
                status_text = status_section.get_text(strip=True)

                # 경기 완료 상태만 확인 (진행중이면 상태 변경 안함)
                completion_keywords = ['試合終了', '終了', 'ゲーム終了', 'GAME SET', 'FINAL', '最終', '結果']
                if any(keyword in status_text for keyword in completion_keywords):
                    game_info['status'] = 'completed'
                elif any(keyword in status_text for keyword in ['延期', '中止', '雨天中止']):
                    game_info['status'] = 'postponed'
                # 진행중이거나 기타 상태면 기본값(scheduled) 유지
            
            # 3. 추가 게임 시간 정보
            game_time_elem = soup.find(['span', 'div'], class_=['game-time', 'start-time'])
            if game_time_elem:
                game_info['game_time'] = game_time_elem.get_text(strip=True)
            
            return game_info
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to crawl single game: {game_url} - {e}")
            return None

    def crawl_upcoming_date(self, target_date):
        """특정 날짜의 예정 경기 크롤링 (NPB 공식 사이트)"""
        if not CRAWLING_ENABLED:
            return []
            
        # NPB 공식 사이트 URL 형식 (일본어)
        # https://npb.jp/bis/2025/calendar/index_09.html (월별)
        year = target_date.year
        month = target_date.month
        day_num = target_date.day
        
        # NPB 월별 캘린더 페이지
        url = f"https://npb.jp/bis/{year}/calendar/index_{month:02d}.html"
        
        self.logger.info(f"🔍 Checking upcoming games: {target_date.strftime('%Y-%m-%d')}")
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            # Use raw bytes so BeautifulSoup can detect UTF-8 from meta
            soup = BeautifulSoup(response.content, 'html.parser')
            games = []
            
            # NPB 캘린더 테이블에서 특정 날짜 찾기
            calendar_table = soup.find('table', class_='tetblmain')
            if not calendar_table:
                self.logger.warning(f"⚠️ Calendar table not found for {target_date.strftime('%Y-%m-%d')}")
                return []
            
            # 모든 날짜 셀 찾기
            date_cells = calendar_table.find_all('td', class_='stschedule')
            
            for cell in date_cells:
                # 날짜 확인
                date_div = cell.find('div', class_='teschedate')
                if not date_div:
                    continue
                    
                # 날짜 텍스트에서 숫자만 추출 (링크가 있을 수 있음)
                date_text = date_div.get_text(strip=True)
                try:
                    cell_day = int(date_text)
                except ValueError:
                    continue
                
                if cell_day == day_num:
                    self.logger.info(f"📅 Found date cell for day {day_num}")
                    
                    # 해당 날짜의 경기 정보 추출
                    game_divs = cell.find_all('div', class_='stvsteam')
                    self.logger.info(f"📅 Found {len(game_divs)} game div containers")
                    
                    for i, game_div in enumerate(game_divs):
                        game_texts = game_div.find_all('div')
                        self.logger.info(f"📅 Game div {i}: found {len(game_texts)} game text divs")
                        
                        for j, game_text_div in enumerate(game_texts):
                            game_text = game_text_div.get_text(strip=True)
                            self.logger.info(f"📅 Game text {j}: '{game_text}'")
                            
                            # 경기 시간이 있는 예정 경기만 처리 (18:00, 14:00 등)
                            if '：' in game_text and ('-' in game_text or 'vs' in game_text):
                                self.logger.info(f"📅 Processing scheduled game: '{game_text}'")
                                try:
                                    # 팀명과 시간 분리 (예: "巨 - ヤ　18：00")
                                    parts = game_text.split('　')
                                    if len(parts) >= 2:
                                        team_part = parts[0].strip()
                                        time_part = parts[1].strip()
                                        self.logger.info(f"📅 Team part: '{team_part}', Time part: '{time_part}'")
                                        
                                        # 팀명 추출
                                        if '-' in team_part:
                                            team_names = team_part.split('-')
                                        elif 'vs' in team_part:
                                            team_names = team_part.split('vs')
                                        else:
                                            self.logger.warning(f"⚠️ No separator found in team part: {team_part}")
                                            continue
                                            
                                        if len(team_names) >= 2:
                                            away_team_text = team_names[0].strip()
                                            home_team_text = team_names[1].strip()
                                            self.logger.info(f"📅 Away: '{away_team_text}', Home: '{home_team_text}'")
                                            
                                            away_team = self.get_team_info(away_team_text)
                                            home_team = self.get_team_info(home_team_text)
                                            
                                            if away_team and home_team:
                                                # 리그 판단: 교류전 확인 후 분류
                                                home_league = home_team['league']
                                                away_league = away_team['league']
                                                
                                                if home_league == away_league:
                                                    # 같은 리그 내 경기
                                                    league = home_league
                                                else:
                                                    # 교류전: 홈팀 리그로 분류
                                                    league = home_league
                                                
                                                game = {
                                                    'date': target_date.strftime('%Y-%m-%d'),
                                                    'home_team_id': home_team['id'],
                                                    'home_team_name': home_team['name'],
                                                    'home_team_abbr': home_team['abbr'],
                                                    'away_team_id': away_team['id'],
                                                    'away_team_name': away_team['name'],
                                                    'away_team_abbr': away_team['abbr'],
                                                    'home_score': None,  # 예정 경기는 점수 없음
                                                    'away_score': None,
                                                    'league': league,
                                                    'status': 'scheduled',
                                                    'is_draw': False,
                                                    'winner': None,
                                                    'game_time': time_part
                                                }
                                                
                                                games.append(game)
                                                self.logger.info(f"📅 Scheduled: {away_team['abbr']} vs {home_team['abbr']} at {time_part}")
                                            else:
                                                self.logger.warning(f"⚠️ Team not found: away='{away_team_text}', home='{home_team_text}'")
                                                
                                except Exception as e:
                                    self.logger.warning(f"⚠️ Failed to parse game: {game_text} - {e}")
                                    continue
                    
                    break  # 해당 날짜를 찾았으므로 루프 종료
            
            return games
            
        except Exception as e:
            self.logger.error(f"❌ Failed to crawl upcoming games for {target_date.strftime('%Y-%m-%d')}: {e}")
            return []

def main():
    import sys
    
    crawler = SimpleCrawler()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--full-season':
            # 전체 시즌 크롤링 (3월 28일부터)
            games_count = crawler.crawl_full_season("2025-03-28")
            print(f"\n🏆 Full season crawl completed: {games_count} games collected")
        elif sys.argv[1] == '--test':
            games_count = crawler.crawl_multiple_days(3)
            print(f"\n✅ Test crawl completed: {games_count} games collected")
        elif sys.argv[1] == '--quick':
            games_count = crawler.crawl_multiple_days(1)
            print(f"\n⚡ Quick crawl completed: {games_count} games collected")
        elif sys.argv[1] == '--upcoming':
            # 예정 경기 크롤링 (기본 30일)
            upcoming_games = crawler.crawl_upcoming_games(30)
            games_count = len(upcoming_games)
            print(f"\n📅 Upcoming games crawl completed: {games_count} games found")
        elif sys.argv[1] == '--date' and len(sys.argv) > 2:
            try:
                target_date = datetime.strptime(sys.argv[2], '%Y-%m-%d')
                games = crawler.crawl_date(target_date)
                if games:
                    crawler.save_games_to_txt(games)
                games_count = len(games)
                print(f"\n✅ Crawl for date {sys.argv[2]} completed: {games_count} games collected")
            except ValueError:
                print("❌ Invalid date format. Please use YYYY-MM-DD.")
                return 1
        else:
            try:
                days = int(sys.argv[1])
                games_count = crawler.crawl_multiple_days(days)
                print(f"\n✅ Crawl completed: {games_count} games collected")
            except ValueError:
                print("❌ Invalid argument. Available options:")
                print("  --full-season    : Crawl entire season")
                print("  --test           : Test crawl (3 days)")
                print("  --quick          : Quick crawl (1 day)")
                print("  --upcoming       : Upcoming games (30 days)")
                print("  <number>         : Crawl specific number of days")
                return 1
    else:
        # 기본: 7일
        games_count = crawler.crawl_multiple_days(7)
        print(f"\n✅ Default crawl completed: {games_count} games collected")
    
    return 0 if games_count > 0 else 1

if __name__ == "__main__":
    exit(main())
