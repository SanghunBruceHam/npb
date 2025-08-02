#!/usr/bin/env node

/**
 * 최근10경기 상세 검증
 */

const fs = require('fs');
const path = require('path');

function verifyRecent10Detailed() {
    console.log('🔍 최근10경기 상세 검증...\n');
    
    // 데이터 파일 읽기
    const dataPath = path.join(__dirname, '..', 'data', '2025-season-data-clean.txt');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    
    // 경기 파싱
    const games = [];
    const lines = rawData.split('\n').filter(line => line.trim());
    
    let currentDate = null;
    for (const line of lines) {
        if (line.match(/^\d{4}-\d{2}-\d{2}$/)) {
            currentDate = line;
        } else if (line.includes(':') && line.includes('(H)') && currentDate) {
            const match = line.match(/^(.+?)\s+(\d+):(\d+)\s+(.+?)\(H\)$/);
            if (match) {
                const awayTeam = match[1].trim();
                const awayScore = parseInt(match[2]);
                const homeScore = parseInt(match[3]);
                const homeTeam = match[4].trim();
                
                games.push({
                    date: currentDate,
                    awayTeam,
                    homeTeam,
                    awayScore,
                    homeScore,
                    winner: homeScore > awayScore ? homeTeam : awayTeam,
                    loser: homeScore > awayScore ? awayTeam : homeTeam,
                    isDraw: homeScore === awayScore
                });
            }
        }
    }
    
    console.log(`📊 총 ${games.length}경기 파싱 완료\n`);
    
    // 한화 팀 상세 분석 (예시)
    const team = '한화';
    console.log(`🔥 ${team} 최근10경기 상세 분석:`);
    
    const teamGames = games.filter(game => 
        game.awayTeam === team || game.homeTeam === team
    );
    
    console.log(`  전체 ${teamGames.length}경기 중 최근 10경기:`);
    
    const recent10Games = teamGames.slice(-10);
    recent10Games.forEach((game, idx) => {
        const result = game.isDraw ? '무' : 
                      game.winner === team ? '승' : '패';
        const opponent = game.awayTeam === team ? game.homeTeam : game.awayTeam;
        const score = `${game.awayScore}:${game.homeScore}`;
        const homeAway = game.awayTeam === team ? '원정' : '홈';
        
        console.log(`    ${idx + 1}. ${game.date}: ${result} vs ${opponent} (${score}, ${homeAway})`);
    });
    
    // 통계 계산
    const wins = recent10Games.filter(g => g.winner === team && !g.isDraw).length;
    const draws = recent10Games.filter(g => g.isDraw).length;
    const losses = recent10Games.filter(g => g.loser === team && !g.isDraw).length;
    
    console.log(`\n  📊 계산된 통계: ${wins}승${draws > 0 ? draws + '무' : ''}${losses}패`);
    
    // JSON과 비교
    const rankingsPath = path.join(__dirname, '..', 'magic-number', 'kbo-rankings.json');
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
    const teamData = rankings.rankings.find(t => t.team === team);
    
    if (teamData) {
        console.log(`  🔍 JSON 통계: ${teamData.recent10}`);
        console.log(`  🔍 JSON 연속: ${teamData.streak}`);
        
        // 연속 계산
        let currentStreak = 0;
        let streakType = '';
        
        for (let i = recent10Games.length - 1; i >= 0; i--) {
            const game = recent10Games[i];
            const result = game.isDraw ? '무' : 
                          game.winner === team ? '승' : '패';
            
            if (currentStreak === 0) {
                currentStreak = 1;
                streakType = result;
            } else if (result === streakType) {
                currentStreak++;
            } else {
                break;
            }
        }
        
        console.log(`  📊 계산된 연속: ${currentStreak}${streakType}`);
        
        const calculatedRecent10 = `${wins}승${draws > 0 ? draws + '무' : ''}${losses}패`;
        const calculatedStreak = `${currentStreak}${streakType}`;
        
        if (teamData.recent10 !== calculatedRecent10) {
            console.log(`  ❌ 최근10 불일치: 계산 ${calculatedRecent10} vs JSON ${teamData.recent10}`);
        } else {
            console.log(`  ✅ 최근10 일치`);
        }
        
        if (teamData.streak !== calculatedStreak) {
            console.log(`  ❌ 연속 불일치: 계산 ${calculatedStreak} vs JSON ${teamData.streak}`);
        } else {
            console.log(`  ✅ 연속 일치`);
        }
    }
    
    // 다른 몇 팀도 간단히 체크
    console.log('\n🔍 다른 팀들 간단 체크:');
    const teamsToCheck = ['LG', 'KIA', 'SSG', '두산', '키움'];
    
    teamsToCheck.forEach(checkTeam => {
        const checkTeamGames = games.filter(game => 
            game.awayTeam === checkTeam || game.homeTeam === checkTeam
        ).slice(-10);
        
        const checkWins = checkTeamGames.filter(g => g.winner === checkTeam && !g.isDraw).length;
        const checkDraws = checkTeamGames.filter(g => g.isDraw).length;
        const checkLosses = checkTeamGames.filter(g => g.loser === checkTeam && !g.isDraw).length;
        
        const checkTeamData = rankings.rankings.find(t => t.team === checkTeam);
        const calculatedCheck = `${checkWins}승${checkDraws > 0 ? checkDraws + '무' : ''}${checkLosses}패`;
        
        if (checkTeamData && checkTeamData.recent10 !== calculatedCheck) {
            console.log(`  ❌ ${checkTeam}: 계산 ${calculatedCheck} vs JSON ${checkTeamData.recent10}`);
        } else {
            console.log(`  ✅ ${checkTeam}: 일치`);
        }
    });
}

// 실행
verifyRecent10Detailed();