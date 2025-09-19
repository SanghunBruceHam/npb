#!/usr/bin/env node
/**
 * Simple TXT를 JSON으로 변환
 * 순위 계산, 통계 계산도 JavaScript로 직접 처리
 */

const fs = require('fs');
const path = require('path');

class SimpleTxtToJson {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.simpleDir = path.join(this.projectRoot, 'data', 'simple');
        this.outputDir = path.join(this.projectRoot, 'data');
        this.idToAbbr = {}; // filled after teams are loaded
        // Canonical ID->team mapping as a fallback when teams_raw.txt is missing
        this.CANONICAL_TEAMS = {
            1:  { abbr: 'YOG', name: '読売ジャイアンツ',          league: 'Central' },
            2:  { abbr: 'HAN', name: '阪神タイガース',            league: 'Central' },
            3:  { abbr: 'YDB', name: '横浜DeNAベイスターズ',      league: 'Central' },
            4:  { abbr: 'HIR', name: '広島東洋カープ',            league: 'Central' },
            5:  { abbr: 'CHU', name: '中日ドラゴンズ',            league: 'Central' },
            6:  { abbr: 'YAK', name: '東京ヤクルトスワローズ',    league: 'Central' },
            7:  { abbr: 'SOF', name: '福岡ソフトバンクホークス',  league: 'Pacific' },
            8:  { abbr: 'LOT', name: '千葉ロッテマリーンズ',      league: 'Pacific' },
            9:  { abbr: 'RAK', name: '東北楽天ゴールデンイーグルス',league: 'Pacific' },
            10: { abbr: 'ORI', name: 'オリックスバファローズ',    league: 'Pacific' },
            11: { abbr: 'SEI', name: '埼玉西武ライオンズ',        league: 'Pacific' },
            12: { abbr: 'NIP', name: '北海道日本ハムファイターズ',league: 'Pacific' },
        };
        this.CANONICAL_BY_ABBR = {};
        Object.entries(this.CANONICAL_TEAMS).forEach(([id, info]) => {
            this.CANONICAL_BY_ABBR[info.abbr] = {
                id: parseInt(id, 10),
                abbr: info.abbr,
                name: info.name,
                league: info.league
            };
        });
        const JA_SHORT_LABELS = {
            YOG: '巨人',
            HAN: '阪神',
            YDB: 'ＤｅＮＡ',
            HIR: '広島',
            CHU: '中日',
            YAK: 'ヤクルト',
            SOF: 'ソフトバンク',
            LOT: 'ロッテ',
            RAK: '楽天',
            ORI: 'オリックス',
            SEI: '西武',
            NIP: '日本ハム'
        };
        this.JA_LABEL_TO_TEAM = {};
        Object.entries(JA_SHORT_LABELS).forEach(([abbr, label]) => {
            const info = this.CANONICAL_BY_ABBR[abbr];
            if (info) {
                this.JA_LABEL_TO_TEAM[label] = info;
            }
        });
    }

    /**
     * De-duplicate games conservatively by key.
     * Key includes date + team IDs + scores (+final_inning when present) to preserve doubleheaders.
     */
    dedupeGames(games) {
        if (!Array.isArray(games)) return [];
        const map = new Map();
        for (const g of games) {
            // Only consider completed games for win/loss counting
            const a = g.away_score ?? '';
            const h = g.home_score ?? '';
            const fi = g.final_inning ?? '';
            const key = [g.game_date, g.home_team_id, g.away_team_id, h, a, fi].join('|');
            if (!map.has(key)) map.set(key, g);
        }
        return Array.from(map.values());
    }

    /**
     * Extra safeguard: de-duplicate ignoring home/away orientation.
     * Normalizes key by sorted team IDs, and scores aligned to that order.
     * This protects against mirrored duplicates accidentally written with swapped sides.
     * Note: Still differentiates by final_inning to avoid collapsing different games.
     */
    dedupeGamesSymmetric(games) {
        if (!Array.isArray(games)) return [];
        const map = new Map();
        for (const g of games) {
            const idA = Number(g.home_team_id);
            const idB = Number(g.away_team_id);
            const minId = Math.min(idA, idB);
            const maxId = Math.max(idA, idB);
            let sLo, sHi;
            if (idA <= idB) {
                sLo = g.home_score;
                sHi = g.away_score;
            } else {
                sLo = g.away_score;
                sHi = g.home_score;
            }
            const fi = g.final_inning ?? '';
            const key = [g.game_date, minId, maxId, sLo, sHi, fi].join('|');
            if (!map.has(key)) map.set(key, g);
        }
        return Array.from(map.values());
    }

    /**
     * TXT 파일 읽기
     */
    readTxtFile(filename) {
        try {
            const filePath = path.join(this.simpleDir, filename);
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️ File not found: ${filename}`);
                return null;
            }
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            console.error(`❌ Error reading ${filename}:`, error.message);
            return null;
        }
    }

    /**
     * 팀 데이터 파싱
     */
    parseTeams(txtData) {
        const lines = txtData.split('\n');
        const teams = [];
        
        for (const line of lines) {
            if (line.startsWith('#') || !line.trim()) continue;
            
            const parts = line.split('|');
            if (parts.length >= 4) {
                teams.push({
                    team_id: parseInt(parts[0]),
                    team_abbreviation: parts[1],
                    team_name: parts[2],
                    league: parts[3]
                });
            }
        }
        
        return teams;
    }

    /**
     * 경기 데이터 파싱 (완료/예정 공통)
     */
    parseGames(txtData) {
        // Support both old pipe-delimited format and new human-readable format
        const lines = txtData.split('\n');

        const parsedPipe = [];
        for (const line of lines) {
            if (line.startsWith('#') || !line.trim()) continue;
            const parts = line.split('|');
            if (parts.length >= 12) {
                const base = {
                    game_date: parts[0],
                    home_team_id: parseInt(parts[1]),
                    home_team_abbr: parts[2],
                    home_team_name: parts[3],
                    away_team_id: parseInt(parts[4]),
                    away_team_abbr: parts[5],
                    away_team_name: parts[6],
                    // 'NULL' 점수는 NaN -> JSON 직렬화 시 null
                    home_score: parseInt(parts[7]),
                    away_score: parseInt(parts[8]),
                    league: parts[9],
                    game_status: parts[10],
                    is_draw: parts[11] === '1'
                };
                if (parts.length >= 14) {
                    base.stadium = parts[12] || '';
                    base.scheduled_time = parts[13] || '';
                }
                parsedPipe.push(base);
            }
        }

        // If we parsed any using the pipe format, return them
        if (parsedPipe.length > 0) return parsedPipe;

        // Fallback: parse the new grouped, human-readable format
        const games = [];
        let currentDate = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Date marker: "# YYYY-MM-DD"
            const dateMatch = line.match(/^#\s*(\d{4}-\d{2}-\d{2})$/);
            if (dateMatch) {
                currentDate = dateMatch[1];
                continue;
            }

            // Skip comments and metadata/hints
            if (line.startsWith('#')) continue;

            // Game line pattern (Japanese labels allowed):
            // LabelAway 2-4 LabelHome (League) [DRAW] [SCHEDULED|POSTPONED] @ Venue info
            const m = line.match(/^(.+?)\s+((\d+)-(\d+)|vs)\s+(.+?)\s+\(([^)]+)\)(?:\s+\[([A-Z]+)\])?(?:\s+@\s*(.*))?$/);
            if (!m || !currentDate) {
                continue;
            }

            const away_label = m[1];
            const scorePart = m[2];
            const away_score_str = m[3] || null;
            const home_score_str = m[4] || null;
            const home_label = m[5];
            const league = m[6];
            const bracketTag = (m[7] || '').toUpperCase(); // DRAW|SCHEDULED|POSTPONED
            const venue = m[8] || '';

            // Expect an optional metadata line: "# AWAY_ID|HOME_ID|AWAY_NAME|HOME_NAME"
            let metaAwayId = null, metaHomeId = null, away_name = '', home_name = '';
            const next = (lines[i + 1] || '').trim();
            if (next.startsWith('#')) {
                const meta = next.replace(/^#\s*/, '');
                const metaParts = meta.split('|');
                if (metaParts.length >= 4 && /^\d+$/.test(metaParts[0]) && /^\d+$/.test(metaParts[1])) {
                    metaAwayId = parseInt(metaParts[0]);
                    metaHomeId = parseInt(metaParts[1]);
                    away_name = metaParts[2] || '';
                    home_name = metaParts[3] || '';
                    // Advance past meta line
                    i += 1;
                }
            }

            const awayTeamInfo = this.JA_LABEL_TO_TEAM[away_label] || null;
            const homeTeamInfo = this.JA_LABEL_TO_TEAM[home_label] || null;
            if (awayTeamInfo && metaAwayId === null) {
                metaAwayId = awayTeamInfo.id;
            }
            if (homeTeamInfo && metaHomeId === null) {
                metaHomeId = homeTeamInfo.id;
            }
            if (!away_name && awayTeamInfo) {
                away_name = awayTeamInfo.name;
            }
            if (!home_name && homeTeamInfo) {
                home_name = homeTeamInfo.name;
            }

            // Determine status and scores (robust against bogus 0-0 lines)
            let game_status = 'completed';
            if (bracketTag === 'SCHEDULED') game_status = 'scheduled';
            else if (bracketTag === 'POSTPONED') game_status = 'postponed';

            let away_score = null, home_score = null;
            if (scorePart !== 'vs' && away_score_str != null && home_score_str != null) {
                const a = parseInt(away_score_str);
                const h = parseInt(home_score_str);
                if (!Number.isNaN(a) && !Number.isNaN(h)) {
                    away_score = a;
                    home_score = h;
                }
            } else if (game_status === 'completed') {
                // If no scores but marked as completed, downgrade to scheduled
                game_status = 'scheduled';
            }

            // Treat 0-0 without explicit [DRAW] as not completed (scheduled/placeholder)
            if (
                game_status === 'completed' &&
                away_score === 0 &&
                home_score === 0 &&
                bracketTag !== 'DRAW'
            ) {
                game_status = 'scheduled';
                away_score = null;
                home_score = null;
            }

            const is_draw = bracketTag === 'DRAW' || (game_status === 'completed' && away_score !== null && home_score !== null && away_score === home_score);

            // Build record; prefer IDs/names from meta when available
            const rec = {
                game_date: currentDate,
                home_team_id: metaHomeId ?? null,
                home_team_abbr: (metaHomeId != null ? this.idToAbbr[metaHomeId] : '') || (homeTeamInfo ? homeTeamInfo.abbr : ''),
                home_team_name: home_name || (homeTeamInfo ? homeTeamInfo.name : home_label),
                away_team_id: metaAwayId ?? null,
                away_team_abbr: (metaAwayId != null ? this.idToAbbr[metaAwayId] : '') || (awayTeamInfo ? awayTeamInfo.abbr : ''),
                away_team_name: away_name || (awayTeamInfo ? awayTeamInfo.name : away_label),
                home_score,
                away_score,
                league,
                game_status,
                is_draw
            };
            if (venue) rec.stadium = venue;

            // Try to parse final inning from following detail comment lines (e.g., "# 📊 이닝별: 1회(...)")
            // We only annotate for completed games
            if (rec.game_status === 'completed') {
                let scanIdx = i + 1; // start scanning after the meta line we already advanced past
                let finalInning = null;
                while (scanIdx < lines.length) {
                    const nxt = lines[scanIdx].trim();
                    if (!nxt) { scanIdx++; continue; }
                    // Stop if we reached a new date section or another game line
                    if (/^#\s*\d{4}-\d{2}-\d{2}$/.test(nxt)) break;
                    if (!nxt.startsWith('#')) break; // only look at comment detail lines

                    // Detail stats line emitted by crawler
                    if (nxt.includes('📊') && (nxt.includes('이닝별') || nxt.toLowerCase().includes('inning'))) {
                        // Extract the last occurrence of "<number>회"
                        const matches = Array.from(nxt.matchAll(/(\d+)회/g));
                        if (matches && matches.length > 0) {
                            const last = matches[matches.length - 1];
                            const num = parseInt(last[1], 10);
                            if (!Number.isNaN(num)) {
                                finalInning = num;
                                break;
                            }
                        }
                    }
                    scanIdx++;
                }
                if (finalInning != null) {
                    rec.final_inning = finalInning;
                }
            }
            games.push(rec);
        }

        return games;
    }

    /**
     * 예정 경기 TXT 파싱 (upcoming_games_raw.txt)
     */
    parseUpcoming(txtData) {
        // 형식은 games_raw.txt와 동일하며 점수가 'NULL'이고 status가 'scheduled'
        const upcoming = this.parseGames(txtData).filter(g => g.game_status === 'scheduled');

        // 오늘(Asia/Tokyo 기준) 이전 날짜는 잔여 경기에서 제외한다.
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = formatter.format(new Date());

        return upcoming.filter(game => {
            if (!game.game_date) return true;
            return game.game_date >= todayStr;
        });
    }

    /**
     * 순위표 계산 (JavaScript로 직접 계산)
     */
    calculateStandings(teams, games) {
        // 팀별 통계 초기화
        const teamStats = {};
        teams.forEach(team => {
            teamStats[team.team_id] = {
                team_id: team.team_id,
                team_abbreviation: team.team_abbreviation,
                team_name: team.team_name,
                league: team.league,
                games_played: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                runs_scored: 0,
                runs_allowed: 0
            };
        });

        // 경기 결과로 통계 계산
        games.forEach(game => {
            if (game.game_status !== 'completed') return;

            const homeStats = teamStats[game.home_team_id];
            const awayStats = teamStats[game.away_team_id];

            if (!homeStats || !awayStats) return;

            // 경기 수 증가
            homeStats.games_played++;
            awayStats.games_played++;

            // 득점/실점
            homeStats.runs_scored += game.home_score;
            homeStats.runs_allowed += game.away_score;
            awayStats.runs_scored += game.away_score;
            awayStats.runs_allowed += game.home_score;

            if (game.is_draw) {
                // 무승부
                homeStats.draws++;
                awayStats.draws++;
            } else if (game.home_score > game.away_score) {
                // 홈팀 승리
                homeStats.wins++;
                awayStats.losses++;
            } else {
                // 어웨이팀 승리
                awayStats.wins++;
                homeStats.losses++;
            }
        });

        // 승률 계산 및 순위 매기기
        const standings = Object.values(teamStats).map(stats => {
            const totalGames = stats.wins + stats.losses;
            return {
                ...stats,
                win_percentage: totalGames > 0 ? stats.wins / totalGames : 0,
                run_differential: stats.runs_scored - stats.runs_allowed
            };
        });

        // 리그별 분리 및 정렬
        const centralLeague = standings
            .filter(team => team.league === 'Central')
            .sort((a, b) => {
                if (a.win_percentage !== b.win_percentage) {
                    return b.win_percentage - a.win_percentage;
                }
                return b.wins - a.wins; // 승수로 2차 정렬
            })
            .map((team, index) => ({
                ...team,
                position_rank: index + 1
            }));

        const pacificLeague = standings
            .filter(team => team.league === 'Pacific')
            .sort((a, b) => {
                if (a.win_percentage !== b.win_percentage) {
                    return b.win_percentage - a.win_percentage;
                }
                return b.wins - a.wins;
            })
            .map((team, index) => ({
                ...team,
                position_rank: index + 1
            }));

        // 게임차 계산
        if (centralLeague.length > 0) {
            const leader = centralLeague[0];
            centralLeague.forEach(team => {
                team.games_behind = this.calculateGamesBehind(leader, team);
            });
        }

        if (pacificLeague.length > 0) {
            const leader = pacificLeague[0];
            pacificLeague.forEach(team => {
                team.games_behind = this.calculateGamesBehind(leader, team);
            });
        }

        return {
            updated_at: new Date().toISOString(),
            central_league: { standings: centralLeague },
            pacific_league: { standings: pacificLeague }
        };
    }

    /**
     * 게임차 계산
     */
    calculateGamesBehind(leader, team) {
        if (leader.team_id === team.team_id) return 0;
        
        const winDiff = leader.wins - team.wins;
        const lossDiff = team.losses - leader.losses;
        
        return (winDiff + lossDiff) / 2;
    }

    /**
     * 대시보드 데이터 생성
     */
    generateDashboard(games, standings) {
        const today = new Date().toISOString().split('T')[0];
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];

        // 오늘 경기
        const todayGames = games.filter(game => game.game_date === today);

        // 일주일 경기
        const weekGames = games.filter(game => game.game_date >= weekAgoStr);

        // 고득점 경기 (상위 5개)
        const highScoringGames = games
            .map(game => ({
                game_date: game.game_date,
                home_team: game.home_team_abbr,
                away_team: game.away_team_abbr,
                home_score: game.home_score,
                away_score: game.away_score,
                total_score: game.home_score + game.away_score
            }))
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 5);

        return {
            generated_at: new Date().toISOString(),
            season_stats: {
                total_games: games.length,
                today_games: todayGames.length,
                week_games: weekGames.length
            },
            highlights: {
                high_scoring_games: highScoringGames
            }
        };
    }

    /**
     * JSON 파일 저장
     */
    saveJsonFile(filename, data) {
        try {
            const filePath = path.join(this.outputDir, filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
            console.log(`✅ ${filename} saved (${sizeKB}KB)`);
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${filename}:`, error.message);
            return false;
        }
    }

    /**
     * 메인 변환 프로세스
     */
    async convertAll() {
        console.log('🔄 Starting Simple TXT to JSON conversion...');
        console.log(`📁 TXT source: ${this.simpleDir}`);
        console.log(`📁 JSON target: ${this.outputDir}`);
        console.log('');

        let successCount = 0;

        // 1. 팀 데이터 처리
        console.log('1️⃣ Converting teams...');
        const teamsTxt = this.readTxtFile('teams_raw.txt');
        let teams = null;
        if (teamsTxt) {
            teams = this.parseTeams(teamsTxt);
        } else {
            // Fallback: build from canonical mapping
            teams = Object.keys(this.CANONICAL_TEAMS).map(id => ({
                team_id: parseInt(id, 10),
                team_abbreviation: this.CANONICAL_TEAMS[id].abbr,
                team_name: this.CANONICAL_TEAMS[id].name,
                league: this.CANONICAL_TEAMS[id].league,
            }));
            // Keep order by ID
            teams.sort((a,b)=>a.team_id-b.team_id);
        }
        // Build ID→abbr map for later game parsing
        this.idToAbbr = {};
        if (Array.isArray(teams)) {
            teams.forEach(t => { if (t && t.team_id != null) this.idToAbbr[t.team_id] = t.team_abbreviation; });
        }
        if (this.saveJsonFile('teams.json', teams)) {
            successCount++;
        }

        // 2. 경기 데이터 처리 (완료 경기)
        console.log('2️⃣ Converting games...');
        const gamesTxt = this.readTxtFile('games_raw.txt');
        let games = null;
        if (gamesTxt) {
            games = this.parseGames(gamesTxt);
            // Keep only completed games in games.json to avoid counting scheduled placeholders
            let completedGames = Array.isArray(games) ? games.filter(g => g && g.game_status === 'completed') : [];
            // De-duplicate (strict key), then symmetric de-dup to catch mirrored entries
            completedGames = this.dedupeGames(completedGames);
            completedGames = this.dedupeGamesSymmetric(completedGames);
            if (this.saveJsonFile('games.json', completedGames)) {
                successCount++;
            }
        }

        // 2-b. 예정 경기 데이터 처리 (옵션)
        console.log('2️⃣-β Converting upcoming games (optional)...');
        const upcomingTxt = this.readTxtFile('upcoming_games_raw.txt');
        if (upcomingTxt) {
            const upcoming = this.parseUpcoming(upcomingTxt);
            if (this.saveJsonFile('upcoming.json', upcoming)) {
                // optional, no counter impact
            }
        } else {
            // 파일 없으면 조용히 스킵
        }

        // 3. 순위표 계산 및 저장
        console.log('3️⃣ Calculating standings...');
        if (teams && games) {
            // Ensure standings use the same deduped, completed set used for games.json
            let completedGamesForStandings = this.dedupeGames(
                games.filter(g => g && g.game_status === 'completed')
            );
            completedGamesForStandings = this.dedupeGamesSymmetric(completedGamesForStandings);
            const standings = this.calculateStandings(teams, completedGamesForStandings);
            if (this.saveJsonFile('standings.json', standings)) {
                successCount++;
            }

            // 4. 대시보드 생성
            console.log('4️⃣ Generating dashboard...');
            const dashboard = this.generateDashboard(completedGamesForStandings, standings);
            if (this.saveJsonFile('dashboard.json', dashboard)) {
                successCount++;
            }
        }

        // 결과 요약
        console.log('');
        console.log('📊 Conversion Summary:');
        console.log(`✅ Successfully converted: ${successCount}/4 files`);

        if (teams) {
            const centralCount = teams.filter(t => t.league === 'Central').length;
            const pacificCount = teams.filter(t => t.league === 'Pacific').length;
            console.log(`📈 Teams: ${teams.length} total (${centralCount} Central, ${pacificCount} Pacific)`);
        }

        if (games) {
            console.log(`⚾ Games: ${games.length} games processed`);
            const draws = games.filter(g => g.is_draw).length;
            console.log(`🤝 Draws: ${draws} games`);
        }

        console.log('');
        console.log(successCount === 4 ? '🎉 All conversions completed successfully!' : '⚠️ Some conversions failed');

        return successCount === 4;
    }
}

// 스크립트 실행
if (require.main === module) {
    const converter = new SimpleTxtToJson();
    converter.convertAll()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('❌ Conversion failed:', error);
            process.exit(1);
        });
}

module.exports = SimpleTxtToJson;
