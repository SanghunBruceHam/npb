#!/usr/bin/env python3
"""
팀별 실제 승패 기록 정확히 계산
"""

def verify_team_records():
    games_file = "data/simple/games_raw.txt"
    
    # 팀별 통계 초기화
    team_stats = {}
    teams = ['CHU', 'HAN', 'HIR', 'LOT', 'NIP', 'ORI', 'RAK', 'SEI', 'SOF', 'YAK', 'YDB', 'YOG']
    
    for team in teams:
        team_stats[team] = {
            'games': 0,
            'wins': 0,
            'losses': 0,
            'draws': 0,
            'runs_for': 0,
            'runs_against': 0
        }
    
    print("🔍 NPB 2025 시즌 정확한 팀별 기록 검증")
    print("=" * 60)
    
    with open(games_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = line.split('|')
            if len(parts) < 12:
                continue
                
            home_team = parts[2]
            away_team = parts[5]
            home_score = int(parts[7])
            away_score = int(parts[8])
            is_draw = int(parts[11])
            
            # 홈팀 기록
            if home_team in team_stats:
                team_stats[home_team]['games'] += 1
                team_stats[home_team]['runs_for'] += home_score
                team_stats[home_team]['runs_against'] += away_score
                
                if is_draw:
                    team_stats[home_team]['draws'] += 1
                elif home_score > away_score:
                    team_stats[home_team]['wins'] += 1
                else:
                    team_stats[home_team]['losses'] += 1
            
            # 어웨이팀 기록
            if away_team in team_stats:
                team_stats[away_team]['games'] += 1
                team_stats[away_team]['runs_for'] += away_score
                team_stats[away_team]['runs_against'] += home_score
                
                if is_draw:
                    team_stats[away_team]['draws'] += 1
                elif away_score > home_score:
                    team_stats[away_team]['wins'] += 1
                else:
                    team_stats[away_team]['losses'] += 1
    
    # Central League 팀들
    central_teams = ['CHU', 'HAN', 'HIR', 'YAK', 'YDB', 'YOG']
    pacific_teams = ['LOT', 'NIP', 'ORI', 'RAK', 'SEI', 'SOF']
    
    print("\n📊 Central League")
    print("팀    | 경기 | 승  | 패  | 무 | 승률   | 득점 | 실점 | 득실차")
    print("-" * 65)
    
    central_sorted = sorted(central_teams, key=lambda x: team_stats[x]['wins'] / (team_stats[x]['wins'] + team_stats[x]['losses']) if team_stats[x]['wins'] + team_stats[x]['losses'] > 0 else 0, reverse=True)
    
    for team in central_sorted:
        stats = team_stats[team]
        win_pct = stats['wins'] / (stats['wins'] + stats['losses']) if stats['wins'] + stats['losses'] > 0 else 0
        diff = stats['runs_for'] - stats['runs_against']
        print(f"{team:5} | {stats['games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {win_pct:.3f} | {stats['runs_for']:4} | {stats['runs_against']:4} | {diff:+4}")
    
    print(f"\n📊 Pacific League")
    print("팀    | 경기 | 승  | 패  | 무 | 승률   | 득점 | 실점 | 득실차")
    print("-" * 65)
    
    pacific_sorted = sorted(pacific_teams, key=lambda x: team_stats[x]['wins'] / (team_stats[x]['wins'] + team_stats[x]['losses']) if team_stats[x]['wins'] + team_stats[x]['losses'] > 0 else 0, reverse=True)
    
    for team in pacific_sorted:
        stats = team_stats[team]
        win_pct = stats['wins'] / (stats['wins'] + stats['losses']) if stats['wins'] + stats['losses'] > 0 else 0
        diff = stats['runs_for'] - stats['runs_against']
        print(f"{team:5} | {stats['games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {win_pct:.3f} | {stats['runs_for']:4} | {stats['runs_against']:4} | {diff:+4}")
    
    # 총합 검증
    total_games = sum(stats['games'] for stats in team_stats.values()) // 2  # 한 경기는 2팀이 참여하므로 2로 나누기
    print(f"\n✅ 총 경기 수 검증: {total_games}경기")
    
    return team_stats

if __name__ == "__main__":
    verify_team_records()