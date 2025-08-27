const { NPBDatabase } = require('./create-npb-database');
const fs = require('fs');
const path = require('path');

class NPBAnalytics {
    constructor() {
        this.db = new NPBDatabase();
    }

    async connect() {
        await this.db.connect();
    }

    async close() {
        await this.db.close();
    }

    // 팀별 최근 N경기 폼 분석
    async getTeamRecentForm(teamName, gameCount = 10) {
        const recentGames = await this.db.all(`
            SELECT date, home_team, away_team, home_score, away_score, winner
            FROM games
            WHERE home_team = ? OR away_team = ?
            ORDER BY date DESC
            LIMIT ?
        `, [teamName, teamName, gameCount]);

        let wins = 0, losses = 0, draws = 0;
        const results = [];

        recentGames.reverse().forEach(game => {
            const isHome = game.home_team === teamName;
            const teamScore = isHome ? game.home_score : game.away_score;
            const oppScore = isHome ? game.away_score : game.home_score;
            const opponent = isHome ? game.away_team : game.home_team;
            
            let result;
            if (game.winner === teamName) {
                wins++;
                result = 'W';
            } else if (game.winner === 'draw') {
                draws++;
                result = 'D';
            } else {
                losses++;
                result = 'L';
            }

            results.push({
                date: game.date,
                opponent,
                score: `${teamScore}-${oppScore}`,
                result,
                location: isHome ? 'H' : 'A'
            });
        });

        return {
            team: teamName,
            recentForm: results.map(r => r.result).join(''),
            wins,
            losses,
            draws,
            winRate: (wins / (wins + losses)).toFixed(3),
            games: results
        };
    }

    // 홈/원정 성적 분석
    async getHomeAwayStats(teamName) {
        const homeStats = await this.db.get(`
            SELECT 
                COUNT(*) as games,
                SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN winner != ? AND winner != 'draw' THEN 1 ELSE 0 END) as losses,
                AVG(home_score) as avg_score,
                AVG(away_score) as avg_allowed
            FROM games WHERE home_team = ?
        `, [teamName, teamName, teamName]);

        const awayStats = await this.db.get(`
            SELECT 
                COUNT(*) as games,
                SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN winner != ? AND winner != 'draw' THEN 1 ELSE 0 END) as losses,
                AVG(away_score) as avg_score,
                AVG(home_score) as avg_allowed
            FROM games WHERE away_team = ?
        `, [teamName, teamName, teamName]);

        return {
            team: teamName,
            home: {
                games: homeStats.games,
                wins: homeStats.wins,
                losses: homeStats.losses,
                winRate: (homeStats.wins / (homeStats.wins + homeStats.losses)).toFixed(3),
                avgScore: homeStats.avg_score?.toFixed(2),
                avgAllowed: homeStats.avg_allowed?.toFixed(2)
            },
            away: {
                games: awayStats.games,
                wins: awayStats.wins,
                losses: awayStats.losses,
                winRate: (awayStats.wins / (awayStats.wins + awayStats.losses)).toFixed(3),
                avgScore: awayStats.avg_score?.toFixed(2),
                avgAllowed: awayStats.avg_allowed?.toFixed(2)
            }
        };
    }

    // 월별 성적 분석
    async getMonthlyPerformance(teamName) {
        const monthlyStats = await this.db.all(`
            SELECT 
                strftime('%Y-%m', date) as month,
                COUNT(*) as games,
                SUM(CASE 
                    WHEN (home_team = ? AND winner = ?) OR 
                         (away_team = ? AND winner = ?) 
                    THEN 1 ELSE 0 
                END) as wins,
                SUM(CASE 
                    WHEN (home_team = ? AND winner != ? AND winner != 'draw') OR 
                         (away_team = ? AND winner != ? AND winner != 'draw') 
                    THEN 1 ELSE 0 
                END) as losses
            FROM games
            WHERE home_team = ? OR away_team = ?
            GROUP BY month
            ORDER BY month
        `, [teamName, teamName, teamName, teamName, 
            teamName, teamName, teamName, teamName, 
            teamName, teamName]);

        return monthlyStats.map(stat => ({
            ...stat,
            winRate: (stat.wins / (stat.wins + stat.losses)).toFixed(3)
        }));
    }

    // 득실점 분석
    async getRunsAnalysis() {
        const analysis = await this.db.all(`
            SELECT 
                team_name,
                games_played,
                runs_scored,
                runs_allowed,
                run_differential,
                ROUND(CAST(runs_scored AS FLOAT) / games_played, 2) as avg_runs_scored,
                ROUND(CAST(runs_allowed AS FLOAT) / games_played, 2) as avg_runs_allowed
            FROM team_stats
            ORDER BY run_differential DESC
        `);

        return analysis;
    }

    // 상대 전적 매트릭스 생성
    async getHeadToHeadMatrix() {
        const teams = ['KIA', 'LG', '삼성', '두산', 'KT', 'SSG', '롯데', '한화', 'NC', '키움'];
        const matrix = {};

        for (const team of teams) {
            matrix[team] = {};
            for (const opponent of teams) {
                if (team === opponent) {
                    matrix[team][opponent] = '-';
                    continue;
                }

                const record = await this.db.get(`
                    SELECT team1_wins, team2_wins, draws, total_games
                    FROM head_to_head
                    WHERE (team1 = ? AND team2 = ?) OR (team1 = ? AND team2 = ?)
                `, [team, opponent, opponent, team]);

                if (record) {
                    const isTeam1 = record.team1 === team;
                    const wins = isTeam1 ? record.team1_wins : record.team2_wins;
                    const losses = isTeam1 ? record.team2_wins : record.team1_wins;
                    matrix[team][opponent] = `${wins}-${losses}`;
                } else {
                    matrix[team][opponent] = '0-0';
                }
            }
        }

        return matrix;
    }

    // 연승/연패 분석
    async getStreakAnalysis() {
        const teams = ['KIA', 'LG', '삼성', '두산', 'KT', 'SSG', '롯데', '한화', 'NC', '키움'];
        const streaks = {};

        for (const team of teams) {
            const recentGames = await this.db.all(`
                SELECT winner
                FROM games
                WHERE home_team = ? OR away_team = ?
                ORDER BY date DESC
                LIMIT 20
            `, [team, team]);

            let currentStreak = 0;
            let maxWinStreak = 0;
            let maxLoseStreak = 0;
            let tempWinStreak = 0;
            let tempLoseStreak = 0;

            recentGames.forEach((game, index) => {
                if (game.winner === team) {
                    if (index === 0) currentStreak++;
                    tempWinStreak++;
                    tempLoseStreak = 0;
                    maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
                } else if (game.winner !== 'draw') {
                    if (index === 0) currentStreak--;
                    tempLoseStreak++;
                    tempWinStreak = 0;
                    maxLoseStreak = Math.max(maxLoseStreak, tempLoseStreak);
                }
            });

            streaks[team] = {
                current: currentStreak > 0 ? `${currentStreak}W` : 
                        currentStreak < 0 ? `${Math.abs(currentStreak)}L` : '0',
                maxWin: maxWinStreak,
                maxLose: maxLoseStreak
            };
        }

        return streaks;
    }

    // 주요 지표 대시보드 데이터 생성
    async generateDashboardData() {
        const standings = await this.db.all(`
            SELECT * FROM team_stats
            ORDER BY win_rate DESC, wins DESC
        `);

        const runsAnalysis = await this.getRunsAnalysis();
        const streaks = await this.getStreakAnalysis();
        
        const dashboardData = {
            updateTime: new Date().toISOString(),
            standings: standings.map((team, index) => ({
                rank: index + 1,
                team: team.team_name,
                games: team.games_played,
                wins: team.wins,
                losses: team.losses,
                draws: team.draws,
                winRate: team.win_rate.toFixed(3),
                gamesBehind: index === 0 ? '-' : 
                    ((standings[0].wins - team.wins) + 
                     (team.losses - standings[0].losses)) / 2,
                streak: streaks[team.team_name].current,
                runsScored: team.runs_scored,
                runsAllowed: team.runs_allowed,
                runDiff: team.run_differential,
                avgRunsScored: (team.runs_scored / team.games_played).toFixed(2),
                avgRunsAllowed: (team.runs_allowed / team.games_played).toFixed(2)
            })),
            topPerformers: {
                bestOffense: runsAnalysis[0],
                bestDefense: [...runsAnalysis].sort((a, b) => 
                    a.avg_runs_allowed - b.avg_runs_allowed)[0],
                bestRunDiff: runsAnalysis[0]
            }
        };

        // JSON 파일로 저장
        const outputPath = path.join(__dirname, '../data/dashboard-data.json');
        fs.writeFileSync(outputPath, JSON.stringify(dashboardData, null, 2));
        console.log(`📊 대시보드 데이터 생성: ${outputPath}`);

        return dashboardData;
    }
}

// 테스트 및 예시 실행
async function main() {
    const analytics = new KBOAnalytics();
    
    try {
        await analytics.connect();
        
        // 1. KIA 최근 10경기 폼 분석
        console.log('\n📈 KIA 타이거즈 최근 10경기:');
        const kiaForm = await analytics.getTeamRecentForm('KIA', 10);
        console.log(`폼: ${kiaForm.recentForm}`);
        console.log(`최근 10경기: ${kiaForm.wins}승 ${kiaForm.losses}패 (승률: ${kiaForm.winRate})`);
        
        // 2. LG 홈/원정 성적
        console.log('\n🏟️ LG 트윈스 홈/원정 성적:');
        const lgHomeAway = await analytics.getHomeAwayStats('LG');
        console.log(`홈: ${lgHomeAway.home.wins}승 ${lgHomeAway.home.losses}패 (승률: ${lgHomeAway.home.winRate})`);
        console.log(`원정: ${lgHomeAway.away.wins}승 ${lgHomeAway.away.losses}패 (승률: ${lgHomeAway.away.winRate})`);
        
        // 3. 대시보드 데이터 생성
        console.log('\n📊 대시보드 데이터 생성 중...');
        const dashboard = await analytics.generateDashboardData();
        console.log('✅ 대시보드 데이터 생성 완료');
        
        // 현재 순위 출력
        console.log('\n🏆 현재 순위:');
        dashboard.standings.slice(0, 5).forEach(team => {
            console.log(`${team.rank}위: ${team.team} - ${team.wins}승 ${team.losses}패 (${team.winRate}) ${team.streak}`);
        });
        
        await analytics.close();
    } catch (error) {
        console.error('❌ 오류 발생:', error);
        await analytics.close();
    }
}

// 실행
if (require.main === module) {
    main();
}

module.exports = { KBOAnalytics };