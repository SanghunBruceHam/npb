#!/usr/bin/env python3
"""
Minimal NPB Results Crawler (single source: Nikkansports)

Goals
- Deterministic: one code path, one source
- Results only: completed games; skip scheduled/in-progress
- TXT output compatible with existing JS converter

Usage
  python3 crawler/min_results_crawler.py           # last 7 days
  python3 crawler/min_results_crawler.py --days 3  # last 3 days
  python3 crawler/min_results_crawler.py --date 2025-09-08
  python3 crawler/min_results_crawler.py --full-season
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path
import os

# Make local imports robust whether run as module or script
try:
    from .simple_crawler import SimpleCrawler, CRAWLING_ENABLED
except Exception:
    sys.path.append(str(Path(__file__).resolve().parent))
    from simple_crawler import SimpleCrawler, CRAWLING_ENABLED


class MinResultsCrawler:
    def __init__(self):
        self.core = SimpleCrawler()
        # In-run duplicate guard
        self._seen = set()

    def crawl_date(self, dt: datetime):
        # Only use Nikkansports for results
        games = self.core.crawl_from_nikkansports(dt)
        # Keep only completed games (avoid placeholders)
        filtered = []
        for g in games:
            if g.get('status') != 'completed':
                continue
            # symmetric key to avoid swapped duplicates
            h = int(g.get('home_team_id'))
            a = int(g.get('away_team_id'))
            s_min, s_max = (h, a) if h <= a else (a, h)
            hs = g.get('home_score'); as_ = g.get('away_score')
            fi = len(g.get('inning_scores_home') or []) or ''
            key = (g.get('date'), s_min, s_max, hs, as_, fi)
            if key in self._seen:
                continue
            self._seen.add(key)
            filtered.append(g)
        games = filtered
        return games

    def crawl_days(self, days: int):
        if not CRAWLING_ENABLED:
            print("❌ Web crawling dependencies (requests, beautifulsoup4) are not installed.")
            print("Please install them using: pip install -r crawler/requirements.txt")
            return 1
        all_games = []
        today = datetime.now()
        for i in range(days):
            dt = today - timedelta(days=i)
            g = self.crawl_date(dt)
            if g:
                all_games.extend(g)
        if all_games:
            # Rewrite dates we touched to eliminate any stale scheduled/cancelled lines
            os.environ['REWRITE_DATES'] = 'AUTO'
            self.core.save_games_to_txt(all_games)
        # Do not write teams_raw.txt unless explicitly requested
        if str(os.environ.get('WRITE_TEAMS_TXT', '')).lower() in ('1','true','yes'):
            self.core.save_teams_to_txt()
        print(f"✅ Min results crawl: {len(all_games)} games collected from last {days} days")
        return 0

    def crawl_full_season(self, start_date="2025-03-28"):
        if not CRAWLING_ENABLED:
            print("❌ Web crawling dependencies (requests, beautifulsoup4) are not installed.")
            print("Please install them using: pip install -r crawler/requirements.txt")
            return 1
        all_games = []
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.now()
        dt = start
        while dt <= end:
            g = self.crawl_date(dt)
            if g:
                all_games.extend(g)
            dt += timedelta(days=1)
        if all_games:
            os.environ['REWRITE_DATES'] = 'AUTO'
            self.core.save_games_to_txt(all_games)
        if str(os.environ.get('WRITE_TEAMS_TXT', '')).lower() in ('1','true','yes'):
            self.core.save_teams_to_txt()
        print(f"✅ Min results crawl: {len(all_games)} games collected for full season")
        return 0


def parse_args(argv):
    # Very small CLI parser
    if not argv:
        return { 'mode': 'days', 'days': 7 }
    if argv[0] == '--full-season':
        return { 'mode': 'full' }
    if argv[0] == '--date' and len(argv) > 1:
        try:
            dt = datetime.strptime(argv[1], '%Y-%m-%d')
            return { 'mode': 'date', 'date': dt }
        except ValueError:
            print('❌ Invalid date format. Use YYYY-MM-DD.')
            sys.exit(1)
    if argv[0] in ('--days', '-d') and len(argv) > 1:
        try:
            return { 'mode': 'days', 'days': int(argv[1]) }
        except ValueError:
            print('❌ --days expects an integer.')
            sys.exit(1)
    # If a bare integer is provided
    try:
        return { 'mode': 'days', 'days': int(argv[0]) }
    except ValueError:
        print('❌ Invalid argument. Use --days N | --date YYYY-MM-DD | --full-season')
        sys.exit(1)


def main():
    args = parse_args(sys.argv[1:])
    crawler = MinResultsCrawler()
    if args['mode'] == 'full':
        return crawler.crawl_full_season()
    if args['mode'] == 'date':
        games = crawler.crawl_date(args['date'])
        if games:
            crawler.core.save_games_to_txt(games)
        if str(os.environ.get('WRITE_TEAMS_TXT', '')).lower() in ('1','true','yes'):
            crawler.core.save_teams_to_txt()
        print(f"✅ Min results crawl for {args['date'].strftime('%Y-%m-%d')}: {len(games)} games")
        return 0
    # days mode
    return crawler.crawl_days(args['days'])


if __name__ == '__main__':
    sys.exit(main())
