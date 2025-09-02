"""
Teams API Routes
팀 관련 API 엔드포인트
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from ..models.database import db

router = APIRouter(prefix="/teams", tags=["teams"])

@router.get("/")
async def get_all_teams():
    """전체 팀 목록"""
    try:
        teams = db.execute_query("""
            SELECT 
                team_id,
                team_name,
                team_abbreviation,
                league,
                team_color,
                stadium_name,
                founded_year,
                created_at
            FROM teams
            ORDER BY league, team_name
        """)
        
        return {
            "teams": teams,
            "central_league": [t for t in teams if t['league'] == 'Central'],
            "pacific_league": [t for t in teams if t['league'] == 'Pacific'],
            "total_teams": len(teams)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{team_id}")
async def get_team_detail(team_id: int):
    """팀 상세 정보"""
    try:
        team = db.execute_single("""
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
            WHERE t.team_id = %s
        """, (team_id,))
        
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        
        return team
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{team_id}/games")
async def get_team_games(
    team_id: int,
    limit: int = Query(20, description="조회할 경기 수"),
    home_only: bool = Query(False, description="홈 경기만"),
    away_only: bool = Query(False, description="원정 경기만")
):
    """팀 경기 일정/결과"""
    try:
        query = """
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                at.team_abbreviation as away_team,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.is_draw,
                g.stadium,
                CASE 
                    WHEN g.home_team_id = %s THEN 'home'
                    ELSE 'away'
                END as venue,
                CASE 
                    WHEN g.game_status = 'completed' THEN
                        CASE 
                            WHEN (g.home_team_id = %s AND g.home_score > g.away_score) OR
                                 (g.away_team_id = %s AND g.away_score > g.home_score) THEN 'W'
                            WHEN g.is_draw THEN 'D'
                            ELSE 'L'
                        END
                    ELSE null
                END as result
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE (g.home_team_id = %s OR g.away_team_id = %s)
        """
        params = [team_id, team_id, team_id, team_id, team_id]
        
        if home_only:
            query += " AND g.home_team_id = %s"
            params.append(team_id)
        elif away_only:
            query += " AND g.away_team_id = %s"
            params.append(team_id)
        
        query += " ORDER BY g.game_date DESC LIMIT %s"
        params.append(limit)
        
        games = db.execute_query(query, tuple(params))
        
        return {
            "team_id": team_id,
            "games": games,
            "total_games": len(games),
            "record": {
                "wins": len([g for g in games if g['result'] == 'W']),
                "losses": len([g for g in games if g['result'] == 'L']),
                "draws": len([g for g in games if g['result'] == 'D'])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{team_id}/vs/{opponent_id}")
async def get_head_to_head(team_id: int, opponent_id: int):
    """팀간 상대전적"""
    try:
        # 상대전적
        h2h_games = db.execute_query("""
            SELECT 
                g.game_id,
                g.game_date,
                ht.team_abbreviation as home_team,
                at.team_abbreviation as away_team,
                g.home_score,
                g.away_score,
                g.game_status,
                g.is_extra_innings,
                g.is_draw,
                CASE 
                    WHEN g.game_status = 'completed' THEN
                        CASE 
                            WHEN (g.home_team_id = %s AND g.home_score > g.away_score) OR
                                 (g.away_team_id = %s AND g.away_score > g.home_score) THEN 'W'
                            WHEN g.is_draw THEN 'D'
                            ELSE 'L'
                        END
                    ELSE null
                END as result_for_team
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE ((g.home_team_id = %s AND g.away_team_id = %s) OR
                   (g.home_team_id = %s AND g.away_team_id = %s))
            ORDER BY g.game_date DESC
        """, (team_id, team_id, team_id, opponent_id, opponent_id, team_id))
        
        # 통계 요약
        wins = len([g for g in h2h_games if g['result_for_team'] == 'W'])
        losses = len([g for g in h2h_games if g['result_for_team'] == 'L'])
        draws = len([g for g in h2h_games if g['result_for_team'] == 'D'])
        
        # 팀 정보
        team_info = db.execute_single("""
            SELECT team_name, team_abbreviation FROM teams WHERE team_id = %s
        """, (team_id,))
        
        opponent_info = db.execute_single("""
            SELECT team_name, team_abbreviation FROM teams WHERE team_id = %s
        """, (opponent_id,))
        
        return {
            "team": team_info,
            "opponent": opponent_info,
            "head_to_head": {
                "wins": wins,
                "losses": losses,
                "draws": draws,
                "total_games": len(h2h_games),
                "win_percentage": wins / len(h2h_games) if h2h_games else 0
            },
            "recent_games": h2h_games[:10]  # 최근 10경기
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{team_id}/stats")
async def get_team_stats(
    team_id: int,
    season: int = Query(2025, description="시즌 연도")
):
    """팀 상세 통계"""
    try:
        # 기본 통계
        basic_stats = db.execute_single("""
            SELECT 
                s.*,
                t.team_name,
                t.team_abbreviation,
                t.league
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.team_id = %s AND s.season_year = %s
        """, (team_id, season))
        
        if not basic_stats:
            raise HTTPException(status_code=404, detail="Team stats not found")
        
        # 월별 성적
        monthly_performance = db.execute_query("""
            SELECT 
                EXTRACT(MONTH FROM g.game_date) as month,
                COUNT(*) as games_played,
                COUNT(*) FILTER (WHERE 
                    (g.home_team_id = %s AND g.home_score > g.away_score) OR
                    (g.away_team_id = %s AND g.away_score > g.home_score)
                ) as wins,
                COUNT(*) FILTER (WHERE 
                    (g.home_team_id = %s AND g.home_score < g.away_score) OR
                    (g.away_team_id = %s AND g.away_score < g.home_score)
                ) as losses,
                COUNT(*) FILTER (WHERE g.is_draw) as draws,
                AVG(CASE WHEN g.home_team_id = %s THEN g.home_score ELSE g.away_score END) as avg_runs_scored,
                AVG(CASE WHEN g.home_team_id = %s THEN g.away_score ELSE g.home_score END) as avg_runs_allowed
            FROM games g
            WHERE (g.home_team_id = %s OR g.away_team_id = %s)
              AND EXTRACT(YEAR FROM g.game_date) = %s
              AND g.game_status = 'completed'
            GROUP BY EXTRACT(MONTH FROM g.game_date)
            ORDER BY month
        """, (team_id, team_id, team_id, team_id, team_id, team_id, team_id, team_id, season))
        
        # 최근 10경기 폼
        recent_form = db.execute_query("""
            SELECT 
                g.game_date,
                CASE 
                    WHEN (g.home_team_id = %s AND g.home_score > g.away_score) OR
                         (g.away_team_id = %s AND g.away_score > g.home_score) THEN 'W'
                    WHEN g.is_draw THEN 'D'
                    ELSE 'L'
                END as result
            FROM games g
            WHERE (g.home_team_id = %s OR g.away_team_id = %s)
              AND g.game_status = 'completed'
            ORDER BY g.game_date DESC
            LIMIT 10
        """, (team_id, team_id, team_id, team_id))
        
        return {
            "team_stats": basic_stats,
            "monthly_performance": monthly_performance,
            "recent_form": [game['result'] for game in recent_form],
            "recent_games": recent_form
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{team_id}/rankings")
async def get_team_rankings(team_id: int, season: int = Query(2025, description="시즌 연도")):
    """팀의 각종 순위"""
    try:
        # 리그 내 각 항목별 순위
        rankings = db.execute_query("""
            WITH league_rankings AS (
                SELECT 
                    s.team_id,
                    t.team_abbreviation,
                    s.league,
                    s.wins,
                    s.losses,
                    s.win_percentage,
                    s.runs_scored,
                    s.runs_allowed,
                    s.run_differential,
                    ROW_NUMBER() OVER (PARTITION BY s.league ORDER BY s.wins DESC) as wins_rank,
                    ROW_NUMBER() OVER (PARTITION BY s.league ORDER BY s.win_percentage DESC) as win_pct_rank,
                    ROW_NUMBER() OVER (PARTITION BY s.league ORDER BY s.runs_scored DESC) as offense_rank,
                    ROW_NUMBER() OVER (PARTITION BY s.league ORDER BY s.runs_allowed ASC) as defense_rank,
                    ROW_NUMBER() OVER (PARTITION BY s.league ORDER BY s.run_differential DESC) as run_diff_rank
                FROM standings s
                JOIN teams t ON s.team_id = t.team_id
                WHERE s.season_year = %s
            )
            SELECT * FROM league_rankings WHERE team_id = %s
        """, (season, team_id))
        
        if not rankings:
            raise HTTPException(status_code=404, detail="Team rankings not found")
        
        return {
            "team_id": team_id,
            "season": season,
            "rankings": rankings[0]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")