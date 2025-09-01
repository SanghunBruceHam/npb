// 전체 시즌 순위 변동 데이터 생성기
class SeasonRankGenerator {
    constructor(gameData) {
        this.gameData = gameData;
        this.teams = ["한화", "LG", "두산", "삼성", "KIA", "SSG", "롯데", "NC", "키움", "KT"];
        this.dailyStandings = new Map();
    }

    // 모든 경기 날짜 수집
    getAllGameDates() {
        const dates = new Set();
        
        for (const team of this.teams) {
            if (this.gameData[team] && this.gameData[team].games) {
                for (const game of this.gameData[team].games) {
                    dates.add(game.date);
                }
            }
        }
        
        return Array.from(dates).sort();
    }

    // 특정 날짜까지의 팀별 누적 전적 계산
    calculateCumulativeRecord(targetDate) {
        const records = {};
        
        // 모든 팀 초기화
        for (const team of this.teams) {
            records[team] = { wins: 0, losses: 0, draws: 0, games: 0 };
        }
        
        // 각 팀의 경기 결과를 targetDate까지 누적
        for (const team of this.teams) {
            if (this.gameData[team] && this.gameData[team].games) {
                for (const game of this.gameData[team].games) {
                    if (game.date <= targetDate) {
                        records[team].games++;
                        
                        if (game.result === 'W') {
                            records[team].wins++;
                        } else if (game.result === 'L') {
                            records[team].losses++;
                        } else if (game.result === 'D') {
                            records[team].draws++;
                        }
                    }
                }
            }
        }
        
        return records;
    }

    // 승률 기반 순위 계산
    calculateRankings(records) {
        const standings = [];
        
        for (const team of this.teams) {
            const record = records[team];
            const totalGames = record.wins + record.losses + record.draws;
            const winRate = totalGames > 0 ? record.wins / (record.wins + record.losses) : 0;
            
            standings.push({
                team: team,
                wins: record.wins,
                losses: record.losses,
                draws: record.draws,
                games: totalGames,
                winRate: winRate
            });
        }
        
        // 승률 순으로 정렬 (승률 같으면 승수 많은 순, 그것도 같으면 알파벳 순)
        standings.sort((a, b) => {
            if (Math.abs(a.winRate - b.winRate) < 0.001) {
                if (a.wins !== b.wins) {
                    return b.wins - a.wins;
                }
                return a.team.localeCompare(b.team);
            }
            return b.winRate - a.winRate;
        });
        
        // 순위 할당
        standings.forEach((team, index) => {
            team.rank = index + 1;
        });
        
        return standings;
    }

    // 전체 시즌 일별 순위 데이터 생성
    generateSeasonRankings() {
        const dates = this.getAllGameDates();
        const seasonData = [];
        
        console.log(`Processing ${dates.length} game dates from ${dates[0]} to ${dates[dates.length-1]}`);
        
        for (const date of dates) {
            const records = this.calculateCumulativeRecord(date);
            const standings = this.calculateRankings(records);
            
            // 최소 경기수 체크 (개막 초기 데이터 품질)
            const hasValidData = standings.some(team => team.games >= 1);
            
            if (hasValidData) {
                seasonData.push({
                    date: date,
                    standings: standings
                });
                
                // 진행상황 로그 (매 20경기일마다)
                if (seasonData.length % 20 === 0) {
                    console.log(`Processed ${seasonData.length} game days, current date: ${date}`);
                }
            }
        }
        
        console.log(`Generated rankings for ${seasonData.length} days`);
        return seasonData;
    }

    // Chart.js용 데이터 포맷 변환
    formatForChart(seasonData) {
        if (!seasonData || seasonData.length === 0) {
            console.warn('No season data to format');
            return null;
        }

        const chartData = {
            labels: [],
            datasets: []
        };
        
        // 날짜 라벨 생성 (월/일 형식으로 간소화)
        chartData.labels = seasonData.map(day => {
            const [year, month, dayNum] = day.date.split('-');
            return `${parseInt(month)}/${parseInt(dayNum)}`;
        });
        
        // 팀별 색상 정의
        const teamColors = {
            "한화": "#FF6600",
            "LG": "#C50E2E", 
            "두산": "#131230",
            "삼성": "#1F4E8C",
            "KIA": "#EA0029",
            "SSG": "#CE0E2D",
            "롯데": "#041E42",
            "NC": "#315288",
            "키움": "#570514",
            "KT": "#333333"
        };
        
        // 각 팀별 순위 데이터 생성
        for (const teamName of this.teams) {
            const rankHistory = [];
            
            seasonData.forEach(day => {
                const teamData = day.standings.find(s => s.team === teamName);
                rankHistory.push(teamData ? teamData.rank : null);
            });
            
            chartData.datasets.push({
                label: teamName,
                data: rankHistory,
                borderColor: teamColors[teamName],
                backgroundColor: teamColors[teamName] + '20',
                borderWidth: 2,
                pointRadius: 1,
                pointHoverRadius: 4,
                tension: 0.1,
                fill: false
            });
        }
        
        return chartData;
    }
}

// 전역으로 내보내기
window.SeasonRankGenerator = SeasonRankGenerator;