#!/usr/bin/env python3
"""
9월 2일까지의 정확한 NPB 성적 계산
"""

def calculate_records_until_sept2():
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
    
    print("🔍 NPB 2025 시즌 9월 2일까지 정확한 기록")
    print("=" * 60)
    
    with open(games_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = line.split('|')
            if len(parts) < 12:
                continue
            
            # 9월 2일까지만 계산
            game_date = parts[0]
            if game_date > "2025-09-02":
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
    
    print("\n📊 Central League (9월 2일까지)")
    print("팀     | 경기 | 승  | 패  | 무 | 승률   | 공식승률과 비교")
    print("-" * 65)
    
    # 공식 데이터
    official_central = {
        'HAN': {'games': 121, 'wins': 74, 'losses': 44, 'draws': 3, 'win_pct': 0.627},
        'YOG': {'games': 121, 'wins': 58, 'losses': 60, 'draws': 3, 'win_pct': 0.492},
        'YDB': {'games': 120, 'wins': 55, 'losses': 60, 'draws': 5, 'win_pct': 0.478},
        'HIR': {'games': 120, 'wins': 53, 'losses': 62, 'draws': 5, 'win_pct': 0.461},
        'CHU': {'games': 120, 'wins': 54, 'losses': 64, 'draws': 2, 'win_pct': 0.458},
        'YAK': {'games': 116, 'wins': 43, 'losses': 67, 'draws': 6, 'win_pct': 0.391}
    }
    
    central_sorted = sorted(central_teams, key=lambda x: team_stats[x]['wins'] / (team_stats[x]['wins'] + team_stats[x]['losses']) if team_stats[x]['wins'] + team_stats[x]['losses'] > 0 else 0, reverse=True)
    
    for team in central_sorted:
        stats = team_stats[team]
        win_pct = stats['wins'] / (stats['wins'] + stats['losses']) if stats['wins'] + stats['losses'] > 0 else 0
        
        if team in official_central:
            official = official_central[team]
            match_status = "✅" if (stats['games'] == official['games'] and 
                                   stats['wins'] == official['wins'] and 
                                   stats['losses'] == official['losses'] and 
                                   stats['draws'] == official['draws']) else "❌"
            print(f"{team:6} | {stats['games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {win_pct:.3f} | {match_status} 공식: {official['games']}-{official['wins']}-{official['losses']}-{official['draws']}")
        else:
            print(f"{team:6} | {stats['games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {win_pct:.3f}")
    
    print(f"\n📊 Pacific League (9월 2일까지)")
    print("팀     | 경기 | 승  | 패  | 무 | 승률   | 공식승률과 비교")
    print("-" * 65)
    
    # 공식 데이터
    official_pacific = {
        'SOF': {'games': 119, 'wins': 71, 'losses': 44, 'draws': 4, 'win_pct': 0.617},
        'NIP': {'games': 120, 'wins': 71, 'losses': 46, 'draws': 3, 'win_pct': 0.607},
        'ORI': {'games': 117, 'wins': 60, 'losses': 54, 'draws': 3, 'win_pct': 0.526},
        'RAK': {'games': 118, 'wins': 56, 'losses': 60, 'draws': 2, 'win_pct': 0.483},
        'SEI': {'games': 118, 'wins': 53, 'losses': 62, 'draws': 3, 'win_pct': 0.461},
        'LOT': {'games': 116, 'wins': 44, 'losses': 69, 'draws': 3, 'win_pct': 0.389}
    }
    
    pacific_sorted = sorted(pacific_teams, key=lambda x: team_stats[x]['wins'] / (team_stats[x]['wins'] + team_stats[x]['losses']) if team_stats[x]['wins'] + team_stats[x]['losses'] > 0 else 0, reverse=True)
    
    for team in pacific_sorted:
        stats = team_stats[team]
        win_pct = stats['wins'] / (stats['wins'] + stats['losses']) if stats['wins'] + stats['losses'] > 0 else 0
        
        if team in official_pacific:
            official = official_pacific[team]
            match_status = "✅" if (stats['games'] == official['games'] and 
                                   stats['wins'] == official['wins'] and 
                                   stats['losses'] == official['losses'] and 
                                   stats['draws'] == official['draws']) else "❌"
            print(f"{team:6} | {stats['games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {win_pct:.3f} | {match_status} 공식: {official['games']}-{official['wins']}-{official['losses']}-{official['draws']}")
        else:
            print(f"{team:6} | {stats['games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {win_pct:.3f}")
    
    # 총합 검증
    total_games_until_sept2 = sum(stats['games'] for stats in team_stats.values()) // 2
    print(f"\n✅ 9월 2일까지 총 경기 수: {total_games_until_sept2}경기")
    
    return team_stats

if __name__ == "__main__":
    calculate_records_until_sept2()