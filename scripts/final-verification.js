#!/usr/bin/env node

/**
 * 최종 데이터 정합성 검증
 */

const fs = require('fs');
const path = require('path');

function finalVerification() {
    console.log('🔍 최종 데이터 정합성 검증\n');
    
    // JSON 데이터 읽기
    const rankingsPath = path.join(__dirname, '..', 'magic-number', 'kbo-rankings.json');
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
    
    console.log('📊 모든 팀 상세 검증:\n');
    
    rankings.rankings.forEach((team, index) => {
        console.log(`${index + 1}. ${team.team}`);
        console.log(`   경기: ${team.games}, 승패무: ${team.wins}-${team.losses}-${team.draws}`);
        
        // 홈/원정 합계 계산
        const homeMatch = team.homeRecord.match(/(\d+)-(\d+)-(\d+)/);
        const awayMatch = team.awayRecord.match(/(\d+)-(\d+)-(\d+)/);
        
        if (homeMatch && awayMatch) {
            const homeWins = parseInt(homeMatch[1]);
            const homeLosses = parseInt(homeMatch[2]);
            const homeDraws = parseInt(homeMatch[3]);
            const homeTotal = homeWins + homeLosses + homeDraws;
            
            const awayWins = parseInt(awayMatch[1]);
            const awayLosses = parseInt(awayMatch[2]);
            const awayDraws = parseInt(awayMatch[3]);
            const awayTotal = awayWins + awayLosses + awayDraws;
            
            const totalWins = homeWins + awayWins;
            const totalLosses = homeLosses + awayLosses;
            const totalDraws = homeDraws + awayDraws;
            const grandTotal = totalWins + totalLosses + totalDraws;
            
            console.log(`   홈: ${team.homeRecord} (${homeTotal}경기)`);
            console.log(`   원정: ${team.awayRecord} (${awayTotal}경기)`);
            console.log(`   합계 검증: ${totalWins}-${totalLosses}-${totalDraws} (${grandTotal}경기)`);
            
            // 일관성 검증
            let hasError = false;
            if (totalWins !== team.wins) {
                console.log(`   ❌ 승수 오류: ${totalWins} ≠ ${team.wins}`);
                hasError = true;
            }
            if (totalLosses !== team.losses) {
                console.log(`   ❌ 패수 오류: ${totalLosses} ≠ ${team.losses}`);
                hasError = true;
            }
            if (totalDraws !== team.draws) {
                console.log(`   ❌ 무승부 오류: ${totalDraws} ≠ ${team.draws}`);
                hasError = true;
            }
            if (grandTotal !== team.games) {
                console.log(`   ❌ 총경기 오류: ${grandTotal} ≠ ${team.games}`);
                hasError = true;
            }
            
            if (!hasError) {
                console.log(`   ✅ 홈/원정 합계 일치`);
            }
        }
        
        // 승률 검증
        const calculatedWinRate = team.wins / (team.wins + team.losses);
        const diff = Math.abs(calculatedWinRate - team.winRate);
        if (diff > 0.001) {
            console.log(`   ❌ 승률 오류: ${calculatedWinRate.toFixed(3)} ≠ ${team.winRate.toFixed(3)}`);
        } else {
            console.log(`   ✅ 승률 정확: ${team.winRate.toFixed(3)}`);
        }
        
        console.log(`   연속: ${team.streak}, 최근10: ${team.recent10}`);
        console.log();
    });
    
    // 전체 경기수 검증
    const totalGames = rankings.rankings.reduce((sum, team) => sum + team.games, 0);
    console.log(`🎮 전체 경기 합계: ${totalGames}경기 (각 경기는 2팀이 참여하므로 실제 경기수는 ${totalGames/2}경기)`);
    
    // 8월 1일 데이터가 정상 반영되었는지 확인
    console.log(`\n📅 데이터 날짜: ${rankings.dataDate}`);
    console.log(`🕐 마지막 업데이트: ${rankings.lastUpdated}`);
    
    if (rankings.dataDate === '2025-08-01') {
        console.log('✅ 8월 1일 데이터 정상 반영됨');
    } else {
        console.log('❌ 8월 1일 데이터 누락');
    }
    
    console.log('\n🎯 검증 완료!');
}

// 실행
finalVerification();