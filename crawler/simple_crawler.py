#!/usr/bin/env python3
"""
NPB Simple Crawler - PostgreSQL 없이 직접 TXT 저장
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
            '阪神': {'id': 2, 'abbr': 'HAN', 'name': '阪神タイガース', 'league': 'Central'},
            'ＤｅＮＡ': {'id': 3, 'abbr': 'YDB', 'name': '横浜DeNAベイスターズ', 'league': 'Central'},
            'DeNA': {'id': 3, 'abbr': 'YDB', 'name': '横浜DeNAベイスターズ', 'league': 'Central'},
            '中日': {'id': 5, 'abbr': 'CHU', 'name': '中日ドラゴンズ', 'league': 'Central'},
            '広島': {'id': 4, 'abbr': 'HIR', 'name': '広島東洋カープ', 'league': 'Central'},
            'ヤクルト': {'id': 6, 'abbr': 'YAK', 'name': '東京ヤクルトスワローズ', 'league': 'Central'},
            
            # 퍼시픽리그
            'ソフトバンク': {'id': 7, 'abbr': 'SOF', 'name': '福岡ソフトバンクホークス', 'league': 'Pacific'},
            'ロッテ': {'id': 8, 'abbr': 'LOT', 'name': '千葉ロッテマリーンズ', 'league': 'Pacific'},
            '楽天': {'id': 9, 'abbr': 'RAK', 'name': '東北楽天ゴールデンイーグルス', 'league': 'Pacific'},
            'オリックス': {'id': 10, 'abbr': 'ORI', 'name': 'オリックスバファローズ', 'league': 'Pacific'},
            '西武': {'id': 11, 'abbr': 'SEI', 'name': '埼玉西武ライオンズ', 'league': 'Pacific'},
            '日本ハム': {'id': 12, 'abbr': 'NIP', 'name': '北海道日本ハムファイターズ', 'league': 'Pacific'}
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
    
    def convert_db_data_to_txt(self):
        """기존 DB 데이터를 TXT로 변환 (fallback)"""
        self.logger.info("📄 Converting existing database data to TXT format...")
        
        try:
            # Use existing db_to_simple_txt script
            db_script = self.project_root / 'scripts' / 'db_to_simple_txt.py'
            if db_script.exists():
                result = os.system(f"cd {self.project_root} && python3 {db_script}")
                if result == 0:
                    self.logger.info("✅ DB to TXT conversion completed")
                    return True
                else:
                    self.logger.error("❌ DB to TXT conversion failed")
                    return False
            else:
                self.logger.error("❌ DB conversion script not found")
                return False
                
        except Exception as e:
            self.logger.error(f"❌ DB conversion error: {e}")
            return False

    def crawl_date(self, target_date):
        """특정 날짜의 경기 결과 크롤링"""
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
            
            soup = BeautifulSoup(response.text, 'html.parser')
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
                    
                    # 숫자만 추출 (한자 숫자도 처리)
                    away_score_text = away_score_cell.get_text(strip=True)
                    home_score_text = home_score_cell.get_text(strip=True)
                    
                    # 한자 숫자를 아라비아 숫자로 변환
                    def convert_jp_number(text):
                        jp_to_num = {'０': 0, '１': 1, '２': 2, '３': 3, '４': 4, '５': 5, '６': 6, '７': 7, '８': 8, '９': 9}
                        if text in jp_to_num:
                            return jp_to_num[text]
                        try:
                            return int(text)
                        except:
                            return 0
                    
                    away_score = convert_jp_number(away_score_text)
                    home_score = convert_jp_number(home_score_text)
                    
                    # 리그 판단 (팀 정보에서)
                    league = away_team['league']
                    
                    # 0-0 경기는 NPB에서 재경기로 처리되므로 제외
                    if home_score == 0 and away_score == 0:
                        self.logger.info(f"⏭️  Skipping 0-0 game: {away_team['abbr']} vs {home_team['abbr']} (postponed/rescheduled)")
                        continue
                    
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
                        'status': 'completed',
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
    
    def save_games_to_txt(self, games, filename="games_raw.txt"):
        """경기 결과를 TXT 파일로 저장"""
        if not games:
            return
        
        file_path = self.data_dir / filename
        
        # 기존 파일 읽기 (중복 방지)
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
        
        # 새 데이터 추가
        new_lines = []
        existing_set = set(existing_games)
        
        for game in games:
            # TXT 형식: DATE|HOME_ID|HOME_ABBR|HOME_NAME|AWAY_ID|AWAY_ABBR|AWAY_NAME|HOME_SCORE|AWAY_SCORE|LEAGUE|STATUS|IS_DRAW
            line = "|".join([
                game['date'],
                str(game['home_team_id']),
                game['home_team_abbr'], 
                game['home_team_name'],
                str(game['away_team_id']),
                game['away_team_abbr'],
                game['away_team_name'],
                str(game['home_score']),
                str(game['away_score']),
                game['league'],
                game['status'],
                '1' if game['is_draw'] else '0'
            ])
            
            if line not in existing_set:
                new_lines.append(line)
                existing_set.add(line)
        
        if new_lines:
            # 파일에 추가
            with open(file_path, 'a', encoding='utf-8') as f:
                if file_path.stat().st_size == 0:
                    # 새 파일인 경우 헤더 추가
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
        
        for team_info in self.teams.values():
            line = "|".join([
                str(team_info['id']),
                team_info['abbr'],
                team_info['name'],
                team_info['league']
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
            # Use existing database data instead
            if self.convert_db_data_to_txt():
                self.save_teams_to_txt()
                return 1  # Success
            else:
                return 0
        
        all_games = []
        start = datetime.strptime(start_date, "%Y-%m-%d")
        today = datetime.now()
        
        current_date = start
        total_days = (today - start).days + 1
        
        self.logger.info(f"📅 Crawling {total_days} days from {start_date} to {today.strftime('%Y-%m-%d')}")
        
        day_count = 0
        while current_date <= today:
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
            # Use existing database data instead
            if self.convert_db_data_to_txt():
                self.save_teams_to_txt()
                return 1  # Success
            else:
                return 0
        
        all_games = []
        today = datetime.now()
        
        for i in range(1, days + 1):  # 어제부터 시작
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