#!/usr/bin/env python3
"""
Repair data/simple/games_raw.txt

Goals:
- Fix malformed game lines using meta IDs (home/away abbr, league)
- Preserve date headers, game line, and meta line
- Keep inning detail lines ("# 📊 이닝별: ...")
- Drop hits/errors lines ("# 📊 안타...", "# 📊 실책...")
- Preserve existing [DRAW]/[SCHEDULED]/[POSTPONED] tags without inventing new ones

This script rewrites the file in-place.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data' / 'simple' / 'games_raw.txt'

ID_TO_TEAM = {
    1: {'abbr': 'YOG', 'league': 'Central'},
    2: {'abbr': 'HAN', 'league': 'Central'},
    3: {'abbr': 'YDB', 'league': 'Central'},
    4: {'abbr': 'HIR', 'league': 'Central'},
    5: {'abbr': 'CHU', 'league': 'Central'},
    6: {'abbr': 'YAK', 'league': 'Central'},
    7: {'abbr': 'SOF', 'league': 'Pacific'},
    8: {'abbr': 'LOT', 'league': 'Pacific'},
    9: {'abbr': 'RAK', 'league': 'Pacific'},
    10: {'abbr': 'ORI', 'league': 'Pacific'},
    11: {'abbr': 'SEI', 'league': 'Pacific'},
    12: {'abbr': 'NIP', 'league': 'Pacific'},
}

def sanitize_file():
    text = RAW.read_text(encoding='utf-8')
    lines = text.splitlines()
    out = []

    i = 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()

        # Keep date headers as-is
        if s.startswith('# ') and re.match(r'^#\s*\d{4}-\d{2}-\d{2}$', s):
            out.append(line)
            i += 1
            continue

        # Drop hits/errors lines
        if s.startswith('# 📊 안타') or s.startswith('# 📊 실책'):
            i += 1
            continue

        # Keep inning detail and any other non-game comment lines as-is
        if s.startswith('# '):
            out.append(line)
            i += 1
            continue

        # Attempt to pair a game line with following meta line
        if s and not s.startswith('#'):
            next_line = lines[i+1] if i+1 < len(lines) else ''
            mmeta = re.match(r'^#\s*(\d+)\|(\d+)\|([^|]+)\|([^|]+)\s*$', next_line.strip())
            # Extract score from the current line if present
            mscore = re.search(r'(\d+)-(\d+)', s)
            score_str = None
            if mscore:
                score_str = f"{mscore.group(1)}-{mscore.group(2)}"

            if mmeta:
                away_id = int(mmeta.group(1))
                home_id = int(mmeta.group(2))
                away_abbr = ID_TO_TEAM.get(away_id, {}).get('abbr', 'UNK')
                home_abbr = ID_TO_TEAM.get(home_id, {}).get('abbr', 'UNK')
                league = ID_TO_TEAM.get(home_id, {}).get('league', 'Central')

                # Flags from original line
                draw_flag = ' [DRAW]' if '[DRAW]' in s else ''
                status_flag = ''
                if '[SCHEDULED]' in s:
                    status_flag = ' [SCHEDULED]'
                elif '[POSTPONED]' in s:
                    status_flag = ' [POSTPONED]'

                # Preserve trailing venue/time piece (starting with @ if exists)
                mtrail = re.search(r'(\s@\s.*)$', s)
                trail = mtrail.group(1) if mtrail else ''

                # Determine core: score or vs
                core = score_str if score_str else 'vs'

                fixed = f"{away_abbr} {core} {home_abbr} ({league}){draw_flag}{status_flag}{trail}"
                out.append(fixed)
                out.append(next_line)
                i += 2
                continue

            # If no meta, keep line as-is
            out.append(line)
            i += 1
            continue

        # Default: passthrough
        out.append(line)
        i += 1

    RAW.write_text('\n'.join(out) + '\n', encoding='utf-8')

if __name__ == '__main__':
    sanitize_file()
    print('✅ Repaired games_raw.txt (removed hits/errors; fixed team abbr/league using IDs).')

