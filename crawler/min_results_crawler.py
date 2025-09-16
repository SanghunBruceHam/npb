#!/usr/bin/env python3
"""
Minimal NPB Results Crawler (single source: Nikkansports)

Goals
- Deterministic: one code path, one source
- Results only: completed games; skip scheduled/in-progress
- TXT output compatible with existing JS converter

Usage
  python3 crawler/min_results_crawler.py                    # last 7 days
  python3 crawler/min_results_crawler.py --days 3           # last 3 days
  python3 crawler/min_results_crawler.py --date 2025-09-08
  python3 crawler/min_results_crawler.py --full-season

Optional flags
  --include-upcoming [days]   Save upcoming schedule (default 7 days)
  --upcoming-days N           Same as above, explicit days window
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
    """Very small CLI parser with optional upcoming schedule support."""
    args = {
        'mode': 'days',
        'days': 7,
        'include_upcoming': False,
        'upcoming_days': 7,
    }

    i = 0
    argc = len(argv)
    if argc == 0:
        return args

    while i < argc:
        token = argv[i]
        if token == '--full-season':
            args['mode'] = 'full'
            i += 1
            continue
        if token == '--date':
            if i + 1 >= argc:
                print('❌ --date expects YYYY-MM-DD.')
                sys.exit(1)
            try:
                args['mode'] = 'date'
                args['date'] = datetime.strptime(argv[i + 1], '%Y-%m-%d')
            except ValueError:
                print('❌ Invalid date format. Use YYYY-MM-DD.')
                sys.exit(1)
            i += 2
            continue
        if token in ('--days', '-d'):
            if i + 1 >= argc:
                print('❌ --days expects an integer.')
                sys.exit(1)
            try:
                args['mode'] = 'days'
                args['days'] = int(argv[i + 1])
            except ValueError:
                print('❌ --days expects an integer.')
                sys.exit(1)
            i += 2
            continue
        if token == '--include-upcoming':
            args['include_upcoming'] = True
            if i + 1 < argc and not argv[i + 1].startswith('--'):
                try:
                    args['upcoming_days'] = int(argv[i + 1])
                    i += 1
                except ValueError:
                    print('❌ --include-upcoming expects an optional integer argument.')
                    sys.exit(1)
            i += 1
            continue
        if token == '--upcoming-days':
            if i + 1 >= argc:
                print('❌ --upcoming-days expects an integer.')
                sys.exit(1)
            try:
                args['upcoming_days'] = int(argv[i + 1])
                args['include_upcoming'] = True
            except ValueError:
                print('❌ --upcoming-days expects an integer.')
                sys.exit(1)
            i += 2
            continue
        # Bare integer days fallback when no other tokens parsed yet
        if i == 0:
            try:
                args['mode'] = 'days'
                args['days'] = int(token)
                i += 1
                continue
            except ValueError:
                pass
        print('❌ Invalid argument. Use --days N | --date YYYY-MM-DD | --full-season [--include-upcoming [N]]')
        sys.exit(1)

    return args


def main():
    args = parse_args(sys.argv[1:])
    crawler = MinResultsCrawler()
    def handle_upcoming():
        if not args.get('include_upcoming'):
            return
        days = args.get('upcoming_days', 7)
        try:
            crawler.core.crawl_upcoming_games(days)
        except Exception as exc:
            print(f"❌ Upcoming games fetch failed: {exc}")

    if args['mode'] == 'full':
        result = crawler.crawl_full_season()
        handle_upcoming()
        return result
    if args['mode'] == 'date':
        games = crawler.crawl_date(args['date'])
        if games:
            crawler.core.save_games_to_txt(games)
        if str(os.environ.get('WRITE_TEAMS_TXT', '')).lower() in ('1','true','yes'):
            crawler.core.save_teams_to_txt()
        print(f"✅ Min results crawl for {args['date'].strftime('%Y-%m-%d')}: {len(games)} games")
        handle_upcoming()
        return 0
    # days mode
    result = crawler.crawl_days(args['days'])
    handle_upcoming()
    return result


if __name__ == '__main__':
    sys.exit(main())
