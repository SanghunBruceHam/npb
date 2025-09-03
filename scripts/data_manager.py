#!/usr/bin/env python3
"""
Enhanced NPB Data Manager
크롤링 → raw 데이터 보관 → DB 저장 → JSON 생성 통합 관리
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'crawler'))

import json
import gzip
from datetime import datetime, timedelta
from pathlib import Path
import logging
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

class DataManager:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.setup_directories()
        self.setup_logging()
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'npb_dashboard_dev'),
            'user': os.getenv('DB_USER', 'sanghunbruceham'),
            'password': os.getenv('DB_PASSWORD', '')
        }
    
    def setup_directories(self):
        """디렉토리 구조 생성"""
        self.data_dirs = {
            'raw_html': self.project_root / "data" / "raw" / "html",
            'raw_json': self.project_root / "data" / "raw" / "json", 
            'processed': self.project_root / "data" / "processed",
            'api': self.project_root / "data",  # 기존 API용 JSON
            'backups': self.project_root / "data" / "backups",
            'archive': self.project_root / "data" / "archive"
        }
        
        for dir_path in self.data_dirs.values():
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def setup_logging(self):
        log_dir = self.project_root / "logs" / "data_manager"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = log_dir / f"manager_{datetime.now().strftime('%Y%m%d')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('data_manager')
    
    def save_raw_html(self, date_str: str, html_content: str, source_url: str):
        """원본 HTML 저장"""
        try:
            # 날짜별 디렉토리
            date_dir = self.data_dirs['raw_html'] / date_str[:4] / date_str[5:7]
            date_dir.mkdir(parents=True, exist_ok=True)
            
            # 메타데이터 포함한 파일
            raw_data = {
                'date': date_str,
                'url': source_url,
                'crawled_at': datetime.now().isoformat(),
                'html_content': html_content,
                'content_hash': hashlib.md5(html_content.encode()).hexdigest()
            }
            
            # 압축 저장 (용량 절약)
            file_path = date_dir / f"nikkansports_{date_str}.json.gz"
            
            with gzip.open(file_path, 'wt', encoding='utf-8') as f:
                json.dump(raw_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"📁 Raw HTML saved: {file_path}")
            return file_path
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save raw HTML for {date_str}: {e}")
            return None
    
    def save_raw_parsed_data(self, date_str: str, parsed_games: list):
        """파싱된 raw 데이터 저장 (DB 저장 전)"""
        try:
            date_dir = self.data_dirs['raw_json'] / date_str[:4] / date_str[5:7]
            date_dir.mkdir(parents=True, exist_ok=True)
            
            raw_data = {
                'date': date_str,
                'parsed_at': datetime.now().isoformat(),
                'games_count': len(parsed_games),
                'games': [game.__dict__ if hasattr(game, '__dict__') else game for game in parsed_games]
            }
            
            file_path = date_dir / f"parsed_{date_str}.json"
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(raw_data, f, ensure_ascii=False, indent=2, default=str)
            
            self.logger.info(f"📁 Raw parsed data saved: {file_path}")
            return file_path
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save raw parsed data for {date_str}: {e}")
            return None
    
    def sync_db_to_json(self):
        """DB → JSON 동기화 (API용)"""
        try:
            self.logger.info("🔄 Starting DB to JSON sync...")
            
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # 1. teams.json 업데이트
                    cur.execute("SELECT * FROM teams ORDER BY league, team_abbreviation")
                    teams = [dict(row) for row in cur.fetchall()]
                    self._save_api_json(teams, 'teams.json')
                    
                    # 2. standings.json 업데이트  
                    cur.execute("""
                        SELECT s.*, t.team_name, t.team_abbreviation
                        FROM standings s
                        JOIN teams t ON s.team_id = t.team_id  
                        WHERE s.season_year = 2025
                        ORDER BY s.league, s.position_rank
                    """)
                    standings_raw = [dict(row) for row in cur.fetchall()]
                    
                    # 리그별 분리
                    central = [s for s in standings_raw if s['league'] == 'Central']
                    pacific = [s for s in standings_raw if s['league'] == 'Pacific']
                    
                    standings = {
                        'season_year': 2025,
                        'updated_at': datetime.now().isoformat(),
                        'central_league': {'standings': central},
                        'pacific_league': {'standings': pacific}
                    }
                    self._save_api_json(standings, 'standings.json')
                    
                    # 3. 최근 games.json 업데이트
                    cur.execute("""
                        SELECT g.*, 
                               ht.team_abbreviation as home_team_abbr,
                               ht.team_name as home_team_name,
                               at.team_abbreviation as away_team_abbr, 
                               at.team_name as away_team_name
                        FROM games g
                        JOIN teams ht ON g.home_team_id = ht.team_id
                        JOIN teams at ON g.away_team_id = at.team_id
                        WHERE g.game_date >= '2025-01-01'
                        ORDER BY g.game_date DESC
                    """)
                    games = []
                    for row in cur.fetchall():
                        game = dict(row)
                        # datetime 변환
                        for field in ['game_date', 'created_at', 'updated_at']:
                            if game.get(field):
                                if hasattr(game[field], 'strftime'):
                                    game[field] = game[field].strftime('%Y-%m-%d') if 'date' in field else game[field].isoformat()
                        games.append(game)
                    self._save_api_json(games, 'games.json')
                    
                    # 4. dashboard.json 업데이트
                    dashboard_data = self._generate_dashboard_data(cur)
                    self._save_api_json(dashboard_data, 'dashboard.json')
                    
            self.logger.info("✅ DB to JSON sync completed")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ DB to JSON sync failed: {e}")
            return False
    
    def _save_api_json(self, data, filename):
        """API용 JSON 저장"""
        file_path = self.data_dirs['api'] / filename
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        
        self.logger.info(f"✅ Updated {filename}")
    
    def _generate_dashboard_data(self, cur):
        """대시보드 데이터 생성"""
        # 통계 데이터
        cur.execute("""
            SELECT 
                COUNT(*) as total_games,
                COUNT(*) FILTER (WHERE game_date = CURRENT_DATE) as today_games,
                COUNT(*) FILTER (WHERE game_date >= CURRENT_DATE - INTERVAL '7 days') as week_games,
                COUNT(*) FILTER (WHERE is_extra_innings = true) as extra_innings_games,
                COUNT(*) FILTER (WHERE is_draw = true) as draw_games
            FROM games
            WHERE game_date >= '2025-03-01'
        """)
        stats = dict(cur.fetchone())
        
        # 최고 득점 경기
        cur.execute("""
            SELECT g.game_date, ht.team_abbreviation as home_team,
                   at.team_abbreviation as away_team, g.home_score, g.away_score,
                   (g.home_score + g.away_score) as total_score
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY total_score DESC LIMIT 5
        """)
        high_scoring = [dict(row) for row in cur.fetchall()]
        
        # 날짜 변환
        for game in high_scoring:
            if game.get('game_date') and hasattr(game['game_date'], 'strftime'):
                game['game_date'] = game['game_date'].strftime('%Y-%m-%d')
        
        return {
            'generated_at': datetime.now().isoformat(),
            'season_stats': stats,
            'highlights': {'high_scoring_games': high_scoring}
        }
    
    def archive_old_data(self, days_old=90):
        """오래된 데이터 아카이브"""
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            archived_count = 0
            
            # raw HTML 아카이브
            for year_dir in self.data_dirs['raw_html'].iterdir():
                if not year_dir.is_dir():
                    continue
                    
                for month_dir in year_dir.iterdir():
                    if not month_dir.is_dir():
                        continue
                        
                    for file_path in month_dir.glob("*.json.gz"):
                        if file_path.stat().st_mtime < cutoff_date.timestamp():
                            # 아카이브 디렉토리로 이동
                            archive_path = self.data_dirs['archive'] / file_path.relative_to(self.data_dirs['raw_html'])
                            archive_path.parent.mkdir(parents=True, exist_ok=True)
                            
                            file_path.rename(archive_path)
                            archived_count += 1
            
            self.logger.info(f"📦 Archived {archived_count} old files")
            return archived_count
            
        except Exception as e:
            self.logger.error(f"❌ Archive failed: {e}")
            return 0
    
    def get_data_summary(self):
        """데이터 현황 요약"""
        try:
            summary = {
                'directories': {},
                'db_status': {},
                'last_update': datetime.now().isoformat()
            }
            
            # 디렉토리별 파일 수
            for name, path in self.data_dirs.items():
                if path.exists():
                    file_count = len(list(path.glob("**/*.*")))
                    summary['directories'][name] = {
                        'path': str(path),
                        'file_count': file_count
                    }
            
            # DB 상태
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM games")
                    summary['db_status']['total_games'] = cur.fetchone()[0]
                    
                    cur.execute("SELECT MAX(game_date), MIN(game_date) FROM games")
                    dates = cur.fetchone()
                    summary['db_status']['date_range'] = {
                        'earliest': dates[1].strftime('%Y-%m-%d') if dates[1] else None,
                        'latest': dates[0].strftime('%Y-%m-%d') if dates[0] else None
                    }
            
            return summary
            
        except Exception as e:
            self.logger.error(f"❌ Summary generation failed: {e}")
            return {}

def main():
    manager = DataManager()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--sync':
            success = manager.sync_db_to_json()
        elif sys.argv[1] == '--archive':
            count = manager.archive_old_data()
            success = count >= 0
        elif sys.argv[1] == '--summary':
            summary = manager.get_data_summary()
            print(json.dumps(summary, indent=2, ensure_ascii=False))
            success = bool(summary)
        else:
            print("Usage: --sync | --archive | --summary")
            success = False
    else:
        # 기본: sync 실행
        success = manager.sync_db_to_json()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()