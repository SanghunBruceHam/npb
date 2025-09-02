"""
Magic Number Calculation Logic
매직넘버 계산 로직
"""

from typing import List, Dict, Tuple
from datetime import datetime

def calculate_magic_numbers(standings: List[Dict], total_games_in_season: int = 143) -> List[Dict]:
    """
    매직넘버 계산
    
    매직넘버 = 총 경기수 + 1 - (1위팀 승수 + 2위팀 최대 가능 승수)
    """
    
    # 리그별로 분리
    central_teams = [team for team in standings if team['league'] == 'Central']
    pacific_teams = [team for team in standings if team['league'] == 'Pacific']
    
    # 각 리그별로 매직넘버 계산
    central_with_magic = _calculate_league_magic_numbers(central_teams, total_games_in_season)
    pacific_with_magic = _calculate_league_magic_numbers(pacific_teams, total_games_in_season)
    
    return central_with_magic + pacific_with_magic

def _calculate_league_magic_numbers(teams: List[Dict], total_games: int) -> List[Dict]:
    """리그별 매직넘버 계산"""
    
    if not teams:
        return []
    
    # 순위별로 정렬 (이미 정렬되어 있다고 가정)
    sorted_teams = sorted(teams, key=lambda x: x['position_rank'])
    
    for i, team in enumerate(sorted_teams):
        # 각 팀의 남은 경기수 계산
        remaining_games = total_games - team['games_played']
        max_possible_wins = team['wins'] + remaining_games
        
        if i == 0:  # 1위팀
            # 2위팀과의 매직넘버 계산
            if len(sorted_teams) > 1:
                second_team = sorted_teams[1]
                second_remaining = total_games - second_team['games_played']
                second_max_wins = second_team['wins'] + second_remaining
                
                magic_number = max(0, second_max_wins + 1 - team['wins'])
                team['magic_number'] = magic_number if magic_number > 0 else None
                
                # 우승 확정 여부
                if magic_number == 0:
                    team['clinch_status'] = 'champion'
                elif magic_number <= 5:
                    team['clinch_status'] = 'close'
                else:
                    team['clinch_status'] = None
            else:
                team['magic_number'] = None
                team['clinch_status'] = 'champion'
        
        else:  # 2위 이하
            # 1위팀과의 차이 계산
            leader = sorted_teams[0]
            leader_remaining = total_games - leader['games_played']
            leader_max_wins = leader['wins'] + leader_remaining
            
            # 이 팀이 1위를 따라잡을 수 있는지 계산
            if max_possible_wins > leader['wins']:
                # 따라잡을 가능성이 있음
                elimination_number = max(0, leader['wins'] + 1 - max_possible_wins)
                team['magic_number'] = None
                team['elimination_number'] = elimination_number
                
                if elimination_number == 0:
                    team['clinch_status'] = 'eliminated'
                elif elimination_number <= 3:
                    team['clinch_status'] = 'danger'
                else:
                    team['clinch_status'] = None
            else:
                # 이미 탈락 확정
                team['magic_number'] = None
                team['elimination_number'] = 0
                team['clinch_status'] = 'eliminated'
    
    return sorted_teams

def get_season_schedule_info() -> Dict:
    """시즌 일정 정보 반환"""
    return {
        'total_games': 143,  # NPB 정규시즌 총 경기수
        'season_start': '2025-03-20',
        'season_end': '2025-10-15',
        'current_season': 2025
    }

def calculate_clinch_scenarios(team_standings: List[Dict]) -> Dict:
    """우승/탈락 시나리오 계산"""
    scenarios = {
        'central_league': {},
        'pacific_league': {}
    }
    
    central_teams = [t for t in team_standings if t['league'] == 'Central']
    pacific_teams = [t for t in team_standings if t['league'] == 'Pacific']
    
    scenarios['central_league'] = _calculate_league_scenarios(central_teams)
    scenarios['pacific_league'] = _calculate_league_scenarios(pacific_teams)
    
    return scenarios

def _calculate_league_scenarios(teams: List[Dict]) -> Dict:
    """리그별 시나리오 계산"""
    if not teams:
        return {}
    
    leader = min(teams, key=lambda x: x['position_rank'])
    
    scenarios = {
        'leader': {
            'team_name': leader['team_abbreviation'],
            'magic_number': leader.get('magic_number'),
            'clinch_status': leader.get('clinch_status'),
            'wins_needed': leader.get('magic_number', 0)
        },
        'contenders': [],
        'eliminated': []
    }
    
    for team in teams:
        if team['position_rank'] == 1:
            continue
            
        if team.get('clinch_status') == 'eliminated':
            scenarios['eliminated'].append({
                'team_name': team['team_abbreviation'],
                'elimination_number': team.get('elimination_number', 0)
            })
        else:
            scenarios['contenders'].append({
                'team_name': team['team_abbreviation'], 
                'games_behind': team['games_behind'],
                'elimination_number': team.get('elimination_number', 0)
            })
    
    return scenarios