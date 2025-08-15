const fs = require('fs');

function displayCompleteAnalysis() {
    try {
        const dashboardData = JSON.parse(
            fs.readFileSync('/Users/sanghunbruceham/Documents/GitHub/kbo/magic-number/data/enhanced-dashboard.json', 'utf8')
        );
        
        const teams = ['한화', 'KIA', 'KT', 'LG', '롯데', 'NC', '두산', 'SSG', '삼성', '키움'];
        const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
        
        console.log('=== KBO 2025시즌 완전 분석 ===\n');
        
        // 1. 요일별 성적 완전 분석
        console.log('📅 요일별 성적 완전 분석');
        console.log('='.repeat(80));
        
        // 요일별 승률 매트릭스
        console.log('\n🏆 요일별 승률 매트릭스 (요일×팀)');
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
        
        // 팀별 최고/최악 요일
        console.log('\n⭐ 팀별 최고/최악 요일');
        console.log('-'.repeat(60));
        
        for (const team of teams) {
            const teamData = dashboardData.weekdayPerformance[team];
            if (!teamData) continue;
            
            let bestDay = null, bestRate = 0, worstDay = null, worstRate = 1;
            
            for (const weekday of weekdays) {
                const dayData = teamData[weekday];
                if (dayData && (dayData.wins + dayData.losses) >= 3) {
                    const winRate = parseFloat(dayData.win_rate);
                    if (winRate > bestRate) {
                        bestRate = winRate; bestDay = weekday;
                    }
                    if (winRate < worstRate) {
                        worstRate = winRate; worstDay = weekday;
                    }
                }
            }
            
            const bestData = bestDay ? teamData[bestDay] : null;
            const worstData = worstDay ? teamData[worstDay] : null;
            
            console.log(`${team}:`);
            if (bestData) {
                console.log(`  🔥 최고: ${bestDay}요일 (${bestData.wins}승 ${bestData.losses}패, ${(bestRate * 100).toFixed(1)}%)`);
            }
            if (worstData && worstDay !== bestDay) {
                console.log(`  😰 최악: ${worstDay}요일 (${worstData.wins}승 ${worstData.losses}패, ${(worstRate * 100).toFixed(1)}%)`);
            }
        }
        
        console.log('\n\n');
        
        // 2. 경기장별 성적 완전 분석
        console.log('🏟️ 경기장별 성적 완전 분석');
        console.log('='.repeat(80));
        
        // 경기장 목록 추출
        const stadiums = new Set();
        for (const team of teams) {
            const teamRecords = dashboardData.stadiumRecords[team];
            if (teamRecords) {
                teamRecords.forEach(record => stadiums.add(record.stadium));
            }
        }
        const stadiumList = Array.from(stadiums).sort();
        
        console.log('\n🏆 경기장별 승률 매트릭스 (경기장×팀)');
        console.log('경기장'.padEnd(20), teams.map(team => team.padEnd(8)).join(''));
        console.log('-'.repeat(20 + teams.length * 8));
        
        for (const stadium of stadiumList) {
            process.stdout.write(`${stadium.replace('생명', '').replace('라이온즈파크', 'LP').replace('챔피언스필드', 'CF')}`.padEnd(20));
            
            for (const team of teams) {
                const teamRecords = dashboardData.stadiumRecords[team];
                const stadiumRecord = teamRecords ? teamRecords.find(r => r.stadium === stadium) : null;
                const winRate = stadiumRecord ? (parseFloat(stadiumRecord.win_rate) * 100).toFixed(1) + '%' : '0.0%';
                process.stdout.write(`${winRate}`.padEnd(8));
            }
            console.log();
        }
        
        // 팀별 홈/원정 최고 경기장
        console.log('\n🏠 팀별 경기장 성적 분석');
        console.log('-'.repeat(60));
        
        for (const team of teams) {
            const teamRecords = dashboardData.stadiumRecords[team];
            if (!teamRecords) continue;
            
            // 최소 3경기 이상 치른 경기장만 고려
            const significantRecords = teamRecords.filter(r => (r.wins + r.losses) >= 3);
            
            if (significantRecords.length > 0) {
                const bestStadium = significantRecords.reduce((best, current) => 
                    parseFloat(current.win_rate) > parseFloat(best.win_rate) ? current : best
                );
                const worstStadium = significantRecords.reduce((worst, current) => 
                    parseFloat(current.win_rate) < parseFloat(worst.win_rate) ? current : worst
                );
                
                console.log(`${team}:`);
                console.log(`  🔥 최고: ${bestStadium.stadium} (${bestStadium.wins}승 ${bestStadium.losses}패, ${(parseFloat(bestStadium.win_rate) * 100).toFixed(1)}%)`);
                if (bestStadium.stadium !== worstStadium.stadium) {
                    console.log(`  😰 최악: ${worstStadium.stadium} (${worstStadium.wins}승 ${worstStadium.losses}패, ${(parseFloat(worstStadium.win_rate) * 100).toFixed(1)}%)`);
                }
            }
        }
        
        console.log('\n\n');
        
        // 3. 홈/원정 성적 분석
        console.log('🏡 홈/원정 성적 분석');
        console.log('='.repeat(50));
        
        const homeAwayData = dashboardData.homeAwayStats;
        console.log('팀명'.padEnd(6), '홈승률'.padEnd(10), '원정승률'.padEnd(10), '홈우위'.padEnd(8));
        console.log('-'.repeat(40));
        
        for (const team of teams) {
            const teamData = homeAwayData[team];
            if (teamData) {
                const homeRate = (parseFloat(teamData.home_win_rate) * 100).toFixed(1) + '%';
                const awayRate = (parseFloat(teamData.away_win_rate) * 100).toFixed(1) + '%';
                const advantage = parseFloat(teamData.home_advantage);
                const advantageStr = (advantage > 0 ? '+' : '') + (advantage * 100).toFixed(1) + '%';
                
                console.log(`${team}`.padEnd(6), `${homeRate}`.padEnd(10), `${awayRate}`.padEnd(10), `${advantageStr}`.padEnd(8));
            }
        }
        
        console.log('\n✅ KBO 2025시즌 완전 분석 완료!');
        console.log('📊 요일별, 경기장별, 홈/원정 모든 분석 포함');
        
    } catch (error) {
        console.error('❌ 완전 분석 중 오류:', error.message);
    }
}

if (require.main === module) {
    displayCompleteAnalysis();
}