const fs = require('fs');

// Enhanced 대시보드에서 요일별 분석 출력
function displayWeekdayAnalysis() {
    try {
        const dashboardData = JSON.parse(
            fs.readFileSync('../data/enhanced-dashboard.json', 'utf8')
        );
        
        const teams = ['한화', 'KIA', 'KT', 'LG', '롯데', 'NC', '두산', 'SSG', '삼성', '키움'];
        const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
        
        console.log('=== KBO 2025시즌 요일별 성적 완전 분석 ===\n');
        
        // 1. 요일별 승률 매트릭스 (요일이 행, 팀이 열)
        console.log('📅 요일별 승률 매트릭스');
        console.log('요일\\팀'.padEnd(8), teams.map(team => team.padEnd(8)).join(''));
        console.log('-'.repeat(8 + teams.length * 8));
        
        for (const weekday of weekdays) {
            process.stdout.write(`${weekday}요일`.padEnd(8));
            
            for (const team of teams) {
                const teamData = dashboardData.weekdayPerformance[team];
                const dayData = teamData && teamData[weekday];
                const winRate = dayData ? (parseFloat(dayData.win_rate) * 100).toFixed(1) + '%' : '0.0%';
                process.stdout.write(`${winRate}`.padEnd(8));
            }
            console.log();
        }
        
        console.log('\n');
        
        // 2. 요일별 승수 매트릭스
        console.log('🏆 요일별 승수 매트릭스');
        console.log('요일\\팀'.padEnd(8), teams.map(team => team.padEnd(6)).join(''));
        console.log('-'.repeat(8 + teams.length * 6));
        
        for (const weekday of weekdays) {
            process.stdout.write(`${weekday}요일`.padEnd(8));
            
            for (const team of teams) {
                const teamData = dashboardData.weekdayPerformance[team];
                const dayData = teamData && teamData[weekday];
                const wins = dayData ? dayData.wins : 0;
                process.stdout.write(`${wins}승`.padEnd(6));
            }
            console.log();
        }
        
        console.log('\n');
        
        // 3. 요일별 경기수 매트릭스
        console.log('🎮 요일별 경기수 매트릭스');
        console.log('요일\\팀'.padEnd(8), teams.map(team => team.padEnd(7)).join(''));
        console.log('-'.repeat(8 + teams.length * 7));
        
        for (const weekday of weekdays) {
            process.stdout.write(`${weekday}요일`.padEnd(8));
            
            for (const team of teams) {
                const teamData = dashboardData.weekdayPerformance[team];
                const dayData = teamData && teamData[weekday];
                const totalGames = dayData ? dayData.wins + dayData.losses : 0;
                process.stdout.write(`${totalGames}경기`.padEnd(7));
            }
            console.log();
        }
        
        console.log('\n');
        
        // 4. 팀별 최고 요일 분석
        console.log('⭐ 팀별 최고 요일 분석');
        console.log('-'.repeat(50));
        
        for (const team of teams) {
            const teamData = dashboardData.weekdayPerformance[team];
            if (!teamData) continue;
            
            let bestDay = null;
            let bestRate = 0;
            let worstDay = null;
            let worstRate = 1;
            
            for (const weekday of weekdays) {
                const dayData = teamData[weekday];
                if (dayData && (dayData.wins + dayData.losses) >= 3) { // 최소 3경기 이상
                    const winRate = parseFloat(dayData.win_rate);
                    if (winRate > bestRate) {
                        bestRate = winRate;
                        bestDay = weekday;
                    }
                    if (winRate < worstRate) {
                        worstRate = winRate;
                        worstDay = weekday;
                    }
                }
            }
            
            const bestDayData = bestDay ? teamData[bestDay] : null;
            const worstDayData = worstDay ? teamData[worstDay] : null;
            
            console.log(`${team}:`);
            if (bestDayData) {
                console.log(`  🔥 최고: ${bestDay}요일 (${bestDayData.wins}승 ${bestDayData.losses}패, ${(bestRate * 100).toFixed(1)}%)`);
            }
            if (worstDayData && worstDay !== bestDay) {
                console.log(`  😰 최악: ${worstDay}요일 (${worstDayData.wins}승 ${worstDayData.losses}패, ${(worstRate * 100).toFixed(1)}%)`);
            }
        }
        
        console.log('\n');
        
        // 5. 요일별 리그 전체 승률
        console.log('📊 요일별 리그 전체 통계');
        console.log('-'.repeat(40));
        
        for (const weekday of weekdays) {
            let totalWins = 0;
            let totalGames = 0;
            
            for (const team of teams) {
                const teamData = dashboardData.weekdayPerformance[team];
                if (teamData && teamData[weekday]) {
                    totalWins += teamData[weekday].wins;
                    totalGames += teamData[weekday].wins + teamData[weekday].losses;
                }
            }
            
            const avgWinRate = totalGames > 0 ? (totalWins / totalGames * 100).toFixed(1) : '0.0';
            console.log(`${weekday}요일: ${totalGames}경기, 평균 승률 ${avgWinRate}%`);
        }
        
    } catch (error) {
        console.error('❌ 요일별 분석 중 오류:', error.message);
    }
}

// 실행
if (require.main === module) {
    displayWeekdayAnalysis();
}