"""
Games API Routes
경기 결과 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, date
from ..models.database import db
from ..models.schemas import GameResult

router = APIRouter(prefix="/games", tags=["games"])

@router.get("/")
async def get_games(
    date_from: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    team: Optional[str] = Query(None, description="팀 약어"),
    status: Optional[str] = Query(None, description="경기 상태"),
    limit: int = Query(50, description="조회할 경기 수")
):
    """경기 결과 조회"""
    try:
        query = """
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                ht.team_name as home_team_full,
                at.team_abbreviation as away_team,
                at.team_name as away_team_full,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.total_innings,
                g.is_draw,
                g.is_cancelled,
                g.stadium,
                g.game_start_time,
                g.home_inning_scores,
                g.away_inning_scores
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE 1=1
        """
        params = []
        
        # 날짜 필터
        if date_from:
            query += " AND g.game_date >= %s"
            params.append(date_from)
        if date_to:
            query += " AND g.game_date <= %s"
            params.append(date_to)
        
        # 팀 필터
        if team:
            query += " AND (ht.team_abbreviation = %s OR at.team_abbreviation = %s)"
            params.extend([team, team])
        
        # 상태 필터
        if status:
            query += " AND g.game_status = %s"
            params.append(status)
        
        query += " ORDER BY g.game_date DESC, g.game_id DESC LIMIT %s"
        params.append(limit)
        
        games = db.execute_query(query, tuple(params))
        
        return {
            "games": games,
            "total_games": len(games),
            "filters": {
                "date_from": date_from,
                "date_to": date_to,
                "team": team,
                "status": status
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{game_id}")
async def get_game_detail(game_id: int):
    """특정 경기 상세 조회"""
    try:
        game = db.execute_single("""
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                ht.team_name as home_team_full,
                ht.team_color as home_team_color,
                at.team_abbreviation as away_team,
                at.team_name as away_team_full,
                at.team_color as away_team_color,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.total_innings,
                g.is_draw,
                g.is_cancelled,
                g.stadium,
                g.game_start_time,
                g.home_inning_scores,
                g.away_inning_scores,
                g.created_at,
                g.updated_at
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_id = %s
        """, (game_id,))
        
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        return game
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/by-date/{game_date}")
async def get_games_by_date(game_date: str):
    """특정 날짜의 모든 경기"""
    try:
        games = db.execute_query("""
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
                g.game_start_time
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date = %s
            ORDER BY g.game_start_time, g.game_id
        """, (game_date,))
        
        return {
            "date": game_date,
            "games": games,
            "total_games": len(games)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/schedule/upcoming")
async def get_upcoming_games(days: int = Query(7, description="앞으로 조회할 일수")):
    """향후 경기 일정 (실제로는 과거 데이터만 있을 것)"""
    try:
        # 실제로는 일정 데이터가 별도 테이블에 있어야 함
        # 현재는 최근 경기 패턴을 보여주는 용도
        recent_pattern = db.execute_query("""
            SELECT DISTINCT
                g.game_date,
                COUNT(*) as games_count,
                string_agg(DISTINCT 
                    ht.team_abbreviation || ' vs ' || at.team_abbreviation, 
                    ', ' ORDER BY ht.team_abbreviation || ' vs ' || at.team_abbreviation
                ) as matchups
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY g.game_date
            ORDER BY g.game_date DESC
        """)
        
        return {
            "upcoming_pattern": recent_pattern,
            "note": "실제 일정 데이터는 별도 구현 필요"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/stats/summary")
async def get_games_stats():
    """경기 통계 요약"""
    try:
        stats = db.execute_single("""
            SELECT 
                COUNT(*) as total_games,
                COUNT(*) FILTER (WHERE game_status = 'completed') as completed_games,
                COUNT(*) FILTER (WHERE is_extra_innings = true) as extra_innings,
                COUNT(*) FILTER (WHERE is_draw = true) as draws,
                COUNT(*) FILTER (WHERE is_cancelled = true) as cancelled,
                AVG(home_score + away_score) as avg_total_runs,
                MAX(home_score + away_score) as highest_scoring_game,
                MIN(home_score + away_score) FILTER (WHERE game_status = 'completed') as lowest_scoring_game
            FROM games
            WHERE EXTRACT(YEAR FROM game_date) = 2025
        """)
        
        # 월별 경기 수
        monthly_games = db.execute_query("""
            SELECT 
                EXTRACT(MONTH FROM game_date) as month,
                COUNT(*) as games_count,
                AVG(home_score + away_score) as avg_runs
            FROM games
            WHERE EXTRACT(YEAR FROM game_date) = 2025 
              AND game_status = 'completed'
            GROUP BY EXTRACT(MONTH FROM game_date)
            ORDER BY month
        """)
        
        return {
            "season_stats": stats,
            "monthly_breakdown": monthly_games
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/inning-scores/{game_id}")
async def get_inning_scores(game_id: int):
    """경기의 이닝별 득점 상세"""
    try:
        game = db.execute_single("""
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                at.team_abbreviation as away_team,
                g.home_inning_scores,
                g.away_inning_scores,
                g.total_innings,
                g.is_extra_innings
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_id = %s
        """, (game_id,))
        
        if not game:
            raise HTTPException(status_code=404, detail="Game not found")
        
        # 이닝별 스코어보드 생성
        home_scores = game['home_inning_scores'] or []
        away_scores = game['away_inning_scores'] or []
        max_innings = max(len(home_scores), len(away_scores), 9)
        
        scoreboard = {
            "innings": [],
            "home_total": sum(home_scores),
            "away_total": sum(away_scores)
        }
        
        for i in range(max_innings):
            inning = {
                "inning_number": i + 1,
                "home_score": home_scores[i] if i < len(home_scores) else 0,
                "away_score": away_scores[i] if i < len(away_scores) else 0
            }
            scoreboard["innings"].append(inning)
        
        return {
            "game_info": game,
            "scoreboard": scoreboard
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")