"""
Dashboard API Routes
메인 대시보드용 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict
from datetime import datetime, date
from ..models.database import db
from ..models.schemas import GameResult

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/")
async def get_dashboard_data():
    """메인 대시보드 데이터 - 오늘 경기 + 간략한 순위표"""
    try:
        # 오늘 경기 결과
        today_games = db.execute_query("""
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
            ORDER BY g.game_start_time, g.game_id
        """)
        
        # 간략한 순위표 (상위 3팀씩)
        standings_summary = db.execute_query("""
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
        
        # 최근 업데이트 시간
        last_update = db.execute_single("""
            SELECT MAX(updated_at) as last_update
            FROM standings
            WHERE season_year = 2025
        """)
        
        return {
            "today_games": today_games,
            "standings_summary": {
                "central": [s for s in standings_summary if s['league'] == 'Central'],
                "pacific": [s for s in standings_summary if s['league'] == 'Pacific']
            },
            "last_updated": last_update['last_update'] if last_update else None,
            "total_today_games": len(today_games)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/recent-games")
async def get_recent_games(days: int = 7):
    """최근 경기 결과"""
    try:
        recent_games = db.execute_query("""
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                at.team_abbreviation as away_team,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.is_draw
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date >= CURRENT_DATE - INTERVAL '%s days'
            ORDER BY g.game_date DESC, g.game_id
        """, (days,))
        
        return {
            "games": recent_games,
            "period_days": days,
            "total_games": len(recent_games)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/stats-summary")
async def get_stats_summary():
    """통계 요약 - 대시보드용"""
    try:
        # 총 경기수, 최근 업데이트 등
        summary = db.execute_single("""
            SELECT 
                COUNT(*) as total_games,
                COUNT(*) FILTER (WHERE game_date >= CURRENT_DATE - INTERVAL '7 days') as recent_games,
                COUNT(*) FILTER (WHERE is_extra_innings = true) as extra_innings_games,
                COUNT(*) FILTER (WHERE is_draw = true) as draw_games,
                MAX(game_date) as latest_game_date
            FROM games
            WHERE EXTRACT(YEAR FROM game_date) = 2025
        """)
        
        # 리그별 평균 득점
        league_stats = db.execute_query("""
            SELECT 
                t.league,
                AVG(CASE WHEN g.home_team_id = t.team_id THEN g.home_score 
                         ELSE g.away_score END) as avg_runs_scored,
                AVG(CASE WHEN g.home_team_id = t.team_id THEN g.away_score 
                         ELSE g.home_score END) as avg_runs_allowed
            FROM teams t
            JOIN games g ON (g.home_team_id = t.team_id OR g.away_team_id = t.team_id)
            WHERE g.game_status = 'completed'
            GROUP BY t.league
        """)
        
        return {
            "season_summary": summary,
            "league_stats": {
                stats['league']: {
                    'avg_runs_scored': float(stats['avg_runs_scored']) if stats['avg_runs_scored'] else 0,
                    'avg_runs_allowed': float(stats['avg_runs_allowed']) if stats['avg_runs_allowed'] else 0
                }
                for stats in league_stats
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")