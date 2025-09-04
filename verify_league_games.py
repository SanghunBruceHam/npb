#!/usr/bin/env python3
"""
리그 내 경기와 인터리그 경기를 분리해서 정확한 기록 계산
"""

def analyze_league_games():
    games_file = "data/simple/games_raw.txt"
    
    # 팀별 통계 초기화
    team_stats = {
        'CHU': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Central'},
        'HAN': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Central'},
        'HIR': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Central'},
        'YAK': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Central'},
        'YDB': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Central'},
        'YOG': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Central'},
        'LOT': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Pacific'},
        'NIP': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Pacific'},
        'ORI': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Pacific'},
        'RAK': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Pacific'},
        'SEI': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Pacific'},
        'SOF': {'league_games': 0, 'inter_games': 0, 'total_games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'league': 'Pacific'}
    }
    
    central_teams = ['CHU', 'HAN', 'HIR', 'YAK', 'YDB', 'YOG']
    pacific_teams = ['LOT', 'NIP', 'ORI', 'RAK', 'SEI', 'SOF']
    
    print("🔍 NPB 2025 리그 내/인터리그 경기 분석 (9월 2일까지)")
    print("=" * 70)
    
    league_games = 0
    inter_games = 0
    
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
            
            # 인터리그 vs 리그내 경기 판단
            is_inter_league = False
            if (home_team in central_teams and away_team in pacific_teams) or \
               (home_team in pacific_teams and away_team in central_teams):
                is_inter_league = True
                inter_games += 1
            else:
                league_games += 1
            
            # 각 팀의 통계 업데이트
            for team in [home_team, away_team]:
                if team not in team_stats:
                    continue
                    
                team_stats[team]['total_games'] += 1
                
                if is_inter_league:
                    team_stats[team]['inter_games'] += 1
                else:
                    team_stats[team]['league_games'] += 1
                
                # 승패무 계산
                if team == home_team:
                    opponent_score = away_score
                    team_score = home_score
                else:
                    opponent_score = home_score
                    team_score = away_score
                
                if is_draw:
                    team_stats[team]['draws'] += 1
                elif team_score > opponent_score:
                    team_stats[team]['wins'] += 1
                else:
                    team_stats[team]['losses'] += 1
    
    print(f"\n📊 경기 분류:")
    print(f"리그 내 경기: {league_games}경기")
    print(f"인터리그 경기: {inter_games}경기")
    print(f"총 경기: {league_games + inter_games}경기")
    
    # 공식 데이터와 비교
    official_central = {
        'HAN': {'total': 121, 'wins': 74, 'losses': 44, 'draws': 3},
        'YOG': {'total': 121, 'wins': 58, 'losses': 60, 'draws': 3},
        'YDB': {'total': 120, 'wins': 55, 'losses': 60, 'draws': 5},
        'HIR': {'total': 120, 'wins': 53, 'losses': 62, 'draws': 5},
        'CHU': {'total': 120, 'wins': 54, 'losses': 64, 'draws': 2},
        'YAK': {'total': 116, 'wins': 43, 'losses': 67, 'draws': 6}
    }
    
    official_pacific = {
        'SOF': {'total': 119, 'wins': 71, 'losses': 44, 'draws': 4},
        'NIP': {'total': 120, 'wins': 71, 'losses': 46, 'draws': 3},
        'ORI': {'total': 117, 'wins': 60, 'losses': 54, 'draws': 3},
        'RAK': {'total': 118, 'wins': 56, 'losses': 60, 'draws': 2},
        'SEI': {'total': 118, 'wins': 53, 'losses': 62, 'draws': 3},
        'LOT': {'total': 116, 'wins': 44, 'losses': 69, 'draws': 3}
    }
    
    print(f"\n📊 Central League 비교:")
    print("팀    | 총경기 | 리그내 | 인터 | 승  | 패  | 무 | 공식(총-승-패-무)")
    print("-" * 75)
    
    for team in central_teams:
        stats = team_stats[team]
        if team in official_central:
            official = official_central[team]
            match_status = "✅" if (stats['total_games'] == official['total'] and 
                                   stats['wins'] == official['wins'] and 
                                   stats['losses'] == official['losses'] and 
                                   stats['draws'] == official['draws']) else "❌"
            print(f"{team:5} | {stats['total_games']:6} | {stats['league_games']:6} | {stats['inter_games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {match_status} {official['total']}-{official['wins']}-{official['losses']}-{official['draws']}")
    
    print(f"\n📊 Pacific League 비교:")
    print("팀    | 총경기 | 리그내 | 인터 | 승  | 패  | 무 | 공식(총-승-패-무)")
    print("-" * 75)
    
    for team in pacific_teams:
        stats = team_stats[team]
        if team in official_pacific:
            official = official_pacific[team]
            match_status = "✅" if (stats['total_games'] == official['total'] and 
                                   stats['wins'] == official['wins'] and 
                                   stats['losses'] == official['losses'] and 
                                   stats['draws'] == official['draws']) else "❌"
            print(f"{team:5} | {stats['total_games']:6} | {stats['league_games']:6} | {stats['inter_games']:4} | {stats['wins']:3} | {stats['losses']:3} | {stats['draws']:2} | {match_status} {official['total']}-{official['wins']}-{official['losses']}-{official['draws']}")

if __name__ == "__main__":
    analyze_league_games()