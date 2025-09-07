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

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import time
import logging
import sys

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
        """특정 날짜의 경기 결과 크롤링 (실시간 상태 정보 포함)"""
        if not CRAWLING_ENABLED:
            return []  # Skip actual crawling if dependencies unavailable
            
        # URL 형식: https://www.nikkansports.com/baseball/professional/score/2025/pf-score-20250328.html
        date_str = target_date.strftime("%Y%m%d")
        year = target_date.strftime("%Y")
        url = f"https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date_str}.html"
        
        self.logger.info(f"🔍 Crawling: {target_date.strftime('%Y-%m-%d')}")
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            # Use raw content so BeautifulSoup can detect meta charset correctly
            soup = BeautifulSoup(response.content, 'html.parser')
            games = []
            
            # scoreTable 클래스의 테이블들에서 경기 결과 파싱
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

                    # 점수 파싱 실패(미진행/중지 등)인 경우 스킵
                    if away_score is None or home_score is None:
                        self.logger.info(
                            f"⏭️  Skipping unparsed/unfinished game: {away_team['abbr']} vs {home_team['abbr']} (away='{away_score_text}', home='{home_score_text}')"
                        )
                        continue
                    
                    # 리그 판단 (팀 정보에서)
                    league = away_team['league']
                    
                    # 0-0도 NPB에서는 유효한 무승부로 기록됨 (재경기 아님)
                    # 과거 로직에서 0-0을 제외해 무승부 집계가 누락되는 문제가 있었음
                    # 따라서 0-0을 포함하여 is_draw 처리함
                    
                    # 실시간 경기 상태 정보 추출
                    game_status_info = self.extract_game_status(table)
                    
                    # 경기 정보
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
                        'status': game_status_info['status'],
                        'inning': game_status_info['inning'],
                        'inning_half': game_status_info['inning_half'],
                        'game_time': game_status_info['game_time'],
                        'is_draw': home_score == away_score,  # 실제 동점만 무승부
                        'winner': 'home' if home_score > away_score else ('away' if away_score > home_score else 'draw')
                    }
                    
                    games.append(game)
                    self.logger.info(f"✅ Parsed: {away_team['abbr']} {away_score}-{home_score} {home_team['abbr']}")
                    
                except Exception as e:
                    self.logger.warning(f"⚠️ Failed to parse table: {e}")
                    continue
            
            self.logger.info(f"✅ Found {len(games)} games on {target_date.strftime('%Y-%m-%d')}")
            return games
            
        except Exception as e:
            self.logger.error(f"❌ Failed to crawl {target_date.strftime('%Y-%m-%d')}: {e}")
            return []
    
    def extract_game_status(self, table):
        """경기 상태 정보 추출 (이닝, 진행상황, 시간 등)"""
        status_info = {
            'status': 'completed',  # 기본값: 완료
            'inning': None,
            'inning_half': None,  # 'top' 또는 'bottom'
            'game_time': None
        }
        
        try:
            # 경기 상태를 나타내는 요소들을 찾아서 파싱
            
            # 1. 헤더에서 경기 시간이나 상태 정보 찾기
            header_row = table.find('tr')
            if header_row:
                header_text = header_row.get_text(strip=True)
                
                # 시간 정보 추출 (예: "18:00 開始" 등)
                import re
                time_match = re.search(r'(\d{1,2}):(\d{2})', header_text)
                if time_match:
                    status_info['game_time'] = f"{time_match.group(1)}:{time_match.group(2)}"
            
            # 2. 경기 진행 상태 확인
            status_elements = table.find_all(['td', 'th'], class_=['status', 'inning', 'gameStatus'])
            for elem in status_elements:
                text = elem.get_text(strip=True)
                
                # 진행중 상태 확인
                if any(keyword in text for keyword in ['進行中', '試合中', 'LIVE', 'プレイボール']):
                    status_info['status'] = 'in_progress'
                
                # 연기/중지 상태 확인
                elif any(keyword in text for keyword in ['雨天中止', '中止', '延期', 'サスペンデッド']):
                    status_info['status'] = 'postponed'
                
                # 이닝 정보 추출 (예: "7回表", "9回裏", "延長10回")
                inning_match = re.search(r'(?:延長)?(\d+)回([表裏])?', text)
                if inning_match:
                    status_info['inning'] = int(inning_match.group(1))
                    if inning_match.group(2):
                        status_info['inning_half'] = 'top' if inning_match.group(2) == '表' else 'bottom'
            
            # 3. 스코어보드에서 추가 정보 추출
            score_cells = table.find_all('td', class_='totalScore')
            for cell in score_cells:
                # 현재 진행 중인 스코어인지 확인 (점멸, 색상 등의 클래스)
                if 'active' in cell.get('class', []) or 'current' in cell.get('class', []):
                    status_info['status'] = 'in_progress'
                    
        except Exception as e:
            self.logger.warning(f"⚠️ Could not extract game status: {e}")
            
        return status_info
    
    def save_games_to_txt(self, games, filename="games_raw.txt"):
        """경기 결과를 TXT 파일로 저장 (완료/예정 경기 모두 지원)
        upcoming_games_raw.txt의 경우, 구장/경기시간 필드를 끝에 추가하고 전체 파일을 재작성합니다.
        """
        if not games:
            return
        
        file_path = self.data_dir / filename
        is_upcoming = (filename == "upcoming_games_raw.txt")

        # upcoming은 항상 덮어쓰기(형식 통일), 나머지는 append + dedup
        if is_upcoming:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write("# NPB_SCHEDULED_GAMES_DATA\n")
                f.write(f"# UPDATED: {datetime.now().isoformat()}\n") 
                f.write("# FORMAT: DATE|HOME_ID|HOME_ABBR|HOME_NAME|AWAY_ID|AWAY_ABBR|AWAY_NAME|HOME_SCORE|AWAY_SCORE|LEAGUE|STATUS|IS_DRAW|STADIUM|GAME_TIME\n")
                f.write("# NOTE: HOME_SCORE and AWAY_SCORE are 'NULL' for scheduled games. STADIUM/GAME_TIME may be estimates.\n")

                for game in games:
                    home_score = 'NULL' if game.get('home_score') is None else str(game['home_score'])
                    away_score = 'NULL' if game.get('away_score') is None else str(game['away_score'])
                    stadium = game.get('stadium')
                    if not stadium:
                        abbr = game.get('home_team_abbr')
                        stadium = self.default_stadium_by_abbr.get(abbr, '')
                    game_time = game.get('game_time', '')
                    line = "|".join([
                        game['date'],
                        str(game['home_team_id']),
                        game['home_team_abbr'],
                        game['home_team_name'],
                        str(game['away_team_id']),
                        game['away_team_abbr'],
                        game['away_team_name'],
                        home_score,
                        away_score,
                        game['league'],
                        game.get('status', 'scheduled'),
                        '1' if game.get('is_draw') else '0',
                        stadium,
                        game_time,
                    ])
                    f.write(line + '\n')
            self.logger.info(f"📄 Rewrote {file_path} with {len(games)} scheduled games (stadium/time included)")
            return

        # 기존 파일 읽기 (중복 방지) - 완료 경기용
        existing_games = []
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if line.startswith('#') or not line.strip():
                            continue
                        existing_games.append(line.strip())
            except Exception as e:
                self.logger.warning(f"Failed to read existing file: {e}")
        
        new_lines = []
        existing_set = set(existing_games)
        for game in games:
            home_score = 'NULL' if game['home_score'] is None else str(game['home_score'])
            away_score = 'NULL' if game['away_score'] is None else str(game['away_score'])
            line = "|".join([
                game['date'],
                str(game['home_team_id']),
                game['home_team_abbr'], 
                game['home_team_name'],
                str(game['away_team_id']),
                game['away_team_abbr'],
                game['away_team_name'],
                home_score,
                away_score,
                game['league'],
                game['status'],
                '1' if game['is_draw'] else '0'
            ])
            if line not in existing_set:
                new_lines.append(line)
                existing_set.add(line)
        
        if new_lines:
            with open(file_path, 'a', encoding='utf-8') as f:
                if file_path.stat().st_size == 0:
                    f.write("# NPB_GAMES_DATA\n")
                    f.write(f"# UPDATED: {datetime.now().isoformat()}\n") 
                    f.write("# FORMAT: DATE|HOME_ID|HOME_ABBR|HOME_NAME|AWAY_ID|AWAY_ABBR|AWAY_NAME|HOME_SCORE|AWAY_SCORE|LEAGUE|STATUS|IS_DRAW\n")
                for line in new_lines:
                    f.write(line + '\n')
            self.logger.info(f"📄 Saved {len(new_lines)} new games to {file_path}")
        else:
            self.logger.info("📄 No new games to save")
    
    def save_teams_to_txt(self):
        """팀 정보를 TXT 파일로 저장"""
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
            self.logger.info("📄 Web crawling not available, using existing data...")
            # Use existing data instead
            if self.convert_existing_data_to_txt():
                self.save_teams_to_txt()
                return 1  # Success
            else:
                return 0
        
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
            
            # 요청 간격 (서버 부하 방지)
            time.sleep(1)
        
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
        """여러 날짜 크롤링 (또는 기존 데이터 변환)"""
        self.logger.info(f"🚀 Starting simple crawl for last {days} days...")
        
        if not CRAWLING_ENABLED:
            self.logger.info("📄 Web crawling not available, using existing data...")
            # Use existing data instead
            if self.convert_existing_data_to_txt():
                self.save_teams_to_txt()
                return 1  # Success
            else:
                return 0
        
        all_games = []
        today = datetime.now()
        
        for i in range(0, days):  # 오늘부터 시작  
            target_date = today - timedelta(days=i)
            games = self.crawl_date(target_date)
            all_games.extend(games)
            
            # 요청 간격
            if i < days:
                time.sleep(1)
        
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
                                                # 리그 판단
                                                league = away_team['league']
                                                
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
        else:
            try:
                days = int(sys.argv[1])
                games_count = crawler.crawl_multiple_days(days)
                print(f"\n✅ Crawl completed: {games_count} games collected")
            except ValueError:
                print("❌ Invalid argument. Use: days, --full-season, --test, or --quick")
                return 1
    else:
        # 기본: 7일
        games_count = crawler.crawl_multiple_days(7)
        print(f"\n✅ Default crawl completed: {games_count} games collected")
    
    return 0 if games_count > 0 else 1

if __name__ == "__main__":
    exit(main())
