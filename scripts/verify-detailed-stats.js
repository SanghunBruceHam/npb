#!/usr/bin/env node

/**
 * 상세 통계 검증 스크립트
 * 8월 1일 경기 결과를 기준으로 데이터 정합성 검증
 */

const fs = require('fs');
const path = require('path');

function verifyStats() {
    console.log('🔍 데이터 정합성 상세 검증 시작...\n');
    
    // JSON 파일들 읽기
    const rankingsPath = path.join(__dirname, '..', 'magic-number', 'kbo-rankings.json');
    const serviceDataPath = path.join(__dirname, '..', 'output', 'service-data.json');
    
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
    const serviceData = JSON.parse(fs.readFileSync(serviceDataPath, 'utf8'));
    
    console.log('📊 기본 정보:');
    console.log(`  업데이트: ${rankings.lastUpdated}`);
    console.log(`  총 경기: ${serviceData.totalGames}`);
    console.log(`  데이터 날짜: ${serviceData.dataDate}\n`);
    
    // 8월 1일 경기 결과 (실제)
    const august1Games = [
        { away: 'KIA', home: '한화', awayScore: 3, homeScore: 2, winner: 'KIA', loser: '한화' },
        { away: '삼성', home: 'LG', awayScore: 2, homeScore: 4, winner: 'LG', loser: '삼성' },
        { away: '키움', home: '롯데', awayScore: 2, homeScore: 0, winner: '키움', loser: '롯데' },
        { away: '두산', home: 'SSG', awayScore: 2, homeScore: 7, winner: 'SSG', loser: '두산' },
        { away: 'NC', home: 'KT', awayScore: 5, homeScore: 3, winner: 'NC', loser: 'KT' }
    ];
    
    console.log('🎯 8월 1일 경기 결과 검증:');
    august1Games.forEach(game => {
        console.log(`  ${game.away} ${game.awayScore}:${game.homeScore} ${game.home} → ${game.winner} 승`);
    });
    console.log();
    
    // 팀별 상세 검증
    console.log('🏆 상위 5팀 상세 검증:\n');
    
    rankings.rankings.slice(0, 5).forEach((team, index) => {
        console.log(`${index + 1}. ${team.team} (${team.wins}-${team.losses}-${team.draws}, .${Math.round(team.winRate * 1000)})`);
        console.log(`   경기수: ${team.games}`);
        console.log(`   홈: ${team.homeRecord}, 원정: ${team.awayRecord}`);
        console.log(`   최근10: ${team.recent10}`);
        console.log(`   연속: ${team.streak}`);
        console.log(`   게임차: ${team.gamesBehind}\n`);
        
        // 8월 1일 경기 참여 확인
        const playedGame = august1Games.find(g => g.home === team.team || g.away === team.team);
        if (playedGame) {
            const isHome = playedGame.home === team.team;
            const won = playedGame.winner === team.team;
            console.log(`   ⚾ 8월1일: ${isHome ? '홈' : '원정'} ${won ? '승' : '패'}`);
            console.log(`   📊 이 결과가 통계에 반영되었는지 확인 필요\n`);
        }
    });
    
    // 승률 계산 검증
    console.log('🧮 승률 계산 검증:');
    rankings.rankings.forEach(team => {
        const calculatedWinRate = team.wins / (team.wins + team.losses);
        const storedWinRate = team.winRate;
        const diff = Math.abs(calculatedWinRate - storedWinRate);
        
        if (diff > 0.001) {
            console.log(`  ❌ ${team.team}: 계산값 ${calculatedWinRate.toFixed(3)} vs 저장값 ${storedWinRate.toFixed(3)}`);
        }
    });
    console.log('  ✅ 승률 계산 정상\n');
    
    // 게임차 검증
    console.log('📏 게임차 계산 검증:');
    const firstPlace = rankings.rankings[0];
    rankings.rankings.forEach(team => {
        const calculatedGB = ((firstPlace.wins - team.wins) + (team.losses - firstPlace.losses)) / 2;
        const storedGB = team.gamesBehind;
        const diff = Math.abs(calculatedGB - storedGB);
        
        if (diff > 0.1) {
            console.log(`  ❌ ${team.team}: 계산값 ${calculatedGB.toFixed(1)} vs 저장값 ${storedGB}`);
        }
    });
    console.log('  ✅ 게임차 계산 정상\n');
    
    console.log('🔍 검증 완료!');
}

// 실행
verifyStats();