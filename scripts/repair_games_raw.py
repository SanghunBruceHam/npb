#!/usr/bin/env python3
"""
Repair malformed lines in data/simple/games_raw.txt for specific dates.

We fix lines like:
  HIR 4-6 4 (6)
to normalized form:
  HIR 4-6 YOG (Central)

by using the following meta line:
  # AWAY_ID|HOME_ID|AWAY_NAME|HOME_NAME

Usage:
  python3 scripts/repair_games_raw.py 2025-09-09 2025-09-10 ...
"""

import sys
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
RAW = ROOT / 'data' / 'simple' / 'games_raw.txt'

# Minimal ID->abbr and league map
ID_ABBR = {
    1:'YOG',2:'HAN',3:'YDB',4:'HIR',5:'CHU',6:'YAK',
    7:'SOF',8:'LOT',9:'RAK',10:'ORI',11:'SEI',12:'NIP'
}
ID_LEAGUE = {**{i:'Central' for i in [1,2,3,4,5,6]}, **{i:'Pacific' for i in [7,8,9,10,11,12]}}

def normalize_block(lines, start_idx):
    i = start_idx + 1
    while i < len(lines):
        if lines[i].startswith('# 20'):
            break
        line = lines[i].rstrip('\n')
        if not line or line.startswith('#'):
            i += 1
            continue
        # Expect a meta line next
        meta = (lines[i+1] if i+1 < len(lines) else '').strip()
        m = re.match(r'^#\s*(\d+)\|(\d+)\|', meta)
        if not m:
            i += 1
            continue
        away_id = int(m.group(1)); home_id = int(m.group(2))
        away_abbr = ID_ABBR.get(away_id, 'UNK')
        home_abbr = ID_ABBR.get(home_id, 'UNK')
        league = ID_LEAGUE.get(home_id, 'Central')

        # Case 1: already correct → keep
        if re.match(r'^[A-Z]{2,3}\s+\d+-\d+\s+[A-Z]{2,3}\s+\([A-Za-z]+\)', line):
            i += 2
            continue

        # Case 2: malformed like "HIR 4-6 4 (6)" (abbr missing)
        sc = re.match(r'^([A-Z]{2,3})\s+(\d+)-(\d+)\s+\d+\s+\(\d+\)', line)
        if sc:
            away_score = sc.group(2)
            home_score = sc.group(3)
            fixed = f"{away_abbr} {away_score}-{home_score} {home_abbr} ({league})"
            lines[i] = fixed + '\n'
        else:
            # Try another loose fallback: "AWY A-B HOM? (.*)" without abbrs
            sc2 = re.match(r'^([A-Z]{2,3})\s+(\d+)-(\d+)\b', line)
            if sc2:
                away_score = sc2.group(2)
                home_score = sc2.group(3)
                fixed = f"{away_abbr} {away_score}-{home_score} {home_abbr} ({league})"
                lines[i] = fixed + '\n'
        i += 2

def main(argv):
    if not RAW.exists():
        print(f"File not found: {RAW}")
        return 1
    targets = set(argv)
    with open(RAW, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    # Repair requested dates
    for idx, line in enumerate(lines):
        m = re.match(r'^#\s*(\d{4}-\d{2}-\d{2})\s*$', line)
        if m and m.group(1) in targets:
            normalize_block(lines, idx)
    with open(RAW, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f"Repaired dates: {', '.join(sorted(targets))}")
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))

