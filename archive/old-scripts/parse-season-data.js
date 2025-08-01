#!/usr/bin/env node

const fs = require('fs');

const TEAM_MAPPING = {
    'KT': 'KT',
    'LG': 'LG', 
    '키움': '키움',
    'SSG': 'SSG',
    'NC': 'NC',
    '롯데': '롯데',
    '두산': '두산',
    'KIA': 'KIA',
    '삼성': '삼성',
    '한화': '한화'
};

// 홈/어웨이 기록 초기화
const homeAwayRecords = {};
Object.keys(TEAM_MAPPING).forEach(homeTeam => {
    homeAwayRecords[homeTeam] = {};
    Object.keys(TEAM_MAPPING).forEach(awayTeam => {
        if (homeTeam !== awayTeam) {
            homeAwayRecords[homeTeam][awayTeam] = {
                home: { wins: 0, losses: 0, draws: 0 },
                away: { wins: 0, losses: 0, draws: 0 }
            };
        }
    });
});

// 파일 읽기
function parseSeasonData() {
    console.log('📊 2025 시즌 데이터 파싱 시작...');
    
    const data = fs.readFileSync('./2025-season-data.txt', 'utf8');
    const lines = data.split('\n');
    
    let currentDate = '';
    let gameCount = 0;
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // 날짜 패턴 확인 (예: "3월 22일 (토)")
        if (line.match(/^\d+월 \d+일/)) {
            currentDate = line;
            i++;
            continue;
        }
        
        // 경기 정보 파싱
        if (line === '경기 시간14:00' || line === '경기 시간17:00' || line === '경기 시간18:00' || line === '경기 시간18:30') {
            // 경기장 확인
            i++;
            if (i < lines.length && lines[i].startsWith('경기장')) {
                const stadium = lines[i].replace('경기장', '').trim();
                i++;
                
                // 종료 확인
                if (i < lines.length && lines[i].trim() === '종료') {
                    i += 2; // 빈 줄 스킵
                    
                    // 원정팀 정보
                    const awayTeam = lines[i]?.trim();
                    i++;
                    const awayResult = lines[i]?.trim(); // 승/패/무
                    i += 2; // 투수 정보 스킵
                    i++; // "스코어" 스킵
                    const awayScore = parseInt(lines[i]?.trim() || '0');
                    i += 2; // 빈 줄 스킵
                    
                    // 홈팀 정보
                    const homeTeam = lines[i]?.trim();
                    i += 2; // "홈" 스킵
                    const homeResult = lines[i]?.trim(); // 승/패/무
                    i += 2; // 투수 정보 스킵
                    i++; // "스코어" 스킵
                    const homeScore = parseInt(lines[i]?.trim() || '0');
                    
                    // 유효성 검사
                    if (TEAM_MAPPING[awayTeam] && TEAM_MAPPING[homeTeam] && 
                        !isNaN(awayScore) && !isNaN(homeScore)) {
                        gameCount++;
                        
                        // 홈팀 기준 기록 업데이트
                        if (homeScore > awayScore) {
                            homeAwayRecords[homeTeam][awayTeam].home.wins++;
                            homeAwayRecords[awayTeam][homeTeam].away.losses++;
                        } else if (awayScore > homeScore) {
                            homeAwayRecords[homeTeam][awayTeam].home.losses++;
                            homeAwayRecords[awayTeam][homeTeam].away.wins++;
                        } else {
                            homeAwayRecords[homeTeam][awayTeam].home.draws++;
                            homeAwayRecords[awayTeam][homeTeam].away.draws++;
                        }
                        
                        console.log(`✅ ${currentDate}: ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam} (${stadium})`);
                    }
                }
            }
        }
        
        i++;
    }
    
    console.log(`\n🎯 총 ${gameCount}경기 처리 완료`);
    return gameCount;
}

// 실행
const totalGames = parseSeasonData();

// 데이터 저장
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 홈/어웨이 기록 저장
fs.writeFileSync('./data/home-away-records.json', JSON.stringify(homeAwayRecords, null, 2));
fs.writeFileSync('./data/last-update-date.json', JSON.stringify({
    lastUpdate: '2025-07-31',
    timestamp: new Date().toISOString()
}, null, 2));

// headToHeadData 형식으로 변환
const combinedData = {};
Object.keys(homeAwayRecords).forEach(team1 => {
    combinedData[team1] = {};
    Object.keys(homeAwayRecords[team1]).forEach(team2 => {
        const record = homeAwayRecords[team1][team2];
        const totalWins = record.home.wins + record.away.wins;
        const totalLosses = record.home.losses + record.away.losses;
        const totalDraws = record.home.draws + record.away.draws;
        
        combinedData[team1][team2] = {
            wins: totalWins,
            losses: totalLosses,
            draws: totalDraws
        };
    });
});

// 최종 데이터 구조
const finalData = {
    lastUpdated: new Date().toISOString(),
    updateDate: '2025. 7. 31.',
    totalData: combinedData,
    homeAwayBreakdown: homeAwayRecords
};

// JSON 파일 저장
fs.writeFileSync('./kbo-records.json', JSON.stringify(finalData, null, 2));

// JavaScript 파일 저장
const jsContent = `// KBO 2025 홈/어웨이 상대전적 데이터 (자동 생성)
// 마지막 업데이트: ${finalData.lastUpdated}

const headToHeadData = ${JSON.stringify(finalData.totalData, null, 4)};

const homeAwayRecords = ${JSON.stringify(finalData.homeAwayBreakdown, null, 4)};

// 홈/어웨이 구분 전적 가져오기 함수
function getHomeAwayRecord(team1, team2, isHome = true) {
    if (!homeAwayRecords[team1] || !homeAwayRecords[team1][team2]) {
        return null;
    }
    
    const record = homeAwayRecords[team1][team2][isHome ? 'home' : 'away'];
    return \`\${record.wins}-\${record.losses}-\${record.draws}\`;
}

// 홈에서의 승률 계산
function getHomeWinRate(team1, team2) {
    if (!homeAwayRecords[team1] || !homeAwayRecords[team1][team2]) {
        return 0;
    }
    
    const record = homeAwayRecords[team1][team2].home;
    const totalGames = record.wins + record.losses;
    return totalGames > 0 ? (record.wins / totalGames) : 0.5;
}

// 원정에서의 승률 계산
function getAwayWinRate(team1, team2) {
    if (!homeAwayRecords[team1] || !homeAwayRecords[team1][team2]) {
        return 0;
    }
    
    const record = homeAwayRecords[team1][team2].away;
    const totalGames = record.wins + record.losses;
    return totalGames > 0 ? (record.wins / totalGames) : 0.5;
}

console.log('📊 KBO 홈/어웨이 상대전적 데이터 로드 완료');
`;

fs.writeFileSync('./kbo-records.js', jsContent);

console.log('\n💾 데이터 저장 완료:');
console.log('   - data/home-away-records.json');
console.log('   - data/last-update-date.json');
console.log('   - kbo-records.json');
console.log('   - kbo-records.js');

// 통계 출력
console.log('\n📈 팀별 홈/어웨이 전적 요약:');
console.log('=' .repeat(60));
Object.keys(homeAwayRecords).forEach(team => {
    let homeWins = 0, homeLosses = 0, homeDraws = 0;
    let awayWins = 0, awayLosses = 0, awayDraws = 0;
    
    Object.keys(homeAwayRecords[team]).forEach(opponent => {
        homeWins += homeAwayRecords[team][opponent].home.wins;
        homeLosses += homeAwayRecords[team][opponent].home.losses;
        homeDraws += homeAwayRecords[team][opponent].home.draws;
        awayWins += homeAwayRecords[team][opponent].away.wins;
        awayLosses += homeAwayRecords[team][opponent].away.losses;
        awayDraws += homeAwayRecords[team][opponent].away.draws;
    });
    
    const homeRate = homeWins + homeLosses > 0 ? (homeWins / (homeWins + homeLosses) * 100).toFixed(1) : '0.0';
    const awayRate = awayWins + awayLosses > 0 ? (awayWins / (awayWins + awayLosses) * 100).toFixed(1) : '0.0';
    
    console.log(`${team.padEnd(4)}: 홈 ${homeWins}승 ${homeLosses}패 ${homeDraws}무 (${homeRate}%) | 원정 ${awayWins}승 ${awayLosses}패 ${awayDraws}무 (${awayRate}%)`);
});
console.log('=' .repeat(60));

console.log(`\n✅ 전체 ${totalGames}경기 데이터 처리 완료!`);