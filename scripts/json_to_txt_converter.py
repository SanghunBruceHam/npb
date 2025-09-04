#!/usr/bin/env python3
"""
JSON 데이터를 TXT 형식으로 역변환하여 크롤링 데이터 시뮬레이션
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

def create_full_season_data():
    """143경기 시즌을 시뮬레이션하는 TXT 데이터 생성"""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data" / "simple"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # NPB 팀 정보
    teams = [
        {"id": 1, "abbr": "YOG", "name": "読売ジャイアンツ", "league": "Central"},
        {"id": 2, "abbr": "HAN", "name": "阪神タイガース", "league": "Central"},
        {"id": 3, "abbr": "YDB", "name": "横浜DeNAベイスターズ", "league": "Central"},
        {"id": 4, "abbr": "HIR", "name": "広島東洋カープ", "league": "Central"},
        {"id": 5, "abbr": "CHU", "name": "中日ドラゴンズ", "league": "Central"},
        {"id": 6, "abbr": "YAK", "name": "東京ヤクルトスワローズ", "league": "Central"},
        {"id": 7, "abbr": "SOF", "name": "福岡ソフトバンクホークス", "league": "Pacific"},
        {"id": 8, "abbr": "LOT", "name": "千葉ロッテマリーンズ", "league": "Pacific"},
        {"id": 9, "abbr": "RAK", "name": "東北楽天ゴールデンイーグルス", "league": "Pacific"},
        {"id": 10, "abbr": "ORI", "name": "オリックスバファローズ", "league": "Pacific"},
        {"id": 11, "abbr": "SEI", "name": "埼玉西武ライオンズ", "league": "Pacific"},
        {"id": 12, "abbr": "NIP", "name": "北海道日本ハムファイターズ", "league": "Pacific"}
    ]
    
    # 기존 JSON 데이터 읽기
    games_file = project_root / "data" / "games.json"
    existing_games = []
    if games_file.exists():
        with open(games_file, 'r', encoding='utf-8') as f:
            existing_games = json.load(f)
    
    print(f"📄 Found {len(existing_games)} existing games")
    
    # TXT 파일 생성
    games_txt = data_dir / "games_raw.txt"
    
    lines = [
        "# NPB_GAMES_DATA",
        f"# UPDATED: {datetime.now().isoformat()}",
        "# FORMAT: DATE|HOME_ID|HOME_ABBR|HOME_NAME|AWAY_ID|AWAY_ABBR|AWAY_NAME|HOME_SCORE|AWAY_SCORE|LEAGUE|STATUS|IS_DRAW"
    ]
    
    # 기존 데이터를 TXT 형식으로 변환
    for game in existing_games:
        is_draw = "1" if game.get("is_draw", False) else "0"
        line = f"{game['game_date']}|{game['home_team_id']}|{game['home_team_abbr']}|{game['home_team_name']}|{game['away_team_id']}|{game['away_team_abbr']}|{game['away_team_name']}|{game['home_score']}|{game['away_score']}|{game['league']}|{game['game_status']}|{is_draw}"
        lines.append(line)
    
    # 추가 시즌 경기 생성 (143경기 목표)
    target_games = 143 * 6  # 각 팀당 143경기, 총 팀수 고려
    current_games = len(existing_games)
    
    if current_games < target_games:
        print(f"📈 Adding {target_games - current_games} more games to reach season target...")
        
        # 3월 28일부터 시작해서 추가 경기 생성
        start_date = datetime(2025, 3, 28)
        current_date = start_date
        
        games_to_add = target_games - current_games
        days_needed = games_to_add // 6 + 1  # 하루 최대 6경기
        
        for day in range(days_needed):
            date_str = current_date.strftime("%Y-%m-%d")
            
            # 하루에 0-6경기 랜덤 생성
            daily_games = min(random.randint(0, 6), games_to_add)
            games_to_add -= daily_games
            
            for _ in range(daily_games):
                # 랜덤 팀 선택
                home_team = random.choice(teams)
                # 다른 리그나 같은 리그의 다른 팀 선택
                away_team = random.choice([t for t in teams if t["id"] != home_team["id"]])
                
                # 랜덤 스코어 생성
                home_score = random.randint(0, 15)
                away_score = random.randint(0, 15)
                is_draw = home_score == away_score
                
                # 무승부는 5% 확률로만
                if is_draw and random.random() > 0.05:
                    away_score = home_score + random.choice([-1, 1])
                    is_draw = False
                
                line = f"{date_str}|{home_team['id']}|{home_team['abbr']}|{home_team['name']}|{away_team['id']}|{away_team['abbr']}|{away_team['name']}|{home_score}|{away_score}|{home_team['league']}|completed|{'1' if is_draw else '0'}"
                lines.append(line)
            
            current_date += timedelta(days=1)
            
            if games_to_add <= 0:
                break
    
    # 파일 저장
    with open(games_txt, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"✅ Generated {len(lines)-3} games in {games_txt}")
    return len(lines) - 3

if __name__ == "__main__":
    games_count = create_full_season_data()
    print(f"\n🏆 Full season simulation complete: {games_count} games")