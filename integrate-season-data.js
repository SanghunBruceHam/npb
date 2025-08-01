#!/usr/bin/env node

/**
 * 과거 시즌 데이터와 오늘 경기 결과를 통합하여 상대전적을 계산하는 스크립트
 * 1. 2025-season-data.txt에서 과거 데이터 로드
 * 2. 웹에서 오늘 경기 결과 스크래핑
 * 3. 통합하여 최신 상대전적 계산
 */

const fs = require('fs');
const https = require('https');

// KBO 팀 매핑
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

class IntegratedKBOData {
    constructor() {
        this.homeAwayRecords = {};
        this.initializeRecords();
    }

    initializeRecords() {
        // 모든 팀 조합에 대해 홈/어웨이 기록 초기화
        Object.keys(TEAM_MAPPING).forEach(homeTeam => {
            this.homeAwayRecords[homeTeam] = {};
            Object.keys(TEAM_MAPPING).forEach(awayTeam => {
                if (homeTeam !== awayTeam) {
                    this.homeAwayRecords[homeTeam][awayTeam] = {
                        home: { wins: 0, losses: 0, draws: 0 },
                        away: { wins: 0, losses: 0, draws: 0 }
                    };
                }
            });
        });
    }

    // 과거 시즌 데이터 파싱 (2025-season-data.txt)
    parseHistoricalData() {
        console.log('📊 과거 시즌 데이터 파싱 시작...');
        
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
                                this.homeAwayRecords[homeTeam][awayTeam].home.wins++;
                                this.homeAwayRecords[awayTeam][homeTeam].away.losses++;
                            } else if (awayScore > homeScore) {
                                this.homeAwayRecords[homeTeam][awayTeam].home.losses++;
                                this.homeAwayRecords[awayTeam][homeTeam].away.wins++;
                            } else {
                                this.homeAwayRecords[homeTeam][awayTeam].home.draws++;
                                this.homeAwayRecords[awayTeam][homeTeam].away.draws++;
                            }
                            
                            console.log(`✅ ${currentDate}: ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam} (${stadium})`);
                        }
                    }
                }
            }
            
            i++;
        }
        
        console.log(`🎯 과거 데이터 ${gameCount}경기 처리 완료`);
        return gameCount;
    }

    // 오늘 경기 결과 스크래핑
    async fetchTodayGames() {
        console.log('🔄 오늘 경기 결과 스크래핑 시작...');
        
        const today = new Date();
        const dateString = today.toISOString().split('T')[0].replace(/-/g, '');
        
        try {
            const html = await this.fetchScoreboardData(dateString);
            const games = this.parseGameResults(html, dateString);
            
            if (games.length > 0) {
                console.log(`📅 오늘(${dateString}) ${games.length}경기 발견`);
                this.updateRecords(games);
                return games.length;
            } else {
                console.log('📅 오늘 완료된 경기가 없습니다.');
                return 0;
            }
        } catch (error) {
            console.log(`❌ 오늘 경기 데이터 가져오기 실패: ${error.message}`);
            return 0;
        }
    }

    async fetchScoreboardData(date) {
        return new Promise((resolve, reject) => {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?seriesId=1&gameDate=${date}`;
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive'
                }
            };
            
            const req = https.get(url, options, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error(`요청 타임아웃: ${date}`));
            });
        });
    }

    parseGameResults(html, gameDate) {
        const games = [];
        
        try {
            if (html.length < 1000) {
                console.log(`   ⚠️ ${gameDate}: HTML이 너무 짧음 (${html.length}자)`);
                return games;
            }
            
            // 경기종료 확인
            const gameFinishedRegex = /경기종료/g;
            const gameFinishedCount = (html.match(gameFinishedRegex) || []).length;
            
            if (gameFinishedCount === 0) {
                console.log(`   📅 ${gameDate}: 완료된 경기 없음`);
                return games;
            }
            
            console.log(`   🔍 ${gameDate}: ${gameFinishedCount}개 경기종료 발견`);
            
            // 각 경기종료 위치를 찾아서 주변의 팀명과 점수 추출
            let match;
            gameFinishedRegex.lastIndex = 0;
            while ((match = gameFinishedRegex.exec(html)) !== null) {
                const finishedIndex = match.index;
                
                const startPos = Math.max(0, finishedIndex - 1000);
                const endPos = Math.min(html.length, finishedIndex + 500);
                const gameSection = html.substring(startPos, endPos);
                
                // 팀명 추출
                const teamMatches = gameSection.match(/<strong class='teamT'>([^<]+)<\/strong>/g);
                const teams = teamMatches ? teamMatches.map(m => 
                    m.replace(/<strong class='teamT'>([^<]+)<\/strong>/, '$1').trim()
                ) : [];
                
                // 점수 추출
                const awayScoreMatch = gameSection.match(/lblAwayTeamScore_\d+">(\d+)<\/span>/);
                const homeScoreMatch = gameSection.match(/lblHomeTeamScore_\d+">(\d+)<\/span>/);
                
                const awayScore = awayScoreMatch ? parseInt(awayScoreMatch[1]) : null;
                const homeScore = homeScoreMatch ? parseInt(homeScoreMatch[1]) : null;
                
                if (teams.length === 2 && awayScore !== null && homeScore !== null) {
                    const awayTeam = teams[0];
                    const homeTeam = teams[1];
                    
                    if (Object.keys(TEAM_MAPPING).includes(awayTeam) && 
                        Object.keys(TEAM_MAPPING).includes(homeTeam)) {
                        
                        const isDuplicate = games.some(game => 
                            game.awayTeam === awayTeam && 
                            game.homeTeam === homeTeam &&
                            game.date === gameDate
                        );
                        
                        if (!isDuplicate) {
                            games.push({
                                date: gameDate,
                                awayTeam,
                                homeTeam,
                                awayScore,
                                homeScore,
                                result: awayScore > homeScore ? 'away_win' : 
                                       homeScore > awayScore ? 'home_win' : 'draw'
                            });
                            console.log(`      ✅ ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam}`);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log(`   ❌ ${gameDate} 파싱 오류: ${error.message}`);
        }
        
        return games;
    }

    updateRecords(games) {
        games.forEach(game => {
            const { homeTeam, awayTeam, result } = game;
            
            if (!this.homeAwayRecords[homeTeam] || !this.homeAwayRecords[awayTeam]) {
                return;
            }
            
            // 홈팀 기준 기록 업데이트
            if (result === 'home_win') {
                this.homeAwayRecords[homeTeam][awayTeam].home.wins++;
                this.homeAwayRecords[awayTeam][homeTeam].away.losses++;
            } else if (result === 'away_win') {
                this.homeAwayRecords[homeTeam][awayTeam].home.losses++;
                this.homeAwayRecords[awayTeam][homeTeam].away.wins++;
            } else if (result === 'draw') {
                this.homeAwayRecords[homeTeam][awayTeam].home.draws++;
                this.homeAwayRecords[awayTeam][homeTeam].away.draws++;
            }
        });
    }

    // 상대전적 결과 출력
    displayHeadToHeadResults() {
        console.log('\n📈 팀별 상대전적 매트릭스:');
        console.log('=' .repeat(120));
        
        const teams = Object.keys(TEAM_MAPPING);
        
        // 헤더 출력
        console.log('   vs  |' + teams.map(team => team.padStart(8)).join('|'));
        console.log('-------|' + teams.map(() => '--------').join('|'));
        
        // 각 팀별 상대전적 출력
        teams.forEach(team1 => {
            let row = team1.padEnd(6) + ' |';
            teams.forEach(team2 => {
                if (team1 === team2) {
                    row += '    -   |';
                } else {
                    const record = this.homeAwayRecords[team1][team2];
                    const totalWins = record.home.wins + record.away.wins;
                    const totalLosses = record.home.losses + record.away.losses;
                    const totalDraws = record.home.draws + record.away.draws;
                    row += `${totalWins}-${totalLosses}-${totalDraws}`.padStart(7) + ' |';
                }
            });
            console.log(row);
        });
        
        console.log('=' .repeat(120));
    }

    // 홈/어웨이 구분 상대전적 출력
    displayHomeAwayBreakdown() {
        console.log('\n🏟️ 홈/어웨이 구분 상대전적:');
        console.log('=' .repeat(80));
        
        Object.keys(TEAM_MAPPING).forEach(team => {
            console.log(`\n${team} 상대전적:`);
            console.log('-'.repeat(50));
            
            Object.keys(this.homeAwayRecords[team]).forEach(opponent => {
                const record = this.homeAwayRecords[team][opponent];
                const homeRecord = `${record.home.wins}-${record.home.losses}-${record.home.draws}`;
                const awayRecord = `${record.away.wins}-${record.away.losses}-${record.away.draws}`;
                
                console.log(`  vs ${opponent.padEnd(4)}: 홈 ${homeRecord.padEnd(7)} | 원정 ${awayRecord.padEnd(7)}`);
            });
        });
    }

    // 데이터 저장
    saveIntegratedData() {
        // headToHeadData 형식으로 변환
        const combinedData = {};
        Object.keys(this.homeAwayRecords).forEach(team1 => {
            combinedData[team1] = {};
            Object.keys(this.homeAwayRecords[team1]).forEach(team2 => {
                const record = this.homeAwayRecords[team1][team2];
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
            updateDate: new Date().toLocaleDateString('ko-KR'),
            totalData: combinedData,
            homeAwayBreakdown: this.homeAwayRecords
        };

        // 데이터 디렉토리 생성
        const dataDir = './data';
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // JSON 파일 저장
        fs.writeFileSync('./kbo-records.json', JSON.stringify(finalData, null, 2));
        
        // JavaScript 파일 저장
        const jsContent = `// KBO 2025 통합 상대전적 데이터 (자동 생성)
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

console.log('📊 KBO 통합 상대전적 데이터 로드 완료');
`;
        
        fs.writeFileSync('./kbo-records.js', jsContent);
        fs.writeFileSync('./data/home-away-records.json', JSON.stringify(this.homeAwayRecords, null, 2));
        fs.writeFileSync('./data/last-update-date.json', JSON.stringify({
            lastUpdate: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        }, null, 2));

        console.log('\n💾 데이터 저장 완료:');
        console.log('   - kbo-records.json');
        console.log('   - kbo-records.js');
        console.log('   - data/home-away-records.json');
        console.log('   - data/last-update-date.json');
    }

    async run() {
        console.log('🚀 KBO 통합 상대전적 계산 시작...\n');
        
        // 1. 과거 데이터 파싱
        const historicalGames = this.parseHistoricalData();
        
        // 2. 오늘 경기 결과 추가
        const todayGames = await this.fetchTodayGames();
        
        console.log(`\n📊 총 ${historicalGames + todayGames}경기 데이터 처리 완료`);
        
        // 3. 결과 출력
        this.displayHeadToHeadResults();
        this.displayHomeAwayBreakdown();
        
        // 4. 데이터 저장
        this.saveIntegratedData();
        
        console.log('\n🎉 KBO 통합 상대전적 계산 완료!');
    }
}

// 실행
async function main() {
    const integrator = new IntegratedKBOData();
    
    try {
        await integrator.run();
    } catch (error) {
        console.error('❌ 통합 처리 중 오류 발생:', error);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = IntegratedKBOData;