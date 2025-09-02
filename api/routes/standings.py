"""
Standings API Routes
순위표 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.database import db
from ..models.schemas import Standing, MagicNumberResponse
from ..utils.magic_number import calculate_magic_numbers, calculate_clinch_scenarios

router = APIRouter(prefix="/standings", tags=["standings"])

@router.get("/")
async def get_standings(
    league: Optional[str] = Query(None, description="Central 또는 Pacific"),
    season: int = Query(2025, description="시즌 연도")
):
    """전체 순위표 조회"""
    try:
        query = """
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
                s.home_wins,
                s.home_losses,
                s.away_wins,
                s.away_losses,
                s.last_10_wins,
                s.last_10_losses,
                s.streak,
                s.updated_at
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season_year = %s
        """
        params = [season]
        
        if league:
            query += " AND s.league = %s"
            params.append(league)
        
        query += " ORDER BY s.league, s.position_rank"
        
        standings_data = db.execute_query(query, tuple(params))
        
        # 매직넘버 계산 추가
        standings_with_magic = calculate_magic_numbers(standings_data)
        
        return {
            "standings": standings_with_magic,
            "season_year": season,
            "league_filter": league,
            "last_updated": standings_with_magic[0]['updated_at'] if standings_with_magic else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/magic-numbers")
async def get_magic_numbers(season: int = Query(2025, description="시즌 연도")):
    """매직넘버 전용 조회"""
    try:
        standings_data = db.execute_query("""
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
                s.updated_at
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season_year = %s
            ORDER BY s.league, s.position_rank
        """, (season,))
        
        # 매직넘버 계산
        standings_with_magic = calculate_magic_numbers(standings_data)
        
        # 우승/탈락 시나리오 계산
        scenarios = calculate_clinch_scenarios(standings_with_magic)
        
        return {
            "season_year": season,
            "central_league": {
                "standings": [s for s in standings_with_magic if s['league'] == 'Central'],
                "scenarios": scenarios['central_league']
            },
            "pacific_league": {
                "standings": [s for s in standings_with_magic if s['league'] == 'Pacific'], 
                "scenarios": scenarios['pacific_league']
            },
            "last_updated": standings_with_magic[0]['updated_at'] if standings_with_magic else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/trends/{team_id}")
async def get_team_trends(team_id: int, days: int = Query(30, description="조회할 일수")):
    """팀 순위 추이"""
    try:
        # 일별 순위 변화 (실제로는 standings 테이블에 일별 기록이 필요)
        # 현재는 최근 경기 결과로 트렌드 계산
        trends = db.execute_query("""
            WITH game_results AS (
                SELECT 
                    g.game_date,
                    CASE WHEN g.home_team_id = %s THEN
                        CASE WHEN g.home_score > g.away_score THEN 'W'
                             WHEN g.home_score < g.away_score THEN 'L'
                             ELSE 'D' END
                    ELSE
                        CASE WHEN g.away_score > g.home_score THEN 'W'
                             WHEN g.away_score < g.home_score THEN 'L'
                             ELSE 'D' END
                    END as result,
                    CASE WHEN g.home_team_id = %s THEN g.home_score ELSE g.away_score END as runs_scored,
                    CASE WHEN g.home_team_id = %s THEN g.away_score ELSE g.home_score END as runs_allowed
                FROM games g
                WHERE (g.home_team_id = %s OR g.away_team_id = %s)
                  AND g.game_date >= CURRENT_DATE - INTERVAL '%s days'
                  AND g.game_status = 'completed'
                ORDER BY g.game_date DESC
            )
            SELECT 
                game_date,
                result,
                runs_scored,
                runs_allowed,
                COUNT(*) OVER (ORDER BY game_date DESC) as game_number
            FROM game_results
            ORDER BY game_date DESC
            LIMIT 10
        """, (team_id, team_id, team_id, team_id, team_id, days))
        
        # 최근 10경기 승패
        recent_form = [game['result'] for game in trends]
        
        return {
            "team_id": team_id,
            "recent_games": trends,
            "recent_form": recent_form,
            "wins": recent_form.count('W'),
            "losses": recent_form.count('L'),
            "draws": recent_form.count('D'),
            "win_percentage": recent_form.count('W') / len(recent_form) if recent_form else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/comparison")
async def get_league_comparison(season: int = Query(2025, description="시즌 연도")):
    """리그간 비교 통계"""
    try:
        league_comparison = db.execute_query("""
            SELECT 
                s.league,
                AVG(s.win_percentage) as avg_win_pct,
                AVG(s.runs_scored::float / s.games_played) as avg_runs_per_game,
                AVG(s.runs_allowed::float / s.games_played) as avg_runs_allowed_per_game,
                SUM(s.games_played) as total_games,
                COUNT(*) as num_teams
            FROM standings s
            WHERE s.season_year = %s
            GROUP BY s.league
        """, (season,))
        
        return {
            "season_year": season,
            "league_stats": {
                stats['league']: {
                    'avg_win_percentage': float(stats['avg_win_pct']),
                    'avg_runs_per_game': float(stats['avg_runs_per_game']),
                    'avg_runs_allowed_per_game': float(stats['avg_runs_allowed_per_game']),
                    'total_games': stats['total_games'],
                    'num_teams': stats['num_teams']
                }
                for stats in league_comparison
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")