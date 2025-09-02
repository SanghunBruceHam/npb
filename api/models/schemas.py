"""
Pydantic schemas for API responses
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Team(BaseModel):
    team_id: int
    team_name: str
    team_abbreviation: str
    league: str
    team_color: Optional[str] = None

class Standing(BaseModel):
    team_id: int
    team_name: str
    team_abbreviation: str
    league: str
    position_rank: int
    games_played: int
    wins: int
    losses: int
    draws: int
    win_percentage: float
    games_behind: float
    runs_scored: int
    runs_allowed: int
    run_differential: int
    magic_number: Optional[int] = None
    clinch_status: Optional[str] = None
    last_updated: datetime

class MagicNumberResponse(BaseModel):
    season_year: int
    league: str
    standings: List[Standing]
    leader_info: dict
    last_updated: datetime

class GameResult(BaseModel):
    game_id: int
    game_date: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    game_status: str
    is_extra_innings: bool
    total_innings: int
    is_draw: bool
    stadium: Optional[str] = None