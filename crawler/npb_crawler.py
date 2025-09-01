#!/usr/bin/env python3
"""
NPB Dashboard Data Crawler
실시간 NPB (일본프로야구) 데이터를 수집하여 데이터베이스에 저장하는 크롤러

주요 기능:
- NPB 공식 사이트에서 순위표 수집
- Yahoo Sports Japan에서 경기 결과 수집
- 데이터 검증 및 정규화
- PostgreSQL 데이터베이스 업데이트
"""

import os
import sys
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
from dataclasses import dataclass, asdict
import traceback

import requests
from bs4 import BeautifulSoup
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from loguru import logger
import pytz

# Load environment variables
load_dotenv()

@dataclass
class TeamStanding:
    """팀 순위 정보"""
    team_abbreviation: str
    team_name_jp: str
    league: str
    rank: int
    games_played: int
    wins: int
    losses: int
    draws: int
    win_percentage: float
    games_behind: float
    runs_scored: int = 0
    runs_allowed: int = 0
    streak_type: str = ''
    streak_count: int = 0

@dataclass
class GameResult:
    """경기 결과 정보"""
    game_date: str
    home_team_abbr: str
    away_team_abbr: str
    home_score: int
    away_score: int
    game_status: str
    stadium: str = ''
    innings: int = 9

class NPBCrawler:
    """NPB 데이터 크롤러 메인 클래스"""
    
    def __init__(self):
        self.setup_logging()
        self.setup_database()
        self.setup_session()
        
        # NPB 팀 매핑 (약어 -> 정보)
        self.team_mapping = {
            # Central League
            'G': {'abbr': 'YOG', 'name_jp': '読売ジャイアンツ', 'league': 'central'},
            'T': {'abbr': 'HAN', 'name_jp': '阪神タイガース', 'league': 'central'},
            'DB': {'abbr': 'YDB', 'name_jp': '横浜DeNAベイスターズ', 'league': 'central'},
            'C': {'abbr': 'HIR', 'name_jp': '広島東洋カープ', 'league': 'central'},
            'D': {'abbr': 'CHU', 'name_jp': '中日ドラゴンズ', 'league': 'central'},
            'S': {'abbr': 'YAK', 'name_jp': '東京ヤクルトスワローズ', 'league': 'central'},
            
            # Pacific League
            'H': {'abbr': 'SOF', 'name_jp': '福岡ソフトバンクホークス', 'league': 'pacific'},
            'M': {'abbr': 'LOT', 'name_jp': '千葉ロッテマリーンズ', 'league': 'pacific'},
            'E': {'abbr': 'RAK', 'name_jp': '東北楽天ゴールデンイーグルス', 'league': 'pacific'},
            'B': {'abbr': 'ORI', 'name_jp': 'オリックス・バファローズ', 'league': 'pacific'},
            'L': {'abbr': 'SEI', 'name_jp': '埼玉西武ライオンズ', 'league': 'pacific'},
            'F': {'abbr': 'NIP', 'name_jp': '北海道日本ハムファイターズ', 'league': 'pacific'}
        }
        
        # 데이터 소스 URLs
        self.urls = {
            'npb_standings': 'https://npb.jp/standings/',
            'yahoo_games': 'https://baseball.yahoo.co.jp/npb/schedule/',
            'npb_games': 'https://npb.jp/games/'
        }

    def setup_logging(self):
        """로깅 설정"""
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        
        # 기본 로거 제거
        logger.remove()
        
        # 콘솔 로거 추가
        logger.add(
            sys.stdout,
            level=log_level,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
        )
        
        # 파일 로거 추가
        log_file = os.path.join('logs', 'crawler.log')
        os.makedirs('logs', exist_ok=True)
        
        logger.add(
            log_file,
            level=log_level,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="10 MB",
            retention="30 days"
        )
        
        logger.info("NPB Crawler initialized")

    def setup_database(self):
        """데이터베이스 연결 설정"""
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'npb_dashboard_dev'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
        # 연결 테스트
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute('SELECT version();')
                    version = cur.fetchone()[0]
                    logger.info(f"Database connected: {version.split()[0]}")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise

    def setup_session(self):
        """HTTP 세션 설정"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': os.getenv('CRAWLER_USER_AGENT', 'NPB-Dashboard-Bot/1.0'),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # 타임아웃 설정
        self.timeout = int(os.getenv('CRAWLER_TIMEOUT', '30'))
        
        logger.info("HTTP session configured")

    def get_db_connection(self):
        """데이터베이스 연결 반환"""
        return psycopg2.connect(**self.db_config)

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
        except Exception as e:
            logger.error(f"Failed to get team_id for {team_abbr}: {e}")
            return None

    def fetch_page(self, url: str, timeout: Optional[int] = None) -> Optional[BeautifulSoup]:
        """웹 페이지 가져오기"""
        try:
            timeout = timeout or self.timeout
            logger.debug(f"Fetching: {url}")
            
            response = self.session.get(url, timeout=timeout)
            response.raise_for_status()
            
            # 인코딩 처리 (일본어 사이트)
            response.encoding = response.apparent_encoding or 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            logger.debug(f"Successfully fetched {len(response.text)} characters")
            
            return soup
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching {url}: {e}")
            return None

    def parse_npb_standings(self) -> List[TeamStanding]:
        """NPB 공식 사이트에서 순위표 파싱"""
        logger.info("Fetching NPB standings...")
        
        soup = self.fetch_page(self.urls['npb_standings'])
        if not soup:
            logger.error("Failed to fetch NPB standings page")
            return []

        standings = []
        
        try:
            # NPB 사이트 구조에 맞는 파싱 로직
            # (실제 NPB 사이트 구조에 맞게 수정 필요)
            tables = soup.find_all('table', class_='standings-table')
            
            for table in tables:
                league = 'central' if 'セントラル' in str(table) else 'pacific'
                rows = table.find_all('tr')[1:]  # 헤더 제외
                
                for i, row in enumerate(rows, 1):
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 8:
                        continue
                    
                    try:
                        # 팀명에서 약어 추출 (실제 구조에 맞게 수정 필요)
                        team_cell = cells[0]
                        team_name = team_cell.get_text(strip=True)
                        
                        # 팀 매핑 찾기
                        team_abbr = None
                        for key, value in self.team_mapping.items():
                            if value['name_jp'] in team_name:
                                team_abbr = value['abbr']
                                break
                        
                        if not team_abbr:
                            logger.warning(f"Unknown team: {team_name}")
                            continue
                        
                        # 수치 데이터 파싱
                        games = int(cells[1].get_text(strip=True))
                        wins = int(cells[2].get_text(strip=True))
                        losses = int(cells[3].get_text(strip=True))
                        draws = int(cells[4].get_text(strip=True))
                        win_pct = float(cells[5].get_text(strip=True))
                        games_behind = float(cells[6].get_text(strip=True)) if cells[6].get_text(strip=True) != '-' else 0.0
                        
                        standing = TeamStanding(
                            team_abbreviation=team_abbr,
                            team_name_jp=team_name,
                            league=league,
                            rank=i,
                            games_played=games,
                            wins=wins,
                            losses=losses,
                            draws=draws,
                            win_percentage=win_pct,
                            games_behind=games_behind
                        )
                        
                        standings.append(standing)
                        
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Failed to parse row {i} in {league} league: {e}")
                        continue
            
            logger.info(f"Parsed {len(standings)} team standings")
            return standings
            
        except Exception as e:
            logger.error(f"Error parsing NPB standings: {e}")
            logger.error(traceback.format_exc())
            return []

    def parse_recent_games(self, days_back: int = 7) -> List[GameResult]:
        """최근 경기 결과 파싱"""
        logger.info(f"Fetching recent games (last {days_back} days)...")
        
        games = []
        jst = pytz.timezone('Asia/Tokyo')
        
        for i in range(days_back):
            date = datetime.now(jst) - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            
            # Yahoo Sports Japan 경기 결과 페이지
            url = f"{self.urls['yahoo_games']}{date_str}/"
            soup = self.fetch_page(url)
            
            if not soup:
                continue
                
            try:
                # Yahoo Sports 구조에 맞는 파싱 (실제 구조에 맞게 수정 필요)
                game_divs = soup.find_all('div', class_='game-score')
                
                for game_div in game_divs:
                    try:
                        # 팀 정보 추출
                        teams = game_div.find_all('span', class_='team-name')
                        scores = game_div.find_all('span', class_='score')
                        
                        if len(teams) >= 2 and len(scores) >= 2:
                            away_team = teams[0].get_text(strip=True)
                            home_team = teams[1].get_text(strip=True)
                            away_score = int(scores[0].get_text(strip=True))
                            home_score = int(scores[1].get_text(strip=True))
                            
                            # 팀 약어 변환
                            away_abbr = self.convert_team_name_to_abbr(away_team)
                            home_abbr = self.convert_team_name_to_abbr(home_team)
                            
                            if away_abbr and home_abbr:
                                game = GameResult(
                                    game_date=date_str,
                                    home_team_abbr=home_abbr,
                                    away_team_abbr=away_abbr,
                                    home_score=home_score,
                                    away_score=away_score,
                                    game_status='completed'
                                )
                                games.append(game)
                                
                    except (ValueError, IndexError, AttributeError) as e:
                        logger.warning(f"Failed to parse game on {date_str}: {e}")
                        continue
                        
            except Exception as e:
                logger.warning(f"Error parsing games for {date_str}: {e}")
                continue
                
            # 요청 간격 준수
            time.sleep(1)
        
        logger.info(f"Parsed {len(games)} recent games")
        return games

    def convert_team_name_to_abbr(self, team_name: str) -> Optional[str]:
        """팀명을 약어로 변환"""
        for key, value in self.team_mapping.items():
            if value['name_jp'] in team_name or team_name in value['name_jp']:
                return value['abbr']
        
        # 부분 매칭 시도
        team_keywords = {
            '巨人': 'YOG', 'ジャイアンツ': 'YOG',
            '阪神': 'HAN', 'タイガース': 'HAN',
            'DeNA': 'YDB', 'ベイスターズ': 'YDB',
            '広島': 'HIR', 'カープ': 'HIR',
            '中日': 'CHU', 'ドラゴンズ': 'CHU',
            'ヤクルト': 'YAK', 'スワローズ': 'YAK',
            'ソフトバンク': 'SOF', 'ホークス': 'SOF',
            'ロッテ': 'LOT', 'マリーンズ': 'LOT',
            '楽天': 'RAK', 'イーグルス': 'RAK',
            'オリックス': 'ORI', 'バファローズ': 'ORI',
            '西武': 'SEI', 'ライオンズ': 'SEI',
            '日本ハム': 'NIP', 'ファイターズ': 'NIP'
        }
        
        for keyword, abbr in team_keywords.items():
            if keyword in team_name:
                return abbr
                
        logger.warning(f"Unknown team name: {team_name}")
        return None

    def update_standings(self, standings: List[TeamStanding]) -> bool:
        """순위표 데이터 업데이트"""
        if not standings:
            logger.warning("No standings data to update")
            return False
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    current_year = datetime.now().year
                    
                    # 현재 시즌 기존 데이터 삭제
                    cur.execute(
                        "DELETE FROM standings WHERE season = %s",
                        (current_year,)
                    )
                    
                    # 새 데이터 삽입
                    for standing in standings:
                        team_id = self.get_team_id(standing.team_abbreviation)
                        if not team_id:
                            logger.warning(f"Team ID not found: {standing.team_abbreviation}")
                            continue
                            
                        cur.execute("""
                            INSERT INTO standings (
                                team_id, season, league, rank, games_played,
                                wins, losses, draws, win_percentage, games_behind,
                                runs_scored, runs_allowed, streak_type, streak_count,
                                last_updated
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                        """, (
                            team_id, current_year, standing.league, standing.rank,
                            standing.games_played, standing.wins, standing.losses, standing.draws,
                            standing.win_percentage, standing.games_behind,
                            standing.runs_scored, standing.runs_allowed,
                            standing.streak_type, standing.streak_count
                        ))
                    
                    conn.commit()
                    logger.info(f"Updated standings for {len(standings)} teams")
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to update standings: {e}")
            logger.error(traceback.format_exc())
            return False

    def update_games(self, games: List[GameResult]) -> bool:
        """경기 결과 업데이트"""
        if not games:
            logger.warning("No games data to update")
            return False
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    updated = 0
                    
                    for game in games:
                        home_team_id = self.get_team_id(game.home_team_abbr)
                        away_team_id = self.get_team_id(game.away_team_abbr)
                        
                        if not home_team_id or not away_team_id:
                            logger.warning(f"Team IDs not found: {game.home_team_abbr}, {game.away_team_abbr}")
                            continue
                        
                        # 기존 경기 확인
                        cur.execute("""
                            SELECT game_id FROM games 
                            WHERE home_team_id = %s AND away_team_id = %s AND game_date = %s
                        """, (home_team_id, away_team_id, game.game_date))
                        
                        existing = cur.fetchone()
                        
                        if existing:
                            # 기존 경기 업데이트
                            cur.execute("""
                                UPDATE games SET 
                                    home_score = %s, away_score = %s, game_status = %s,
                                    stadium = %s, innings = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE game_id = %s
                            """, (
                                game.home_score, game.away_score, game.game_status,
                                game.stadium, game.innings, existing[0]
                            ))
                        else:
                            # 새 경기 삽입
                            cur.execute("""
                                INSERT INTO games (
                                    home_team_id, away_team_id, game_date,
                                    home_score, away_score, game_status, stadium, innings
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                home_team_id, away_team_id, game.game_date,
                                game.home_score, game.away_score, game.game_status,
                                game.stadium, game.innings
                            ))
                        
                        updated += 1
                    
                    conn.commit()
                    logger.info(f"Updated {updated} games")
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to update games: {e}")
            logger.error(traceback.format_exc())
            return False

    def log_crawl_status(self, status: str, message: str, data_count: int = 0):
        """크롤링 상태 로그"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO crawl_logs (
                            source_name, crawl_status, records_processed, 
                            error_message, crawl_timestamp
                        ) VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                    """, ('NPB_CRAWLER', status, data_count, message))
                    conn.commit()
        except Exception as e:
            logger.error(f"Failed to log crawl status: {e}")

    def run_full_crawl(self) -> bool:
        """전체 크롤링 실행"""
        logger.info("Starting full NPB data crawl...")
        start_time = datetime.now()
        
        try:
            # 1. 순위표 수집 및 업데이트
            standings = self.parse_npb_standings()
            if standings:
                self.update_standings(standings)
                self.log_crawl_status('success', f'Updated standings for {len(standings)} teams', len(standings))
            else:
                self.log_crawl_status('warning', 'No standings data collected', 0)
            
            # 2. 최근 경기 결과 수집 및 업데이트  
            games = self.parse_recent_games()
            if games:
                self.update_games(games)
                self.log_crawl_status('success', f'Updated {len(games)} recent games', len(games))
            else:
                self.log_crawl_status('warning', 'No games data collected', 0)
            
            # 3. 크롤링 완료 로그
            duration = datetime.now() - start_time
            logger.info(f"Full crawl completed in {duration.total_seconds():.1f} seconds")
            
            self.log_crawl_status('completed', f'Full crawl completed in {duration.total_seconds():.1f}s', 
                                len(standings) + len(games))
            
            return True
            
        except Exception as e:
            error_msg = f"Full crawl failed: {e}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            self.log_crawl_status('error', error_msg, 0)
            return False

def main():
    """메인 실행 함수"""
    try:
        crawler = NPBCrawler()
        
        # 명령행 인자 처리
        if len(sys.argv) > 1:
            if sys.argv[1] == '--test':
                logger.info("Running test crawl...")
                crawler.run_full_crawl()
            elif sys.argv[1] == '--standings':
                standings = crawler.parse_npb_standings()
                if standings:
                    crawler.update_standings(standings)
                    logger.info(f"Updated standings for {len(standings)} teams")
            elif sys.argv[1] == '--games':
                games = crawler.parse_recent_games()
                if games:
                    crawler.update_games(games)
                    logger.info(f"Updated {len(games)} games")
        else:
            # 기본 전체 크롤링
            crawler.run_full_crawl()
            
    except KeyboardInterrupt:
        logger.info("Crawl interrupted by user")
    except Exception as e:
        logger.error(f"Crawler failed: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()