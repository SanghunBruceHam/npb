#!/usr/bin/env node

/**
 * 매직넘버 정확한 검증 스크립트 (service-data.json 사용)
 */

const fs = require('fs');
const path = require('path');

function verifyMagicNumbersFixed() {
    console.log('🔮 매직넘버 정확한 검증 (service-data.json 기준)...\n');
    
    // service-data.json 읽기 (더 완전한 데이터)
    const serviceDataPath = path.join(__dirname, '..', 'output', 'service-data.json');
    const serviceData = JSON.parse(fs.readFileSync(serviceDataPath, 'utf8'));
    
    console.log('📊 현재 순위 상황:');
    serviceData.standings.slice(0, 5).forEach((team, index) => {
        console.log(`  ${index + 1}위: ${team.team} (${team.wins}-${team.losses}-${team.draws}, .${Math.round(team.winRate * 1000)}, 잔여 ${team.remainingGames}경기)`);
    });
    console.log();
    
    console.log('🎯 매직넘버 상세 분석:\n');
    
    // 각 팀의 매직넘버 분석
    serviceData.standings.forEach((team, index) => {
        const magicData = serviceData.magicNumbers[team.team];
        
        console.log(`${team.team} (${index + 1}위):`);
        console.log(`  현재: ${team.wins}승 ${team.losses}패 ${team.draws}무`);
        console.log(`  잔여경기: ${team.remainingGames}경기`);
        console.log(`  최대가능승수: ${team.wins + team.remainingGames}승`);
        
        if (magicData) {
            console.log(`  📊 매직넘버:`);
            console.log(`    플레이오프: ${magicData.playoff}`);
            console.log(`    우승: ${magicData.championship}`);
            console.log(`    홈어드밴티지: ${magicData.homeAdvantage}`);
            console.log(`    탈락방지: ${magicData.elimination}`);
            
            // 매직넘버 검증
            if (index === 0) {
                // 1위 우승 매직넘버 검증
                const secondPlace = serviceData.standings[1];
                const secondMaxWins = secondPlace.wins + secondPlace.remainingGames;
                const needToWin = Math.max(0, secondMaxWins + 1 - team.wins);
                
                console.log(`    🧮 우승 매직넘버 계산:`);
                console.log(`      2위 ${secondPlace.team} 최대승수: ${secondMaxWins}승`);  
                console.log(`      우승 확정 필요승수: ${needToWin}승`);
                console.log(`      설정값: ${magicData.championship}승`);
                
                if (needToWin === magicData.championship) {
                    console.log(`      ✅ 우승 매직넘버 정확`);
                } else {
                    console.log(`      ❌ 우승 매직넘버 오류: 계산값 ${needToWin} vs 설정값 ${magicData.championship}`);
                }
            }
            
            // 플레이오프 매직넘버 검증
            if (index < 5) {
                console.log(`    ✅ 플레이오프 권 내 (상위 5위)`);
            } else {
                const fifthPlace = serviceData.standings[4];
                const fifthMaxWins = fifthPlace.wins + fifthPlace.remainingGames;
                const maxPossible = team.wins + team.remainingGames;
                
                console.log(`    📊 플레이오프 진출 가능성:`);
                console.log(`      5위 ${fifthPlace.team} 최대승수: ${fifthMaxWins}승`);
                console.log(`      본인 최대승수: ${maxPossible}승`);
                
                if (maxPossible > fifthMaxWins) {
                    console.log(`      ✅ 진출 가능 (${maxPossible - fifthMaxWins}승 여유)`);
                } else if (maxPossible === fifthMaxWins) {
                    console.log(`      ⚡ 동률 가능`);
                } else {
                    console.log(`      ❌ 진출 불가 (${fifthMaxWins - maxPossible}승 부족)`);
                }
            }
        }
        
        console.log();
    });
    
    // 전체 시즌 상황 분석
    console.log('🏆 시즌 전체 상황:');
    console.log(`  총 경기: ${serviceData.totalGames}경기`);
    console.log(`  데이터 날짜: ${serviceData.dataDate}`);
    console.log(`  마지막 업데이트: ${serviceData.lastUpdated}`);
    
    // 시즌 진행률 계산
    const totalSeasonGames = 144; // KBO 정규시즌 총 경기수
    const avgGamesPlayed = serviceData.standings.reduce((sum, team) => sum + team.games, 0) / 10;
    const seasonProgress = (avgGamesPlayed / totalSeasonGames * 100).toFixed(1);
    
    console.log(`  평균 경기수: ${avgGamesPlayed.toFixed(1)}경기`);
    console.log(`  시즌 진행률: ${seasonProgress}%`);
    
    console.log('\\n🔮 매직넘버 검증 완료!');
}

// 실행
verifyMagicNumbersFixed();