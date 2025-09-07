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
        const lines = txtData.split('\n');
        const games = [];
        
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
                // 예정 경기 확장 필드(STADIUM, GAME_TIME)가 있을 경우 처리
                if (parts.length >= 14) {
                    base.stadium = parts[12] || '';
                    base.scheduled_time = parts[13] || '';
                }
                games.push(base);
            }
        }
        
        return games;
    }

    /**
     * 예정 경기 TXT 파싱 (upcoming_games_raw.txt)
     */
    parseUpcoming(txtData) {
        // 형식은 games_raw.txt와 동일하며 점수가 'NULL'이고 status가 'scheduled'
        return this.parseGames(txtData).filter(g => g.game_status === 'scheduled');
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
            if (this.saveJsonFile('teams.json', teams)) {
                successCount++;
            }
        }

        // 2. 경기 데이터 처리 (완료 경기)
        console.log('2️⃣ Converting games...');
        const gamesTxt = this.readTxtFile('games_raw.txt');
        let games = null;
        if (gamesTxt) {
            games = this.parseGames(gamesTxt);
            if (this.saveJsonFile('games.json', games)) {
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
            const standings = this.calculateStandings(teams, games);
            if (this.saveJsonFile('standings.json', standings)) {
                successCount++;
            }

            // 4. 대시보드 생성
            console.log('4️⃣ Generating dashboard...');
            const dashboard = this.generateDashboard(games, standings);
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
