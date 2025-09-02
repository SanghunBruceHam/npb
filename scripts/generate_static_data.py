#!/usr/bin/env python3
"""
Generate static JSON data for GitHub Pages
정적 JSON 데이터 생성 스크립트
"""

import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
from dotenv import load_dotenv
import sys

load_dotenv()

class StaticDataGenerator:
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'npb_dashboard'),
            'user': os.getenv('DB_USER', 'sanghunbruceham'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        self.output_dir = 'docs/data'
        os.makedirs(self.output_dir, exist_ok=True)

    def get_db_connection(self):
        return psycopg2.connect(**self.db_config)

    def execute_query(self, query, params=None):
        with self.get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(row) for row in cur.fetchall()]

    def generate_dashboard_data(self):
        """대시보드 데이터 생성"""
        print("📊 Generating dashboard data...")
        
        # 오늘 경기
        today_games = self.execute_query("""
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                at.team_abbreviation as away_team,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.total_innings,
                g.is_draw,
                g.stadium
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date = CURRENT_DATE
            ORDER BY g.game_id
        """)

        # 순위표 요약
        standings_summary = self.execute_query("""
            SELECT 
                s.team_id,
                t.team_abbreviation,
                t.team_name,
                s.league,
                s.position_rank,
                s.wins,
                s.losses,
                s.draws,
                s.win_percentage,
                s.games_behind
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season_year = 2025 AND s.position_rank <= 3
            ORDER BY s.league, s.position_rank
        """)

        # 마지막 업데이트
        last_update = self.execute_query("""
            SELECT MAX(updated_at) as last_update
            FROM standings
            WHERE season_year = 2025
        """)

        dashboard_data = {
            "today_games": today_games,
            "standings_summary": {
                "central": [s for s in standings_summary if s['league'] == 'Central'],
                "pacific": [s for s in standings_summary if s['league'] == 'Pacific']
            },
            "last_updated": last_update[0]['last_update'].isoformat() if last_update[0]['last_update'] else None,
            "total_today_games": len(today_games),
            "generated_at": datetime.now().isoformat()
        }

        with open(f'{self.output_dir}/dashboard.json', 'w', encoding='utf-8') as f:
            json.dump(dashboard_data, f, ensure_ascii=False, indent=2, default=str)

    def generate_standings_data(self):
        """순위표 및 매직넘버 데이터 생성"""
        print("🏆 Generating standings data...")

        # 전체 순위표
        standings = self.execute_query("""
            SELECT 
                s.team_id,
                t.team_name,
                t.team_abbreviation,
                s.league,
                s.position_rank,
                s.games_played,
                s.wins,
                s.losses,
                s.draws,
                s.win_percentage,
                s.games_behind,
                s.runs_scored,
                s.runs_allowed,
                s.run_differential,
                s.updated_at
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season_year = 2025
            ORDER BY s.league, s.position_rank
        """)

        # 매직넘버 계산 (간단 버전)
        def calculate_simple_magic_number(teams):
            for team in teams:
                if team['position_rank'] == 1:
                    # 간단한 매직넘버: 남은 경기 + 1
                    remaining_games = 143 - team['games_played']
                    team['magic_number'] = remaining_games + 1 if remaining_games > 0 else None
                    team['clinch_status'] = 'leader'
                else:
                    team['magic_number'] = None
                    team['clinch_status'] = None
            return teams

        central_teams = [s for s in standings if s['league'] == 'Central']
        pacific_teams = [s for s in standings if s['league'] == 'Pacific']

        standings_data = {
            "season_year": 2025,
            "central_league": {
                "standings": calculate_simple_magic_number(central_teams)
            },
            "pacific_league": {
                "standings": calculate_simple_magic_number(pacific_teams)
            },
            "last_updated": standings[0]['updated_at'].isoformat() if standings else None,
            "generated_at": datetime.now().isoformat()
        }

        with open(f'{self.output_dir}/standings.json', 'w', encoding='utf-8') as f:
            json.dump(standings_data, f, ensure_ascii=False, indent=2, default=str)

    def generate_teams_data(self):
        """팀 데이터 생성"""
        print("👥 Generating teams data...")

        teams = self.execute_query("""
            SELECT 
                t.team_id,
                t.team_name,
                t.team_abbreviation,
                t.league,
                t.team_color,
                t.stadium_name,
                t.founded_year,
                s.position_rank,
                s.games_played,
                s.wins,
                s.losses,
                s.draws,
                s.win_percentage,
                s.games_behind,
                s.runs_scored,
                s.runs_allowed,
                s.run_differential,
                s.home_wins,
                s.home_losses,
                s.away_wins,
                s.away_losses
            FROM teams t
            LEFT JOIN standings s ON t.team_id = s.team_id AND s.season_year = 2025
            ORDER BY t.league, t.team_name
        """)

        teams_data = {
            "teams": teams,
            "central_league": [t for t in teams if t['league'] == 'Central'],
            "pacific_league": [t for t in teams if t['league'] == 'Pacific'],
            "total_teams": len(teams),
            "generated_at": datetime.now().isoformat()
        }

        with open(f'{self.output_dir}/teams.json', 'w', encoding='utf-8') as f:
            json.dump(teams_data, f, ensure_ascii=False, indent=2, default=str)

    def generate_games_data(self):
        """최근 경기 데이터 생성"""
        print("⚾ Generating recent games data...")

        # 최근 7일 경기
        recent_games = self.execute_query("""
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                at.team_abbreviation as away_team,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.total_innings,
                g.is_draw,
                g.stadium,
                g.home_inning_scores,
                g.away_inning_scores
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY g.game_date DESC, g.game_id DESC
            LIMIT 50
        """)

        games_data = {
            "games": recent_games,
            "total_games": len(recent_games),
            "period_days": 7,
            "generated_at": datetime.now().isoformat()
        }

        with open(f'{self.output_dir}/games.json', 'w', encoding='utf-8') as f:
            json.dump(games_data, f, ensure_ascii=False, indent=2, default=str)

    def generate_all(self):
        """모든 데이터 생성"""
        print("🚀 Starting static data generation...")
        
        try:
            self.generate_dashboard_data()
            self.generate_standings_data()
            self.generate_teams_data()
            self.generate_games_data()
            
            print("✅ All static data generated successfully!")
            print(f"📁 Files saved in: {self.output_dir}/")
            
        except Exception as e:
            print(f"❌ Error generating static data: {e}")
            sys.exit(1)

def main():
    generator = StaticDataGenerator()
    generator.generate_all()

if __name__ == "__main__":
    main()