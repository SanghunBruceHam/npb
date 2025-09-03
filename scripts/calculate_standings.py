#!/usr/bin/env python3
import json
from datetime import datetime
from collections import defaultdict

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, filepath):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def calculate_standings(games_file='data/games.json', teams_file='data/teams.json'):
    games = load_json(games_file)
    teams = load_json(teams_file)
    
    team_map = {t['team_id']: t for t in teams}
    
    standings = defaultdict(lambda: {
        'wins': 0,
        'losses': 0,
        'draws': 0,
        'games_played': 0,
        'winning_percentage': 0.0,
        'games_behind': 0.0,
        'runs_scored': 0,
        'runs_allowed': 0,
        'run_differential': 0,
        'home_wins': 0,
        'home_losses': 0,
        'home_draws': 0,
        'away_wins': 0,
        'away_losses': 0,
        'away_draws': 0,
        'last_10': [],
        'streak': {'type': None, 'count': 0}
    })
    
    for game in games:
        if game['game_status'] != 'completed':
            continue
            
        home_id = game['home_team_id']
        away_id = game['away_team_id']
        home_score = game['home_score']
        away_score = game['away_score']
        
        if home_id not in team_map or away_id not in team_map:
            continue
        
        standings[home_id]['runs_scored'] += home_score
        standings[home_id]['runs_allowed'] += away_score
        standings[away_id]['runs_scored'] += away_score
        standings[away_id]['runs_allowed'] += home_score
        
        standings[home_id]['games_played'] += 1
        standings[away_id]['games_played'] += 1
        
        if game.get('is_draw', False):
            standings[home_id]['draws'] += 1
            standings[home_id]['home_draws'] += 1
            standings[away_id]['draws'] += 1
            standings[away_id]['away_draws'] += 1
        elif home_score > away_score:
            standings[home_id]['wins'] += 1
            standings[home_id]['home_wins'] += 1
            standings[away_id]['losses'] += 1
            standings[away_id]['away_losses'] += 1
        else:
            standings[home_id]['losses'] += 1
            standings[home_id]['home_losses'] += 1
            standings[away_id]['wins'] += 1
            standings[away_id]['away_wins'] += 1
    
    for team_id, stats in standings.items():
        stats['run_differential'] = stats['runs_scored'] - stats['runs_allowed']
        if stats['wins'] + stats['losses'] > 0:
            stats['winning_percentage'] = stats['wins'] / (stats['wins'] + stats['losses'])
        else:
            stats['winning_percentage'] = 0.0
    
    central_standings = []
    pacific_standings = []
    
    for team_id, stats in standings.items():
        if team_id not in team_map:
            continue
            
        team = team_map[team_id]
        standing = {
            'team_id': team_id,
            'team_name': team['team_name'],
            'team_abbreviation': team['team_abbreviation'],
            'league': team['league'],
            'wins': stats['wins'],
            'losses': stats['losses'],
            'draws': stats['draws'],
            'games_played': stats['games_played'],
            'winning_percentage': round(stats['winning_percentage'], 3),
            'games_behind': 0.0,
            'runs_scored': stats['runs_scored'],
            'runs_allowed': stats['runs_allowed'],
            'run_differential': stats['run_differential'],
            'home_record': f"{stats['home_wins']}-{stats['home_losses']}-{stats['home_draws']}",
            'away_record': f"{stats['away_wins']}-{stats['away_losses']}-{stats['away_draws']}",
            'last_10': "0-0",
            'streak': "W0"
        }
        
        if team['league'] == 'Central':
            central_standings.append(standing)
        else:
            pacific_standings.append(standing)
    
    central_standings.sort(key=lambda x: (-x['winning_percentage'], -x['wins']))
    pacific_standings.sort(key=lambda x: (-x['winning_percentage'], -x['wins']))
    
    if central_standings:
        leader = central_standings[0]
        for i, team in enumerate(central_standings):
            if i > 0:
                gb = ((leader['wins'] - team['wins']) + (team['losses'] - leader['losses'])) / 2
                team['games_behind'] = gb
    
    if pacific_standings:
        leader = pacific_standings[0]
        for i, team in enumerate(pacific_standings):
            if i > 0:
                gb = ((leader['wins'] - team['wins']) + (team['losses'] - leader['losses'])) / 2
                team['games_behind'] = gb
    
    result = {
        'last_updated': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'central_league': {
            'standings': central_standings
        },
        'pacific_league': {
            'standings': pacific_standings
        }
    }
    
    for i, team in enumerate(result['central_league']['standings'], 1):
        team['position_rank'] = i
    
    for i, team in enumerate(result['pacific_league']['standings'], 1):
        team['position_rank'] = i
    
    return result

if __name__ == '__main__':
    standings = calculate_standings()
    save_json(standings, 'data/standings.json')
    print("Standings calculated and saved to data/standings.json")
    
    print("\nCentral League:")
    print(f"{'順位':<4} {'チーム':<20} {'勝':<5} {'敗':<5} {'分':<5} {'勝率':<7} {'ゲーム差'}")
    for i, team in enumerate(standings['central_league']['standings'], 1):
        gb = '-' if team['games_behind'] == 0 else f"{team['games_behind']:.1f}"
        print(f"{i:<4} {team['team_name']:<20} {team['wins']:<5} {team['losses']:<5} {team['draws']:<5} {team['winning_percentage']:<7.3f} {gb}")
    
    print("\nPacific League:")
    print(f"{'順位':<4} {'チーム':<20} {'勝':<5} {'敗':<5} {'分':<5} {'勝率':<7} {'ゲーム差'}")
    for i, team in enumerate(standings['pacific_league']['standings'], 1):
        gb = '-' if team['games_behind'] == 0 else f"{team['games_behind']:.1f}"
        print(f"{i:<4} {team['team_name']:<20} {team['wins']:<5} {team['losses']:<5} {team['draws']:<5} {team['winning_percentage']:<7.3f} {gb}")