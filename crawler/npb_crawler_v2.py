#!/usr/bin/env python3
"""
NPB Game Data Crawler v2
Complete rewrite with proper data collection and TXT storage
"""

import requests
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import RealDictCursor
import time
from datetime import datetime, timedelta
import os
import re
from typing import Dict, List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crawler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NPBCrawler:
    def __init__(self, db_config: Dict[str, str]):
        """Initialize NPB Crawler with database configuration"""
        self.db_config = db_config
        self.base_url = "https://npb.jp"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.team_mapping = {
            # Central League
            'G': 'YOG', 'Giants': 'YOG', '巨人': 'YOG',
            'T': 'HAN', 'Tigers': 'HAN', '阪神': 'HAN',
            'D': 'CHU', 'Dragons': 'CHU', '中日': 'CHU',
            'DB': 'YDB', 'BayStars': 'YDB', 'DeNA': 'YDB', '横浜': 'YDB',
            'C': 'HIR', 'Carp': 'HIR', '広島': 'HIR',
            'S': 'YAK', 'Swallows': 'YAK', 'ヤクルト': 'YAK',
            # Pacific League
            'H': 'SOF', 'Hawks': 'SOF', 'ソフトバンク': 'SOF',
            'M': 'LOT', 'Marines': 'LOT', 'ロッテ': 'LOT',
            'L': 'SEI', 'Lions': 'SEI', '西武': 'SEI',
            'Bs': 'ORI', 'Buffaloes': 'ORI', 'オリックス': 'ORI',
            'F': 'NIP', 'Fighters': 'NIP', '日本ハム': 'NIP',
            'E': 'RAK', 'Eagles': 'RAK', '楽天': 'RAK'
        }
        
    def connect_db(self):
        """Connect to PostgreSQL database"""
        try:
            return psycopg2.connect(**self.db_config)
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
            
    def clear_existing_data(self):
        """Clear all existing game data from database"""
        conn = self.connect_db()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM game_innings")
                cur.execute("DELETE FROM games")
                conn.commit()
                logger.info("Cleared existing game data from database")
        finally:
            conn.close()
            
    def get_team_id(self, team_abbr: str, cursor) -> Optional[int]:
        """Get team ID from abbreviation"""
        cursor.execute("SELECT team_id FROM teams WHERE team_abbr = %s", (team_abbr,))
        result = cursor.fetchone()
        return result[0] if result else None
        
    def parse_game_score(self, url: str) -> Optional[Dict]:
        """Parse individual game details from NPB website"""
        try:
            response = self.session.get(url)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            game_data = {}
            
            # Extract score table
            score_table = soup.find('table', {'class': 'score'})
            if not score_table:
                return None
                
            rows = score_table.find_all('tr')
            if len(rows) < 3:
                return None
                
            # Parse team names and scores
            away_row = rows[1]
            home_row = rows[2]
            
            away_cells = away_row.find_all('td')
            home_cells = home_row.find_all('td')
            
            if len(away_cells) < 12 or len(home_cells) < 12:
                return None
                
            # Get team names
            away_team = away_cells[0].text.strip()
            home_team = home_cells[0].text.strip()
            
            # Map to team abbreviations
            game_data['away_team'] = self.team_mapping.get(away_team, away_team)
            game_data['home_team'] = self.team_mapping.get(home_team, home_team)
            
            # Get inning scores (cells 1-9 or more for extra innings)
            game_data['away_innings'] = []
            game_data['home_innings'] = []
            
            for i in range(1, len(away_cells) - 3):  # Exclude team name, R, H, E
                try:
                    away_score = int(away_cells[i].text.strip()) if away_cells[i].text.strip() != '-' else 0
                    home_score = int(home_cells[i].text.strip()) if home_cells[i].text.strip() != '-' else 0
                    game_data['away_innings'].append(away_score)
                    game_data['home_innings'].append(home_score)
                except:
                    continue
                    
            # Get final scores
            game_data['away_score'] = int(away_cells[-3].text.strip())
            game_data['home_score'] = int(home_cells[-3].text.strip())
            game_data['away_hits'] = int(away_cells[-2].text.strip())
            game_data['home_hits'] = int(home_cells[-2].text.strip())
            game_data['away_errors'] = int(away_cells[-1].text.strip())
            game_data['home_errors'] = int(home_cells[-1].text.strip())
            
            # Determine game status
            game_data['total_innings'] = len(game_data['away_innings'])
            game_data['is_extra_innings'] = game_data['total_innings'] > 9
            game_data['is_draw'] = game_data['away_score'] == game_data['home_score']
            
            # Get additional game info
            game_info = soup.find('div', {'class': 'game_info'})
            if game_info:
                info_text = game_info.text
                # Extract stadium
                stadium_match = re.search(r'球場[：:]\s*(.+?)[\s\n]', info_text)
                if stadium_match:
                    game_data['stadium'] = stadium_match.group(1).strip()
                    
                # Extract attendance
                attendance_match = re.search(r'観客[：:]\s*([\d,]+)', info_text)
                if attendance_match:
                    game_data['attendance'] = int(attendance_match.group(1).replace(',', ''))
                    
            return game_data
            
        except Exception as e:
            logger.error(f"Error parsing game: {url} - {e}")
            return None
            
    def crawl_games_for_date(self, date: datetime) -> List[Dict]:
        """Crawl all games for a specific date"""
        date_str = date.strftime('%Y%m%d')
        url = f"{self.base_url}/scores/{date.year}/farm/{date_str}.html"
        
        try:
            response = self.session.get(url)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            games = []
            game_links = soup.find_all('a', href=re.compile(r'/scores/\d+/game/\d+'))
            
            for link in game_links:
                game_url = self.base_url + link['href']
                game_data = self.parse_game_score(game_url)
                
                if game_data:
                    game_data['game_date'] = date.strftime('%Y-%m-%d')
                    games.append(game_data)
                    logger.info(f"Parsed game: {game_data['away_team']} @ {game_data['home_team']} on {date_str}")
                    
                time.sleep(1)  # Be respectful to the server
                
            return games
            
        except Exception as e:
            logger.error(f"Error crawling date {date_str}: {e}")
            return []
            
    def save_game_to_db(self, game_data: Dict, conn):
        """Save game data to database"""
        try:
            with conn.cursor() as cur:
                # Get team IDs
                home_team_id = self.get_team_id(game_data['home_team'], cur)
                away_team_id = self.get_team_id(game_data['away_team'], cur)
                
                if not home_team_id or not away_team_id:
                    logger.error(f"Team not found: {game_data['home_team']} or {game_data['away_team']}")
                    return
                    
                # Get season ID
                cur.execute("SELECT season_id FROM seasons WHERE year = 2025")
                season_id = cur.fetchone()[0]
                
                # Insert game
                cur.execute("""
                    INSERT INTO games (
                        season_id, game_date, home_team_id, away_team_id,
                        home_score, away_score, is_completed, is_draw, is_extra_innings,
                        total_innings, stadium, attendance, home_hits, away_hits,
                        home_errors, away_errors
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (game_date, home_team_id, away_team_id, game_number) 
                    DO UPDATE SET
                        home_score = EXCLUDED.home_score,
                        away_score = EXCLUDED.away_score,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING game_id
                """, (
                    season_id, game_data['game_date'], home_team_id, away_team_id,
                    game_data['home_score'], game_data['away_score'], True,
                    game_data['is_draw'], game_data['is_extra_innings'],
                    game_data['total_innings'], game_data.get('stadium'),
                    game_data.get('attendance'), game_data['home_hits'],
                    game_data['away_hits'], game_data['home_errors'],
                    game_data['away_errors']
                ))
                
                game_id = cur.fetchone()[0]
                
                # Insert inning scores
                for i, (home_runs, away_runs) in enumerate(zip(game_data['home_innings'], game_data['away_innings']), 1):
                    cur.execute("""
                        INSERT INTO game_innings (game_id, inning_number, home_runs, away_runs)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (game_id, i, home_runs, away_runs))
                    
                conn.commit()
                logger.info(f"Saved game {game_id} to database")
                
        except Exception as e:
            conn.rollback()
            logger.error(f"Error saving game to database: {e}")
            
    def export_to_txt(self, output_dir: str = 'data/txt'):
        """Export all data to TXT files"""
        os.makedirs(output_dir, exist_ok=True)
        conn = self.connect_db()
        
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Export standings
                cur.execute("""
                    SELECT 
                        t.team_abbr,
                        t.team_name_jp,
                        t.league,
                        COUNT(CASE WHEN g.home_team_id = t.team_id AND g.home_score > g.away_score THEN 1
                                  WHEN g.away_team_id = t.team_id AND g.away_score > g.home_score THEN 1 END) as wins,
                        COUNT(CASE WHEN g.home_team_id = t.team_id AND g.home_score < g.away_score THEN 1
                                  WHEN g.away_team_id = t.team_id AND g.away_score < g.home_score THEN 1 END) as losses,
                        COUNT(CASE WHEN (g.home_team_id = t.team_id OR g.away_team_id = t.team_id) AND g.is_draw THEN 1 END) as draws
                    FROM teams t
                    LEFT JOIN games g ON (g.home_team_id = t.team_id OR g.away_team_id = t.team_id) 
                        AND g.is_completed = true
                    GROUP BY t.team_id, t.team_abbr, t.team_name_jp, t.league
                    ORDER BY t.league, wins DESC
                """)
                
                standings = cur.fetchall()
                
                # Write standings to TXT
                with open(f"{output_dir}/standings_{datetime.now().strftime('%Y%m%d')}.txt", 'w', encoding='utf-8') as f:
                    f.write("NPB STANDINGS - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n")
                    f.write("="*80 + "\n\n")
                    
                    for league in ['Central', 'Pacific']:
                        f.write(f"{league} League\n")
                        f.write("-"*40 + "\n")
                        f.write(f"{'Rank':<5} {'Team':<25} {'W':<5} {'L':<5} {'D':<5} {'PCT':<7}\n")
                        f.write("-"*40 + "\n")
                        
                        league_teams = [s for s in standings if s['league'] == league]
                        for i, team in enumerate(league_teams, 1):
                            wins = team['wins']
                            losses = team['losses']
                            draws = team['draws']
                            pct = wins / (wins + losses) if (wins + losses) > 0 else 0
                            f.write(f"{i:<5} {team['team_name_jp']:<25} {wins:<5} {losses:<5} {draws:<5} {pct:<7.3f}\n")
                        f.write("\n")
                        
                # Export game results
                cur.execute("""
                    SELECT 
                        g.game_date,
                        ht.team_abbr as home_team,
                        at.team_abbr as away_team,
                        g.home_score,
                        g.away_score,
                        g.total_innings,
                        g.stadium
                    FROM games g
                    JOIN teams ht ON g.home_team_id = ht.team_id
                    JOIN teams at ON g.away_team_id = at.team_id
                    WHERE g.is_completed = true
                    ORDER BY g.game_date DESC
                """)
                
                games = cur.fetchall()
                
                # Write games to TXT
                with open(f"{output_dir}/games_{datetime.now().strftime('%Y%m%d')}.txt", 'w', encoding='utf-8') as f:
                    f.write("NPB GAME RESULTS - " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n")
                    f.write("="*80 + "\n\n")
                    
                    current_date = None
                    for game in games:
                        if game['game_date'] != current_date:
                            current_date = game['game_date']
                            f.write(f"\n{current_date.strftime('%Y-%m-%d')}\n")
                            f.write("-"*40 + "\n")
                            
                        result = "DRAW" if game['home_score'] == game['away_score'] else \
                                f"{game['home_team'] if game['home_score'] > game['away_score'] else game['away_team']} WIN"
                        innings = f"({game['total_innings']}回)" if game['total_innings'] != 9 else ""
                        
                        f.write(f"{game['away_team']:>4} {game['away_score']:>2} - {game['home_score']:<2} {game['home_team']:<4} {result:<10} {innings}\n")
                        
                logger.info(f"Data exported to {output_dir}")
                
        finally:
            conn.close()
            
    def run_full_crawl(self, start_date: datetime, end_date: datetime):
        """Run full crawl for date range"""
        logger.info(f"Starting full crawl from {start_date} to {end_date}")
        
        conn = self.connect_db()
        current_date = start_date
        
        while current_date <= end_date:
            logger.info(f"Crawling games for {current_date.strftime('%Y-%m-%d')}")
            games = self.crawl_games_for_date(current_date)
            
            for game in games:
                self.save_game_to_db(game, conn)
                
            current_date += timedelta(days=1)
            time.sleep(2)  # Be respectful between dates
            
        conn.close()
        logger.info("Crawl completed")
        
        # Export to TXT files
        self.export_to_txt()


def main():
    # Database configuration
    db_config = {
        'host': 'localhost',
        'database': 'npb_stats',
        'user': 'npb_user',
        'password': 'npb_password',
        'port': 5432
    }
    
    # Initialize crawler
    crawler = NPBCrawler(db_config)
    
    # Clear existing data
    crawler.clear_existing_data()
    
    # Run full crawl from season start
    start_date = datetime(2025, 3, 28)
    end_date = datetime.now()
    
    crawler.run_full_crawl(start_date, end_date)
    

if __name__ == "__main__":
    main()