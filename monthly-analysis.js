const fs = require('fs');

// KBO 팀명 정의
const teams = ['한화', 'KIA', 'KT', 'LG', '롯데', 'NC', '두산', 'SSG', '삼성', '키움'];

// 월별 성적 분석 함수
function parseGameData() {
    const data = fs.readFileSync('/Users/sanghunbruceham/Documents/GitHub/kbo/magic-number/data/2025-season-data-clean.txt', 'utf8');
    const lines = data.split('\n').filter(line => line.trim());
    
    const monthlyStats = {};
    let currentDate = null;
    let currentMonth = null;
    
    for (const line of lines) {
        const cleanLine = line.replace(/^\s*\d+→/, '').trim();
        
        // 날짜 라인 체크 (YYYY-MM-DD 형식)
        if (cleanLine.match(/^\d{4}-\d{2}-\d{2}$/)) {
            currentDate = cleanLine;
            currentMonth = cleanLine.substring(0, 7); // YYYY-MM
            
            if (!monthlyStats[currentMonth]) {
                monthlyStats[currentMonth] = {};
                teams.forEach(team => {
                    monthlyStats[currentMonth][team] = {
                        wins: 0,
                        losses: 0,
                        ties: 0,
                        runsFor: 0,
                        runsAgainst: 0,
                        games: []
                    };
                });
            }
            continue;
        }
        
        // 경기 결과 라인 체크
        if (currentMonth && cleanLine.includes(':')) {
            const gameMatch = cleanLine.match(/^(.+?)\s+(\d+):(\d+)\s+(.+?)(?:\(H\))?$/);
            if (gameMatch) {
                const [, team1, score1Str, score2Str, team2] = gameMatch;
                const score1 = parseInt(score1Str);
                const score2 = parseInt(score2Str);
                
                // 팀명 정리 (공백 제거)
                const cleanTeam1 = team1.trim();
                const cleanTeam2 = team2.trim();
                
                if (teams.includes(cleanTeam1) && teams.includes(cleanTeam2)) {
                    // Team1 통계 업데이트
                    monthlyStats[currentMonth][cleanTeam1].runsFor += score1;
                    monthlyStats[currentMonth][cleanTeam1].runsAgainst += score2;
                    monthlyStats[currentMonth][cleanTeam1].games.push({
                        date: currentDate,
                        opponent: cleanTeam2,
                        myScore: score1,
                        oppScore: score2,
                        result: score1 > score2 ? 'W' : (score1 < score2 ? 'L' : 'T')
                    });
                    
                    // Team2 통계 업데이트
                    monthlyStats[currentMonth][cleanTeam2].runsFor += score2;
                    monthlyStats[currentMonth][cleanTeam2].runsAgainst += score1;
                    monthlyStats[currentMonth][cleanTeam2].games.push({
                        date: currentDate,
                        opponent: cleanTeam1,
                        myScore: score2,
                        oppScore: score1,
                        result: score2 > score1 ? 'W' : (score2 < score1 ? 'L' : 'T')
                    });
                    
                    // 승/패/무 카운트
                    if (score1 > score2) {
                        monthlyStats[currentMonth][cleanTeam1].wins++;
                        monthlyStats[currentMonth][cleanTeam2].losses++;
                    } else if (score1 < score2) {
                        monthlyStats[currentMonth][cleanTeam1].losses++;
                        monthlyStats[currentMonth][cleanTeam2].wins++;
                    } else {
                        monthlyStats[currentMonth][cleanTeam1].ties++;
                        monthlyStats[currentMonth][cleanTeam2].ties++;
                    }
                }
            }
        }
    }
    
    return monthlyStats;
}

// 월별 성적표 생성
function generateMonthlyMatrix() {
    const monthlyStats = parseGameData();
    const months = Object.keys(monthlyStats).sort();
    
    console.log('=== KBO 2025시즌 월별 성적 완전 분석 ===\n');
    
    // 1. 월별 승률 매트릭스 (월이 행, 팀이 열)
    console.log('📊 월별 승률 매트릭스');
    console.log('월\\팀'.padEnd(10), teams.map(team => team.padEnd(8)).join(''));
    console.log('-'.repeat(10 + teams.length * 8));
    
    for (const month of months) {
        const monthName = month.substring(5); // MM 부분만
        process.stdout.write(`${monthName}월`.padEnd(10));
        
        for (const team of teams) {
            const stats = monthlyStats[month][team];
            const totalGames = stats.wins + stats.losses + stats.ties;
            const winRate = totalGames > 0 ? (stats.wins / totalGames * 100).toFixed(1) : '0.0';
            process.stdout.write(`${winRate}%`.padEnd(8));
        }
        console.log();
    }
    
    console.log('\n');
    
    // 2. 월별 승수 매트릭스
    console.log('🏆 월별 승수 매트릭스');
    console.log('월\\팀'.padEnd(10), teams.map(team => team.padEnd(6)).join(''));
    console.log('-'.repeat(10 + teams.length * 6));
    
    for (const month of months) {
        const monthName = month.substring(5);
        process.stdout.write(`${monthName}월`.padEnd(10));
        
        for (const team of teams) {
            const wins = monthlyStats[month][team].wins;
            process.stdout.write(`${wins}승`.padEnd(6));
        }
        console.log();
    }
    
    console.log('\n');
    
    // 3. 월별 경기수 매트릭스
    console.log('🎮 월별 경기수 매트릭스');
    console.log('월\\팀'.padEnd(10), teams.map(team => team.padEnd(6)).join(''));
    console.log('-'.repeat(10 + teams.length * 6));
    
    for (const month of months) {
        const monthName = month.substring(5);
        process.stdout.write(`${monthName}월`.padEnd(10));
        
        for (const team of teams) {
            const stats = monthlyStats[month][team];
            const totalGames = stats.wins + stats.losses + stats.ties;
            process.stdout.write(`${totalGames}경기`.padEnd(6));
        }
        console.log();
    }
    
    console.log('\n');
    
    // 4. 월별 득점 매트릭스
    console.log('⚾ 월별 총득점 매트릭스');
    console.log('월\\팀'.padEnd(10), teams.map(team => team.padEnd(7)).join(''));
    console.log('-'.repeat(10 + teams.length * 7));
    
    for (const month of months) {
        const monthName = month.substring(5);
        process.stdout.write(`${monthName}월`.padEnd(10));
        
        for (const team of teams) {
            const runsFor = monthlyStats[month][team].runsFor;
            process.stdout.write(`${runsFor}점`.padEnd(7));
        }
        console.log();
    }
    
    console.log('\n');
    
    // 5. 월별 평균 득점 매트릭스
    console.log('📈 월별 평균득점 매트릭스');
    console.log('월\\팀'.padEnd(10), teams.map(team => team.padEnd(8)).join(''));
    console.log('-'.repeat(10 + teams.length * 8));
    
    for (const month of months) {
        const monthName = month.substring(5);
        process.stdout.write(`${monthName}월`.padEnd(10));
        
        for (const team of teams) {
            const stats = monthlyStats[month][team];
            const totalGames = stats.wins + stats.losses + stats.ties;
            const avgRuns = totalGames > 0 ? (stats.runsFor / totalGames).toFixed(2) : '0.00';
            process.stdout.write(`${avgRuns}`.padEnd(8));
        }
        console.log();
    }
    
    return { monthlyStats, months };
}

// 월별 상세 분석 리포트
function generateDetailedAnalysis(monthlyStats, months) {
    console.log('\n=== 월별 상세 분석 리포트 ===\n');
    
    for (const month of months) {
        const monthName = `${month.substring(0, 4)}년 ${month.substring(5)}월`;
        console.log(`📅 ${monthName} 분석`);
        console.log('-'.repeat(50));
        
        // 월별 순위
        const teamPerformance = teams.map(team => {
            const stats = monthlyStats[month][team];
            const totalGames = stats.wins + stats.losses + stats.ties;
            const winRate = totalGames > 0 ? stats.wins / totalGames : 0;
            return {
                team,
                wins: stats.wins,
                losses: stats.losses,
                ties: stats.ties,
                winRate: winRate,
                runsFor: stats.runsFor,
                runsAgainst: stats.runsAgainst,
                runsDiff: stats.runsFor - stats.runsAgainst,
                totalGames
            };
        }).sort((a, b) => b.winRate - a.winRate);
        
        console.log('순위\t팀명\t승-패-무\t승률\t득점\t실점\t득실차');
        teamPerformance.forEach((team, index) => {
            const winRateStr = (team.winRate * 100).toFixed(1) + '%';
            console.log(`${index + 1}\t${team.team}\t${team.wins}-${team.losses}-${team.ties}\t${winRateStr}\t${team.runsFor}\t${team.runsAgainst}\t${team.runsDiff > 0 ? '+' : ''}${team.runsDiff}`);
        });
        
        // 월간 MVP (최고 승률)
        const mvp = teamPerformance[0];
        console.log(`\n🏆 월간 MVP: ${mvp.team} (${mvp.wins}승 ${mvp.losses}패, 승률 ${(mvp.winRate * 100).toFixed(1)}%)`);
        
        // 월간 최다 득점팀
        const topScorer = teamPerformance.reduce((max, team) => 
            team.runsFor > max.runsFor ? team : max
        );
        console.log(`⚾ 최다 득점: ${topScorer.team} (${topScorer.runsFor}점)`);
        
        console.log('\n');
    }
}

// JSON 파일로 저장
function saveToJSON(monthlyStats, months) {
    const analysisData = {
        generatedAt: new Date().toISOString(),
        season: '2025',
        months: months,
        teams: teams,
        monthlyStats: monthlyStats,
        summary: {
            totalMonths: months.length,
            analysisComplete: true
        }
    };
    
    fs.writeFileSync('/Users/sanghunbruceham/Documents/GitHub/kbo/monthly-analysis-complete.json', 
        JSON.stringify(analysisData, null, 2));
    
    console.log('💾 분석 결과가 monthly-analysis-complete.json 파일로 저장되었습니다.');
}

// 메인 실행
function main() {
    try {
        const { monthlyStats, months } = generateMonthlyMatrix();
        generateDetailedAnalysis(monthlyStats, months);
        saveToJSON(monthlyStats, months);
        
        console.log('\n✅ KBO 2025시즌 월별 성적 완전 분석이 완료되었습니다!');
        console.log(`📊 총 ${months.length}개월 데이터 분석`);
        console.log(`🏟️ ${teams.length}개 팀 전체 포함`);
        
    } catch (error) {
        console.error('❌ 분석 중 오류 발생:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { parseGameData, generateMonthlyMatrix, generateDetailedAnalysis };