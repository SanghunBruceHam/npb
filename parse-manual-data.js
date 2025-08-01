#!/usr/bin/env node

// 제공된 데이터를 파싱하여 홈/어웨이 전적 생성
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

// 제공된 데이터 (일부 샘플)
const manualData = `
03.22(토)    14:00    롯데2vs12LG    리뷰    하이라이트    K-2T        잠실    -
14:00    두산5vs6SSG    리뷰    하이라이트    MS-T SPO-T SPO-2T        문학    -
14:00    키움5vs13삼성    리뷰    하이라이트    SS-T KN-T        대구    -
14:00    한화4vs3KT    리뷰    하이라이트    S-T        수원    -
14:00    NC2vs9KIA    리뷰    하이라이트    M-T        광주    -
03.23(일)    14:00    롯데2vs10LG    리뷰    하이라이트    KN-T        잠실    -
14:00    두산2vs5SSG    리뷰    하이라이트    SPO-T        문학    -
14:00    키움7vs11삼성    리뷰    하이라이트    SPO-2T        대구    -
14:00    한화4vs5KT    리뷰    하이라이트    MS-T        수원    -
14:00    NC5vs4KIA    리뷰    하이라이트    SS-T        광주    -
07.29(화)    18:30    KT2vs8LG    리뷰    하이라이트    MS-T        잠실    -
18:30    키움3vs9SSG    리뷰    하이라이트    SPO-T        문학    -
18:30    NC4vs6롯데    리뷰    하이라이트    SS-T        사직    -
18:30    두산9vs6KIA    리뷰    하이라이트    KN-T        광주    -
18:30    삼성9vs2한화    리뷰    하이라이트    SPO-2T        대전    -
07.30(수)    18:30    KT0vs5LG    리뷰    하이라이트    MS-T        잠실    -
18:30    키움5vs5SSG    리뷰    하이라이트    SPO-T        문학    -
18:30    NC9vs4롯데    리뷰    하이라이트    SS-T        사직    -
18:30    두산2vs2KIA    리뷰    하이라이트    KN-T        광주    -
18:30    삼성0vs5한화    리뷰    하이라이트    SPO-2T        대전    -
07.31(목)    18:30    KT0vs18LG    리뷰    하이라이트    MS-T        잠실    -
18:30    키움2vs4SSG    리뷰    하이라이트    SPO-T        문학    -
18:30    NC5vs11롯데    리뷰    하이라이트    SS-T        사직    -
18:30    두산2vs3KIA    리뷰    하이라이트    KN-T        광주    -
18:30    삼성1vs7한화    리뷰    하이라이트    SPO-2T        대전    -
`;

// 경기장으로 홈팀 매핑
const stadiumToHome = {
    '잠실': ['LG', '두산'],
    '문학': 'SSG',
    '대구': '삼성',
    '수원': 'KT',
    '광주': 'KIA',
    '사직': '롯데',
    '고척': '키움',
    '대전': '한화',
    '창원': 'NC',
    '울산': 'NC',
    '포항': '삼성'
};

// 데이터 파싱
function parseManualData(data) {
    const lines = data.trim().split('\n');
    let gameCount = 0;
    
    lines.forEach(line => {
        // 경기 결과 패턴: 팀명숫자vs숫자팀명
        const gameMatch = line.match(/(\S+?)(\d+)vs(\d+)(\S+?)\s+리뷰.*\s+(\S+)\s+-$/);
        
        if (gameMatch) {
            const awayTeam = gameMatch[1];
            const awayScore = parseInt(gameMatch[2]);
            const homeScore = parseInt(gameMatch[3]);
            const homeTeamFromScore = gameMatch[4];
            const stadium = gameMatch[5];
            
            // 경기장으로 홈팀 확인
            let homeTeam = null;
            if (Array.isArray(stadiumToHome[stadium])) {
                // 잠실의 경우 LG/두산 구분
                homeTeam = stadiumToHome[stadium].find(team => 
                    homeTeamFromScore.includes(team) || team === homeTeamFromScore
                );
            } else {
                homeTeam = stadiumToHome[stadium];
            }
            
            if (homeTeam && TEAM_MAPPING[homeTeam] && TEAM_MAPPING[awayTeam]) {
                gameCount++;
                
                // 홈팀 기준 기록
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
                
                console.log(`✅ ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam} (${stadium})`);
            }
        }
    });
    
    console.log(`\n📊 총 ${gameCount}경기 처리 완료`);
}

// 실행
console.log('🏟️ 수동 데이터 파싱 시작...');
parseManualData(manualData);

// 결과 저장
const dataDir = './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 저장
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

console.log('📊 KBO 홈/어웨이 상대전적 데이터 로드 완료');
`;

fs.writeFileSync('./kbo-records.js', jsContent);

console.log('\n💾 데이터 저장 완료:');
console.log('   - data/home-away-records.json');
console.log('   - data/last-update-date.json');
console.log('   - kbo-records.json');
console.log('   - kbo-records.js');

// 간단한 통계 출력
console.log('\n📈 홈/어웨이 전적 요약:');
Object.keys(homeAwayRecords).forEach(team => {
    let homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
    
    Object.keys(homeAwayRecords[team]).forEach(opponent => {
        homeWins += homeAwayRecords[team][opponent].home.wins;
        homeLosses += homeAwayRecords[team][opponent].home.losses;
        awayWins += homeAwayRecords[team][opponent].away.wins;
        awayLosses += homeAwayRecords[team][opponent].away.losses;
    });
    
    console.log(`${team}: 홈 ${homeWins}승 ${homeLosses}패, 원정 ${awayWins}승 ${awayLosses}패`);
});