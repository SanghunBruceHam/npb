#!/usr/bin/env python3
"""
단일 날짜 크롤링 테스트
"""
import sys
sys.path.insert(0, 'crawler')
from simple_crawler import SimpleCrawler
from datetime import datetime

def test_single_date():
    crawler = SimpleCrawler()
    
    # 3월 28일 테스트
    test_date = datetime(2025, 3, 28)
    print(f"🔍 Testing crawl for {test_date.strftime('%Y-%m-%d')}")
    
    games = crawler.crawl_date(test_date)
    print(f"📊 Found {len(games)} games")
    
    if games:
        print("\n🎮 Game results:")
        for i, game in enumerate(games, 1):
            print(f"{i}. {game['home_team_abbr']} {game['home_score']}-{game['away_score']} {game['away_team_abbr']} ({game['league']})")
            if game['is_draw']:
                print("   🤝 DRAW")
    
    return games

if __name__ == "__main__":
    games = test_single_date()