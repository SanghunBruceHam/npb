#!/usr/bin/env node

/**
 * 매직넘버 상세 검증 스크립트
 */

const fs = require('fs');
const path = require('path');

function verifyMagicNumbers() {
    console.log('🔮 매직넘버 상세 검증...\n');
    
    // JSON 데이터 읽기
    const rankingsPath = path.join(__dirname, '..', 'magic-number', 'kbo-rankings.json');
    const serviceDataPath = path.join(__dirname, '..', 'output', 'service-data.json');
    
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
    const serviceData = JSON.parse(fs.readFileSync(serviceDataPath, 'utf8'));
    
    console.log('📊 현재 순위 상황:');
    rankings.rankings.slice(0, 5).forEach((team, index) => {
        console.log(`  ${index + 1}위: ${team.team} (${team.wins}-${team.losses}-${team.draws}, .${Math.round(team.winRate * 1000)})`);
    });
    console.log();
    
    console.log('🎯 매직넘버 상세 분석:\n');
    
    // 플레이오프 진출 기준 (5위까지)
    const playoffCutoff = 5;
    
    rankings.rankings.forEach((team, index) => {
        const magicData = serviceData.magicNumbers[team.team];
        
        console.log(`${team.team} (${team.rank}위):`);
        console.log(`  현재: ${team.wins}승 ${team.losses}패 ${team.draws}무`);
        console.log(`  잔여경기: ${team.remainingGames}경기`);
        console.log(`  최대가능승수: ${team.wins + team.remainingGames}승`);
        
        if (magicData) {
            console.log(`  📊 매직넘버:`);
            console.log(`    플레이오프: ${magicData.playoff}`);
            console.log(`    우승: ${magicData.championship}`);
            console.log(`    홈어드밴티지: ${magicData.homeAdvantage}`);
            
            // 플레이오프 매직넘버 수동 계산
            if (team.rank <= playoffCutoff) {
                // 현재 5위 이내 - 자동 진출 또는 매직넘버 계산
                if (team.rank <= 3) {
                    console.log(`    ✅ 상위 3위 - 플레이오프 자동 진출권`);
                } else {
                    console.log(`    🎯 플레이오프 진출권 경쟁 중`);
                }
            } else {
                // 5위 밖 - 진출 가능성 계산
                const currentRank5 = rankings.rankings[4]; // 5위 팀
                const needToPass = currentRank5.wins;
                const maxPossible = team.wins + team.remainingGames;
                
                console.log(`    📈 5위 ${currentRank5.team}을 넘으려면:`);
                console.log(`       5위 현재승수: ${needToPass}승`);
                console.log(`       본인 최대승수: ${maxPossible}승`);
                
                if (maxPossible > needToPass) {
                    console.log(`    ✅ 플레이오프 진출 가능`);
                } else {
                    console.log(`    ❌ 플레이오프 진출 불가능`);
                }
            }
            
            // 우승 매직넘버 검증
            if (team.rank === 1) {
                console.log(`    👑 1위 - 우승 매직넘버 ${magicData.championship}`);
            } else {
                const firstPlace = rankings.rankings[0];
                const gap = firstPlace.wins - team.wins;
                console.log(`    📊 1위와 ${gap}승 차이`);
            }
        }
        
        console.log();
    });
    
    // 매직넘버 계산 로직 검증
    console.log('🧮 매직넘버 계산 로직 검증:');
    
    // 1위 한화의 우승 매직넘버
    const firstPlace = rankings.rankings[0];
    const secondPlace = rankings.rankings[1];
    
    console.log(`\\n👑 ${firstPlace.team} 우승 매직넘버 계산:`);
    console.log(`  현재: ${firstPlace.wins}승 ${firstPlace.losses}패`);
    console.log(`  2위 ${secondPlace.team}: ${secondPlace.wins}승 ${secondPlace.losses}패 (잔여 ${secondPlace.remainingGames}경기)`);
    
    // 2위의 최대 가능 승수
    const secondMaxWins = secondPlace.wins + secondPlace.remainingGames;
    console.log(`  2위 최대 가능 승수: ${secondMaxWins}승`);
    
    // 1위가 우승을 확정짓기 위해 필요한 승수
    const needToWin = secondMaxWins + 1 - firstPlace.wins;
    console.log(`  우승 확정 필요 승수: ${needToWin}승`);
    console.log(`  매직넘버 설정값: ${serviceData.magicNumbers[firstPlace.team].championship}`);
    
    if (needToWin === serviceData.magicNumbers[firstPlace.team].championship) {
        console.log(`  ✅ 우승 매직넘버 정확`);
    } else {
        console.log(`  ❌ 우승 매직넘버 오류: 계산값 ${needToWin} vs 설정값 ${serviceData.magicNumbers[firstPlace.team].championship}`);
    }
    
    console.log('\\n🔮 매직넘버 검증 완료!');
}

// 실행
verifyMagicNumbers();