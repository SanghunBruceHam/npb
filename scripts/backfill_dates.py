#!/usr/bin/env python3
"""
Backfill specific dates by calling SimpleCrawler.crawl_date and merging into TXT.
Usage:
  python3 scripts/backfill_dates.py 2025-03-28 2025-03-29 ...
"""

import sys
from datetime import datetime
from importlib.util import spec_from_file_location, module_from_spec
from pathlib import Path

ROOT = Path(__file__).parent.parent

def load_crawler():
    spec = spec_from_file_location('simple_crawler', str(ROOT / 'crawler' / 'simple_crawler.py'))
    mod = module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod.SimpleCrawler()

def main(argv):
    if not argv:
        print('Usage: python3 scripts/backfill_dates.py YYYY-MM-DD [YYYY-MM-DD ...]')
        return 1
    sc = load_crawler()
    total = 0
    for d in argv:
        try:
            dt = datetime.strptime(d, '%Y-%m-%d')
        except ValueError:
            print(f'Invalid date: {d}')
            continue
        games = sc.crawl_date(dt)
        print(f'{d}: {len(games)} games')
        if games:
            sc.save_games_to_txt(games)
            total += len(games)
    print(f'Total backfilled: {total}')
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

