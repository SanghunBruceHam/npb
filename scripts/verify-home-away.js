#!/usr/bin/env node

/**
 * 홈/원정 기록 검증 스크립트
 */

const fs = require('fs');
const path = require('path');

function verifyHomeAway() {
    console.log('🏠 홈/원정 기록 검증...\n');
    
    // 8월 1일 경기 결과 분석
    const august1Games = [
        { away: 'KIA', home: '한화', winner: 'KIA', loser: '한화' },      // KIA 원정승, 한화 홈패
        { away: '삼성', home: 'LG', winner: 'LG', loser: '삼성' },       // LG 홈승, 삼성 원정패  
        { away: '키움', home: '롯데', winner: '키움', loser: '롯데' },     // 키움 원정승, 롯데 홈패
        { away: '두산', home: 'SSG', winner: 'SSG', loser: '두산' },      // SSG 홈승, 두산 원정패
        { away: 'NC', home: 'KT', winner: 'NC', loser: 'KT' }            // NC 원정승, KT 홈패
    ];
    
    // JSON 데이터 읽기
    const rankingsPath = path.join(__dirname, '..', 'magic-number', 'kbo-rankings.json');
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
    
    console.log('📊 8월 1일 경기로 인한 홈/원정 기록 변화:');
    
    august1Games.forEach(game => {
        console.log(`🏟️ ${game.away} vs ${game.home} → ${game.winner} 승`);
        
        // 승리팀 분석
        const winnerData = rankings.rankings.find(t => t.team === game.winner);
        const loserData = rankings.rankings.find(t => t.team === game.loser);
        
        if (game.winner === game.home) {
            console.log(`  ✅ ${game.winner} 홈승 기록에 반영되어야 함`);
            console.log(`     현재 홈기록: ${winnerData.homeRecord}`);
        } else {
            console.log(`  ✅ ${game.winner} 원정승 기록에 반영되어야 함`);
            console.log(`     현재 원정기록: ${winnerData.awayRecord}`);
        }
        
        if (game.loser === game.home) {
            console.log(`  ❌ ${game.loser} 홈패 기록에 반영되어야 함`);
            console.log(`     현재 홈기록: ${loserData.homeRecord}`);
        } else {
            console.log(`  ❌ ${game.loser} 원정패 기록에 반영되어야 함`);
            console.log(`     현재 원정기록: ${loserData.awayRecord}`);
        }
    });
    
    console.log('🔍 전체 홈/원정 기록 일관성 검증:');
    
    rankings.rankings.forEach(team => {
        const homeMatch = team.homeRecord.match(/(\\d+)-(\\d+)-(\\d+)/);
        const awayMatch = team.awayRecord.match(/(\\d+)-(\\d+)-(\\d+)/);
        
        if (homeMatch && awayMatch) {
            const homeWins = parseInt(homeMatch[1]);
            const homeLosses = parseInt(homeMatch[2]);
            const homeDraws = parseInt(homeMatch[3]);
            
            const awayWins = parseInt(awayMatch[1]);
            const awayLosses = parseInt(awayMatch[2]);
            const awayDraws = parseInt(awayMatch[3]);
            
            const totalWins = homeWins + awayWins;
            const totalLosses = homeLosses + awayLosses;
            const totalDraws = homeDraws + awayDraws;
            const totalGames = totalWins + totalLosses + totalDraws;
            
            console.log(`${team.team}: ${team.games}경기 = 홈${homeWins + homeLosses + homeDraws} + 원정${awayWins + awayLosses + awayDraws}`);
            
            // 검증
            if (totalWins !== team.wins) {
                console.log(`  ❌ 승수 불일치: ${totalWins} vs ${team.wins}`);
            }
            if (totalLosses !== team.losses) {
                console.log(`  ❌ 패수 불일치: ${totalLosses} vs ${team.losses}`);
            }
            if (totalDraws !== team.draws) {
                console.log(`  ❌ 무승부 불일치: ${totalDraws} vs ${team.draws}`);
            }
            if (totalGames !== team.games) {
                console.log(`  ❌ 총경기 불일치: ${totalGames} vs ${team.games}`);
            }
        }
    });
    
    console.log('✅ 홈/원정 기록 검증 완료!');
}

// 실행
verifyHomeAway();