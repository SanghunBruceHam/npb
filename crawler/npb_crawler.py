#!/Users/sanghunbruceham/Documents/GitHub/npb/crawler/venv/bin/python3

"""
NPB Enhanced Database Crawler
니칸스포츠 데이터 + PostgreSQL DB 통합 크롤러

기능:
- 경기 기본 정보 + 세부 정보 크롤링
- 이닝별 득점 JSONB 저장
- 연장전, 무승부, 취소 경기 처리
- 실시간 순위 계산 및 업데이트
- 크롤링 로그 및 성능 모니터링
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'venv', 'lib', 'python3.13', 'site-packages'))

import requests
from bs4 import BeautifulSoup
import re
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from dotenv import load_dotenv
import pytz

# 로컬 모듈 import
from config import NPB_TEAMS, DATA_SOURCES, CRAWLER_CONFIG
from utils import clean_text, get_jst_now, normalize_team_name, validate_game_data

load_dotenv()

@dataclass  
class EnhancedGameResult:
    """향상된 경기 결과 데이터"""
    # 기본 정보
    game_date: str
    home_team: str
    away_team: str 
    home_score: int
    away_score: int
    
    # 세부 정보
    game_status: str = "completed"
    is_extra_innings: bool = False
    total_innings: int = 9
    is_draw: bool = False
    is_cancelled: bool = False
    stadium: str = ""
    game_start_time: str = ""
    
    # 이닝별 득점 (JSONB로 저장)
    home_inning_scores: List[int] = None
    away_inning_scores: List[int] = None
    
    def to_db_dict(self) -> Dict:
        """DB 저장용 딕셔너리 변환"""
        return {
            'game_date': self.game_date,
            'home_score': self.home_score,
            'away_score': self.away_score,
            'game_status': self.game_status,
            'is_extra_innings': self.is_extra_innings,
            'total_innings': self.total_innings,
            'is_draw': self.is_draw,
            'is_cancelled': self.is_cancelled,
            'stadium': self.stadium,
            'game_start_time': self.game_start_time if self.game_start_time else None,
            'home_inning_scores': Json(self.home_inning_scores) if self.home_inning_scores else None,
            'away_inning_scores': Json(self.away_inning_scores) if self.away_inning_scores else None
        }

class NPBCrawler:
    """NPB 향상된 데이터베이스 크롤러"""
    
    def __init__(self):
        self.setup_config()
        self.setup_database()
        self.setup_session()
        self.setup_team_mapping()
        self.setup_file_logging()
        
    def setup_config(self):
        """기본 설정"""
        self.base_url = DATA_SOURCES['nikkansports']['score_pattern']
        self.jst = pytz.timezone('Asia/Tokyo')
        self.season_year = CRAWLER_CONFIG['validation']['current_season_year']
        
    def setup_database(self):
        """데이터베이스 연결 설정"""
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'npb_dashboard'),
            'user': os.getenv('DB_USER', 'sanghunbruceham'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
    def setup_session(self):
        """HTTP 세션 설정"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': CRAWLER_CONFIG['user_agent'],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en;q=0.5',
            'Referer': DATA_SOURCES['nikkansports']['base_url']
        })
        
    def setup_team_mapping(self):
        """팀 매핑 설정"""
        self.team_mapping = {}
        
        # NPB_TEAMS에서 팀 매핑 생성
        for league_teams in NPB_TEAMS.values():
            for team_data in league_teams.values():
                abbr = team_data['abbr']
                # 키워드들을 매핑에 추가
                for keyword in team_data['keywords']:
                    self.team_mapping[keyword] = abbr
                # 팀명들도 매핑에 추가
                self.team_mapping[team_data['name_jp']] = abbr
        
    def get_db_connection(self):
        """데이터베이스 연결"""
        return psycopg2.connect(**self.db_config)
        
    def convert_team_name(self, team_text: str) -> Optional[str]:
        """팀명을 약어로 변환"""
        team_text = team_text.strip()
        team_text_no_space = re.sub(r'\s+', '', team_text)
        
        # 직접 매칭
        if team_text in self.team_mapping:
            return self.team_mapping[team_text]
        
        # 공백 제거 매칭
        if team_text_no_space in self.team_mapping:
            return self.team_mapping[team_text_no_space]
        
        # 부분 매칭
        for keyword, abbr in self.team_mapping.items():
            keyword_no_space = re.sub(r'\s+', '', keyword)
            if keyword_no_space in team_text_no_space or team_text_no_space in keyword_no_space:
                return abbr
        
        return None
        
    def get_team_id(self, team_abbr: str) -> Optional[int]:
        """팀 약어로 team_id 조회"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT team_id FROM teams WHERE team_abbreviation = %s", 
                        (team_abbr,)
                    )
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception:
            return None
            
    def crawl_games(self, date_str: str) -> List[EnhancedGameResult]:
        """향상된 경기 크롤링"""
        year = date_str[:4]
        date_formatted = date_str.replace('-', '')
        url = self.base_url.format(year=year, date=date_formatted)
        
        print(f"🔍 Crawling: {date_str}")
        
        try:
            response = self.session.get(url, timeout=CRAWLER_CONFIG['request_timeout'])
            
            if response.status_code == 404:
                print(f"📅 No games on {date_str}")
                return []
                
            response.raise_for_status()
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.content, 'html.parser')
            
            games = []
            tables = soup.find_all('table')
            
            # 디버그: 총 테이블 수
            debug_info = f"Found {len(tables)} tables"
            valid_tables = 0
            
            for i, table in enumerate(tables):
                game = self.parse_enhanced_table(table, date_str, soup)
                if game:
                    games.append(game)
                    valid_tables += 1
                    
            # 디버그 출력 - 6경기 미만일 때만
            if len(games) < 6:
                print(f"🔍 Debug {date_str}: {debug_info}, valid: {valid_tables}")
                    
            print(f"✅ Found {len(games)} games on {date_str}")
            return games
            
        except Exception as e:
            print(f"❌ Error crawling {date_str}: {e}")
            return []
    
    def parse_enhanced_table(self, table, date_str: str, soup) -> Optional[EnhancedGameResult]:
        """테이블에서 향상된 경기 정보 추출"""
        try:
            # 디버깅 추가
            rows = table.find_all('tr')
            if len(rows) < 2:  # 조건 완화: 2행 이상
                print(f"    ❌ 테이블 거부: {len(rows)}행 (최소 2행 필요)")
                return None
                
            # 이닝 헤더 확인 - 더 관대한 조건
            header_row = rows[0]
            header_text = header_row.get_text()
            
            # 조건 1: 이닝 숫자가 있는지 확인
            has_innings = bool(re.search(r'[１２３４５６７８９123456789]', header_text))
            
            # 조건 2: 또는 야구 관련 용어가 있는지 확인 
            has_baseball_terms = bool(re.search(r'[回合計RHE投手]', header_text))
            
            if not (has_innings or has_baseball_terms):
                print(f"    ❌ 테이블 거부: 헤더에 이닝/야구용어 없음 '{header_text[:50]}'")
                return None
                
            # 이닝 수 계산 - 더 관대한 매칭
            header_cells = header_row.find_all(['th', 'td'])
            inning_count = sum(1 for cell in header_cells 
                             if re.match(r'^[１２３４５６７８９1234567891011121314]$', cell.get_text(strip=True)))
            
            is_extra = inning_count > 9
            total_innings = max(inning_count, 9)
            
            # 팀 데이터 추출 - 조건을 더욱 완화
            team_rows = []
            for row in rows[1:]:
                cells = row.find_all(['td', 'th'])
                cell_count = len(cells)
                
                # 조건을 단계적으로 완화
                if cell_count >= 8:  # 기본 조건
                    team_rows.append(row)
                elif cell_count >= 6:  # 완화된 조건
                    # 첫 번째 셀이 팀명처럼 보이는지 확인 - 더 관대하게
                    first_cell = cells[0].get_text(strip=True)
                    # 전각문자 처리 및 더 많은 키워드 추가
                    team_keywords = ['巨人', '阪神', 'DeNA', 'ＤｅＮＡ', '広島', '広  島', '中日', 'ヤクルト', 
                                   'ソフトバンク', 'ロッテ', '楽天', 'オリックス', '西武', '日本ハム', 'ジャイアンツ',
                                   'タイガース', 'ベイスターズ', 'カープ', 'ドラゴンズ', 'スワローズ', 'ホークス',
                                   'マリーンズ', 'イーグルス', 'バファローズ', 'ライオンズ', 'ファイターズ']
                    if any(team in first_cell for team in team_keywords):
                        team_rows.append(row)
            
            # 디버그: 상세 정보
            if len(team_rows) < 2:
                all_row_info = []
                for i, row in enumerate(rows[1:], 1):
                    cells = row.find_all(['td', 'th'])
                    first_cell = cells[0].get_text(strip=True) if cells else ""
                    all_row_info.append(f"행{i}: {len(cells)}셀, '{first_cell}'")
                
                print(f"🔍 테이블 거부됨 - 팀행: {len(team_rows)}개")
                print(f"    전체 행 정보: {all_row_info}")
                return None
            
            # 2개가 아니어도 최소 2개 이상이면 시도
            if len(team_rows) < 2:
                return None
                
            # 가장 유력한 2개 행 선택 (셀 수가 많은 순)
            team_rows = sorted(team_rows, key=lambda r: len(r.find_all(['td', 'th'])), reverse=True)[:2]
                
            away_row, home_row = team_rows[0], team_rows[1]
            
            # 어웨이팀 정보
            away_cells = away_row.find_all(['td', 'th'])
            away_team_text = away_cells[0].get_text(strip=True)
            away_team = self.convert_team_name(away_team_text)
            away_total_score = int(away_cells[-1].get_text(strip=True))
            away_inning_scores = self.extract_inning_scores(away_cells)
            
            # 홈팀 정보  
            home_cells = home_row.find_all(['td', 'th'])
            home_team_text = home_cells[0].get_text(strip=True)
            home_team = self.convert_team_name(home_team_text)
            home_total_score = self.calculate_home_score(home_cells)
            home_inning_scores = self.extract_inning_scores(home_cells)
            
            if not away_team or not home_team:
                return None
                
            # 경기 상태 및 특수 상황 판단
            game_status = self.determine_game_status(soup)
            is_draw = (away_total_score == home_total_score and game_status == "completed")
            is_cancelled = "cancelled" in game_status
            
            game = EnhancedGameResult(
                game_date=date_str,
                home_team=home_team,
                away_team=away_team,
                home_score=home_total_score,
                away_score=away_total_score,
                game_status=game_status,
                is_extra_innings=is_extra,
                total_innings=total_innings,
                is_draw=is_draw,
                is_cancelled=is_cancelled,
                home_inning_scores=home_inning_scores,
                away_inning_scores=away_inning_scores
            )
            
            return game
            
        except Exception as e:
            return None
    
    def calculate_home_score(self, home_cells) -> int:
        """홈팀 점수 계산 (X 처리)"""
        home_score_text = home_cells[-1].get_text(strip=True)
        
        if 'X' in home_score_text:
            # 이닝별 점수 합산
            total = 0
            for cell in home_cells[1:-1]:
                cell_text = cell.get_text(strip=True)
                if cell_text and cell_text != 'X' and cell_text.isdigit():
                    total += int(cell_text)
            return total
        else:
            if home_score_text.isdigit():
                return int(home_score_text)
            else:
                numbers = re.findall(r'\\d+', home_score_text)
                return int(numbers[0]) if numbers else 0
    
    def extract_inning_scores(self, cells) -> List[int]:
        """이닝별 점수 추출"""
        scores = []
        for cell in cells[1:-1]:  # 팀명과 계 제외
            cell_text = cell.get_text(strip=True)
            if cell_text == 'X':
                break
            elif cell_text.isdigit():
                scores.append(int(cell_text))
            else:
                scores.append(0)
        return scores
    
    def determine_game_status(self, soup) -> str:
        """경기 상태 판단"""
        page_text = soup.get_text()
        
        if '中止' in page_text or '延期' in page_text:
            return "cancelled" 
        elif '進行中' in page_text:
            return "in_progress"
        else:
            return "completed"
    
    def save_games_to_db(self, games: List[EnhancedGameResult]) -> bool:
        """향상된 경기 데이터를 DB에 저장"""
        if not games:
            return True
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    saved_count = 0
                    
                    for game in games:
                        home_team_id = self.get_team_id(game.home_team)
                        away_team_id = self.get_team_id(game.away_team)
                        
                        if not home_team_id or not away_team_id:
                            print(f"⚠️ Team IDs not found: {game.home_team}, {game.away_team}")
                            continue
                        
                        game_data = game.to_db_dict()
                        
                        # UPSERT 쿼리
                        values = (
                            home_team_id, away_team_id, game_data['game_date'],
                            game_data['home_score'], game_data['away_score'], game_data['game_status'],
                            game_data['is_extra_innings'], game_data['total_innings'], 
                            game_data['is_draw'], game_data['is_cancelled'],
                            game_data['stadium'], game_data['game_start_time'],
                            game_data['home_inning_scores'], game_data['away_inning_scores']
                        )
                        
                        cur.execute("""
                            INSERT INTO games (
                                home_team_id, away_team_id, game_date,
                                home_score, away_score, game_status,
                                is_extra_innings, total_innings, is_draw, is_cancelled,
                                stadium, game_start_time, 
                                home_inning_scores, away_inning_scores
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT ON CONSTRAINT unique_game_date_teams
                            DO UPDATE SET
                                home_score = EXCLUDED.home_score,
                                away_score = EXCLUDED.away_score,  
                                game_status = EXCLUDED.game_status,
                                is_extra_innings = EXCLUDED.is_extra_innings,
                                total_innings = EXCLUDED.total_innings,
                                is_draw = EXCLUDED.is_draw,
                                is_cancelled = EXCLUDED.is_cancelled,
                                stadium = EXCLUDED.stadium,
                                game_start_time = EXCLUDED.game_start_time,
                                home_inning_scores = EXCLUDED.home_inning_scores,
                                away_inning_scores = EXCLUDED.away_inning_scores,
                                updated_at = CURRENT_TIMESTAMP
                        """, values)
                        
                        saved_count += 1
                    
                    conn.commit()
                    print(f"✅ Saved {saved_count} games to database")
                    return True
                    
        except Exception as e:
            print(f"❌ Database save failed: {e}")
            return False
    
    def update_standings_from_games(self) -> bool:
        """경기 결과로부터 순위표 업데이트"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    print("📊 Updating standings from game results...")
                    
                    # 현재 시즌 순위표 삭제
                    cur.execute("DELETE FROM standings WHERE season_year = %s", (self.season_year,))
                    
                    # 경기 결과로부터 순위 계산
                    cur.execute("""
                        WITH team_stats AS (
                            SELECT 
                                t.team_id,
                                t.team_abbreviation,
                                t.league,
                                COUNT(*) as games_played,
                                COUNT(*) FILTER (WHERE 
                                    (g.home_team_id = t.team_id AND g.home_score > g.away_score) OR
                                    (g.away_team_id = t.team_id AND g.away_score > g.home_score)
                                ) as wins,
                                COUNT(*) FILTER (WHERE 
                                    (g.home_team_id = t.team_id AND g.home_score < g.away_score) OR
                                    (g.away_team_id = t.team_id AND g.away_score < g.home_score)
                                ) as losses,
                                COUNT(*) FILTER (WHERE g.is_draw) as draws,
                                SUM(CASE WHEN g.home_team_id = t.team_id THEN g.home_score ELSE g.away_score END) as runs_scored,
                                SUM(CASE WHEN g.home_team_id = t.team_id THEN g.away_score ELSE g.home_score END) as runs_allowed
                            FROM teams t
                            LEFT JOIN games g ON (g.home_team_id = t.team_id OR g.away_team_id = t.team_id)
                            WHERE EXTRACT(YEAR FROM g.game_date) = %s AND g.game_status = 'completed'
                            GROUP BY t.team_id, t.team_abbreviation, t.league
                        ),
                        league_leaders AS (
                            SELECT 
                                league,
                                MAX(CASE WHEN wins + losses > 0 THEN wins::NUMERIC / (wins + losses) ELSE 0 END) as leader_pct,
                                MAX(wins) as leader_wins,
                                MIN(losses) as leader_losses
                            FROM team_stats
                            GROUP BY league
                        )
                        INSERT INTO standings (
                            team_id, season_year, league, position_rank, games_played, wins, losses, draws,
                            win_percentage, games_behind, runs_scored, runs_allowed, run_differential,
                            updated_at
                        )
                        SELECT 
                            ts.team_id,
                            %s as season_year,
                            ts.league,
                            ROW_NUMBER() OVER (
                                PARTITION BY ts.league 
                                ORDER BY 
                                    CASE WHEN ts.wins + ts.losses > 0 THEN ts.wins::NUMERIC / (ts.wins + ts.losses) ELSE 0 END DESC,
                                    ts.wins DESC,
                                    ts.losses ASC
                            ) as rank,
                            ts.games_played,
                            ts.wins,
                            ts.losses, 
                            ts.draws,
                            CASE WHEN ts.wins + ts.losses > 0 THEN ts.wins::NUMERIC / (ts.wins + ts.losses) ELSE 0 END as win_percentage,
                            ((ll.leader_wins - ts.wins) + (ts.losses - ll.leader_losses))::NUMERIC / 2.0 as games_behind,
                            ts.runs_scored,
                            ts.runs_allowed,
                            ts.runs_scored - ts.runs_allowed as run_differential,
                            CURRENT_TIMESTAMP
                        FROM team_stats ts
                        JOIN league_leaders ll ON ts.league = ll.league
                        ORDER BY ts.league, win_percentage DESC
                    """, (self.season_year, self.season_year))
                    
                    updated_count = cur.rowcount
                    conn.commit()
                    
                    print(f"✅ Updated standings for {updated_count} teams")
                    return True
                    
        except Exception as e:
            print(f"❌ Standings update failed: {e}")
            return False
    
    def setup_file_logging(self):
        """파일 로깅 설정"""
        import logging
        from datetime import datetime
        
        # 로그 디렉토리 생성
        log_dir = os.path.join(os.path.dirname(__file__), 'logs')
        os.makedirs(log_dir, exist_ok=True)
        
        # 로그 파일명 (날짜별)
        log_filename = f"crawler_{datetime.now().strftime('%Y%m%d')}.log"
        log_file = os.path.join(log_dir, log_filename)
        
        # 로거 설정
        logger = logging.getLogger('NPBCrawler')
        logger.setLevel(logging.INFO)
        
        # 파일 핸들러
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        
        # 포맷터
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        
        # 중복 핸들러 방지
        if not logger.handlers:
            logger.addHandler(file_handler)
        
        self.logger = logger

    def log_crawl_activity(self, status: str, message: str, records_count: int = 0):
        """크롤링 활동 로그"""
        # 파일 로그
        if hasattr(self, 'logger'):
            self.logger.info(f"Status: {status}, Records: {records_count}, Message: {message}")
        
        # 데이터베이스 로그
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO crawl_logs (
                            source_name, crawl_status, records_processed,
                            error_message, crawl_timestamp
                        ) VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """, ('NPB_ENHANCED', status, records_count, message))
                    conn.commit()
        except Exception as e:
            if hasattr(self, 'logger'):
                self.logger.error(f"Failed to log to database: {e}")
            pass
            
    def run_crawl(self, days_back: int = 7) -> bool:
        """향상된 전체 크롤링 실행"""
        start_time = datetime.now()
        print(f"🚀 Starting NPB crawl for last {days_back} days...")
        
        try:
            all_games = []
            jst_now = datetime.now(self.jst)
            
            # 날짜 범위 생성
            for i in range(days_back):
                date = jst_now - timedelta(days=i)
                date_str = date.strftime('%Y-%m-%d')
                
                games = self.crawl_games(date_str)
                all_games.extend(games)
                
                # 요청 간격
                time.sleep(DATA_SOURCES['nikkansports']['rate_limit'])
            
            # 데이터베이스 저장
            save_success = self.save_games_to_db(all_games)
            standings_success = self.update_standings_from_games()
            
            # 크롤링 통계
            duration = datetime.now() - start_time
            total_records = len(all_games)
            
            # 특수 경기 통계
            extra_games = [g for g in all_games if g.is_extra_innings]
            draw_games = [g for g in all_games if g.is_draw]
            cancelled_games = [g for g in all_games if g.is_cancelled]
            
            print(f"\\n🏆 **CRAWL SUMMARY**")
            print(f"Total games: {total_records}")
            print(f"연장전: {len(extra_games)}")
            print(f"무승부: {len(draw_games)}")
            print(f"취소/연기: {len(cancelled_games)}")
            print(f"Duration: {duration.total_seconds():.1f}s")
            
            # 로그 기록
            status = 'success' if (save_success and standings_success) else 'partial'
            self.log_crawl_activity(status, f'Crawl: {total_records} games', total_records)
            
            return save_success and standings_success
            
        except Exception as e:
            error_msg = f"Crawl failed: {e}"
            print(f"❌ {error_msg}")
            self.log_crawl_activity('error', error_msg, 0)
            return False
    
    def crawl_full_season(self):
        """NPB 2025 시즌 전체 크롤링"""
        # NPB 시즌 일반적으로 3월 말 ~ 10월 초
        season_start = datetime(2025, 3, 20)
        season_end = datetime(2025, 10, 15)
        
        print(f"🏟️ NPB 2025 시즌 전체 크롤링 시작")
        print(f"📅 기간: {season_start.strftime('%Y-%m-%d')} ~ {season_end.strftime('%Y-%m-%d')}")
        
        current_date = season_start
        total_games = 0
        total_days = (season_end - season_start).days + 1
        processed_days = 0
        
        while current_date <= season_end:
            date_str = current_date.strftime('%Y-%m-%d')
            
            # 진행률 표시
            processed_days += 1
            progress = (processed_days / total_days) * 100
            print(f"\n🔄 [{processed_days:3d}/{total_days}] ({progress:5.1f}%) - {date_str}")
            
            try:
                games = self.crawl_games(date_str)
                if games:
                    save_success = self.save_games_to_db(games)
                    if save_success:
                        total_games += len(games)
                        print(f"✅ {len(games)} games saved")
                    else:
                        print(f"❌ Failed to save {len(games)} games")
                else:
                    print("📅 No games")
                
                # 매주 일요일마다 순위표 업데이트
                if current_date.weekday() == 6:  # 일요일
                    print("📊 Weekly standings update...")
                    self.update_standings_from_games()
                
                # 서버 부하 방지를 위한 딜레이
                time.sleep(1)
                
            except Exception as e:
                print(f"❌ Error on {date_str}: {e}")
                continue
            
            current_date += timedelta(days=1)
        
        # 최종 순위표 업데이트
        print("\n📊 Final standings update...")
        standings_success = self.update_standings_from_games()
        
        print(f"\n🏆 **SEASON CRAWL COMPLETE**")
        print(f"Total games collected: {total_games}")
        print(f"Standings updated: {'✅' if standings_success else '❌'}")
        print(f"Duration: {(datetime.now() - season_start).days} days processed")
        
        return total_games > 0

def main():
    """메인 실행"""
    crawler = NPBCrawler()
    
    try:
        if len(sys.argv) > 1:
            if sys.argv[1] == '--test':
                print("🧪 Running test crawl (3 days)...")
                success = crawler.run_crawl(days_back=3)
            elif sys.argv[1] == '--season':
                print("🏟️ Running FULL SEASON crawl (March - October 2025)...")
                success = crawler.crawl_full_season()
            else:
                days = int(sys.argv[1])
                print(f"🚀 Running crawl ({days} days)...")
                success = crawler.run_crawl(days_back=days)
        else:
            print("🚀 Running full crawl (7 days)...")
            success = crawler.run_crawl(days_back=7)
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\\n⏹️ Crawl interrupted by user")
    except Exception as e:
        print(f"❌ Crawler failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()