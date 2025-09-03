#!/usr/bin/env python3
"""
Convert TXT data to JSON for web display
"""

import json
import os
from datetime import datetime
import re

def parse_standings_txt(txt_file: str) -> dict:
    """Parse standings TXT file to JSON format"""
    standings = {
        'last_updated': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'central_league': {'standings': []},
        'pacific_league': {'standings': []}
    }
    
    with open(txt_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse Central League
    central_match = re.search(r'Central League\n-+\nRank\s+Team\s+W\s+L\s+D\s+PCT\n-+\n(.*?)(?=\n\nPacific League|\n\n|\Z)', content, re.DOTALL)
    if central_match:
        central_data = central_match.group(1).strip()
        for i, line in enumerate(central_data.split('\n'), 1):
            if line.strip():
                parts = line.split()
                if len(parts) >= 6:
                    rank, team_name, wins, losses, draws, pct = parts[0], ' '.join(parts[1:-4]), int(parts[-4]), int(parts[-3]), int(parts[-2]), float(parts[-1])
                    standings['central_league']['standings'].append({
                        'position_rank': i,
                        'team_name': team_name,
                        'wins': wins,
                        'losses': losses,
                        'draws': draws,
                        'games_played': wins + losses + draws,
                        'winning_percentage': pct,
                        'games_behind': 0.0 if i == 1 else None  # Calculate later
                    })
    
    # Parse Pacific League
    pacific_match = re.search(r'Pacific League\n-+\nRank\s+Team\s+W\s+L\s+D\s+PCT\n-+\n(.*?)(?=\n\n|\Z)', content, re.DOTALL)
    if pacific_match:
        pacific_data = pacific_match.group(1).strip()
        for i, line in enumerate(pacific_data.split('\n'), 1):
            if line.strip():
                parts = line.split()
                if len(parts) >= 6:
                    rank, team_name, wins, losses, draws, pct = parts[0], ' '.join(parts[1:-4]), int(parts[-4]), int(parts[-3]), int(parts[-2]), float(parts[-1])
                    standings['pacific_league']['standings'].append({
                        'position_rank': i,
                        'team_name': team_name,
                        'wins': wins,
                        'losses': losses,
                        'draws': draws,
                        'games_played': wins + losses + draws,
                        'winning_percentage': pct,
                        'games_behind': 0.0 if i == 1 else None  # Calculate later
                    })
    
    # Calculate games behind
    for league in ['central_league', 'pacific_league']:
        teams = standings[league]['standings']
        if teams:
            leader = teams[0]
            for team in teams[1:]:
                gb = ((leader['wins'] - team['wins']) + (team['losses'] - leader['losses'])) / 2
                team['games_behind'] = gb
    
    return standings

def convert_txt_to_json():
    """Convert latest TXT files to JSON for web display"""
    data_dir = 'data/txt'
    
    if not os.path.exists(data_dir):
        print(f"Directory {data_dir} not found")
        return
    
    # Find latest standings file
    standings_files = [f for f in os.listdir(data_dir) if f.startswith('standings_') and f.endswith('.txt')]
    if not standings_files:
        print("No standings TXT files found")
        return
    
    latest_standings = max(standings_files)
    print(f"Converting {latest_standings} to JSON...")
    
    # Parse standings
    standings_data = parse_standings_txt(os.path.join(data_dir, latest_standings))
    
    # Save to JSON
    os.makedirs('data', exist_ok=True)
    with open('data/standings.json', 'w', encoding='utf-8') as f:
        json.dump(standings_data, f, ensure_ascii=False, indent=2)
    
    print("Standings converted to data/standings.json")
    
    # Create simple dashboard data
    dashboard_data = {
        'last_updated': standings_data['last_updated'],
        'season_stats': {
            'total_games': sum(team['games_played'] for team in standings_data['central_league']['standings']),
            'today_games': 0  # Would need to calculate from today's games
        }
    }
    
    with open('data/dashboard.json', 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2)
    
    print("Dashboard data created at data/dashboard.json")

if __name__ == "__main__":
    convert_txt_to_json()