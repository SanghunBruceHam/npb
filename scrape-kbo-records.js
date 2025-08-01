#!/usr/bin/env node

/**
 * KBO 홈/어웨이 상대전적 데이터 스크래핑 스크립트
 * https://www.koreabaseball.com/Schedule/ScoreBoard.aspx 에서 데이터 수집
 */

const https = require('https');
const fs = require('fs');

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

class KBOScraper {
    constructor() {
        this.homeAwayRecords = {};
        this.lastUpdateFile = './data/last-update-date.json';
        this.dataFile = './data/home-away-records.json';
        this.initializeRecords();
    }

    initializeRecords() {
        // 모든 팀 조합에 대해 홈/어웨이 기록 초기화
        Object.keys(TEAM_MAPPING).forEach(homeTeam => {
            this.homeAwayRecords[homeTeam] = {};
            Object.keys(TEAM_MAPPING).forEach(awayTeam => {
                if (homeTeam !== awayTeam) {
                    this.homeAwayRecords[homeTeam][awayTeam] = {
                        home: { wins: 0, losses: 0, draws: 0 }, // 홈에서의 성적
                        away: { wins: 0, losses: 0, draws: 0 }  // 원정에서의 성적
                    };
                }
            });
        });
    }

    async fetchScoreboardData(date, retryCount = 0) {
        const maxRetries = 3;
        const timeout = 30000; // 30초 타임아웃
        
        return new Promise((resolve, reject) => {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?seriesId=1&gameDate=${date}`;
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            };
            
            const req = https.get(url, options, (res) => {
                let data = '';
                res.setEncoding('utf8');
                
                res.setTimeout(timeout, () => {
                    req.destroy();
                    reject(new Error(`요청 타임아웃: ${date}`));
                });
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', async (error) => {
                if (retryCount < maxRetries) {
                    console.log(`   ⚠️ ${date} 연결 실패, 재시도 ${retryCount + 1}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // 지수 백오프
                    try {
                        const result = await this.fetchScoreboardData(date, retryCount + 1);
                        resolve(result);
                    } catch (retryError) {
                        reject(retryError);
                    }
                } else {
                    reject(error);
                }
            });
            
            req.setTimeout(timeout, () => {
                req.destroy();
                reject(new Error(`요청 타임아웃: ${date}`));
            });
        });
    }

    parseGameResults(html, gameDate) {
        const games = [];
        
        try {
            // 디버깅: HTML 길이와 경기종료 확인
            if (html.length < 1000) {
                console.log(`   ⚠️ ${gameDate}: HTML이 너무 짧음 (${html.length}자)`);
                return games;
            }
            
            // 실제 KBO HTML 구조에 맞는 파싱
            const gameFinishedRegex = /경기종료/g;
            const gameFinishedCount = (html.match(gameFinishedRegex) || []).length;
            
            if (gameFinishedCount === 0) {
                console.log(`   📅 ${gameDate}: 완료된 경기 없음`);
                return games;
            }
            
            console.log(`   🔍 ${gameDate}: ${gameFinishedCount}개 경기종료 발견`);
            
            // 각 경기종료 위치를 찾아서 주변의 팀명과 점수 추출
            let match;
            gameFinishedRegex.lastIndex = 0; // 정규식 리셋
            while ((match = gameFinishedRegex.exec(html)) !== null) {
                const finishedIndex = match.index;
                
                // 경기종료 앞뒤 1000자 범위에서 해당 경기 정보 추출
                const startPos = Math.max(0, finishedIndex - 1000);
                const endPos = Math.min(html.length, finishedIndex + 500);
                const gameSection = html.substring(startPos, endPos);
                
                // 팀명 추출 (leftTeam이 원정, rightTeam이 홈)
                const teamMatches = gameSection.match(/<strong class='teamT'>([^<]+)<\/strong>/g);
                const teams = teamMatches ? teamMatches.map(m => 
                    m.replace(/<strong class='teamT'>([^<]+)<\/strong>/, '$1').trim()
                ) : [];
                
                // 점수 추출 (AwayTeamScore, HomeTeamScore 순서)
                const awayScoreMatch = gameSection.match(/lblAwayTeamScore_\d+">(\d+)<\/span>/);
                const homeScoreMatch = gameSection.match(/lblHomeTeamScore_\d+">(\d+)<\/span>/);
                
                const awayScore = awayScoreMatch ? parseInt(awayScoreMatch[1]) : null;
                const homeScore = homeScoreMatch ? parseInt(homeScoreMatch[1]) : null;
                
                // 팀명과 점수가 모두 올바르게 추출된 경우만 처리
                if (teams.length === 2 && awayScore !== null && homeScore !== null) {
                    const awayTeam = teams[0]; // leftTeam (원정)
                    const homeTeam = teams[1]; // rightTeam (홈)
                    
                    // 유효한 팀명인지 확인
                    if (Object.keys(TEAM_MAPPING).includes(awayTeam) && 
                        Object.keys(TEAM_MAPPING).includes(homeTeam)) {
                        
                        // 중복 제거 확인
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
                return; // 알 수 없는 팀 무시
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

    // 마지막 업데이트 날짜 로드
    loadLastUpdateDate() {
        try {
            if (fs.existsSync(this.lastUpdateFile)) {
                const data = JSON.parse(fs.readFileSync(this.lastUpdateFile, 'utf8'));
                return new Date(data.lastUpdate);
            }
        } catch (error) {
            console.log('⚠️ 마지막 업데이트 날짜 로드 실패, 시즌 시작일부터 시작합니다.');
        }
        return new Date('2025-03-01'); // 시즌 시작일
    }

    // 마지막 업데이트 날짜 저장
    saveLastUpdateDate(date) {
        try {
            const data = {
                lastUpdate: date.toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(this.lastUpdateFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.log('⚠️ 마지막 업데이트 날짜 저장 실패:', error.message);
        }
    }

    // 기존 데이터 로드
    loadExistingData() {
        try {
            if (fs.existsSync(this.dataFile)) {
                const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
                this.homeAwayRecords = data;
                console.log('✅ 기존 홈/어웨이 전적 데이터 로드 완료');
                return true;
            }
        } catch (error) {
            console.log('⚠️ 기존 데이터 로드 실패, 새로 시작합니다:', error.message);
        }
        return false;
    }

    async scrapeSeasonData() {
        console.log('🏟️ KBO 2025 시즌 홈/어웨이 상대전적 증분 업데이트 시작...');
        
        // 기존 데이터 로드
        const hasExistingData = this.loadExistingData();
        
        // 마지막 업데이트 날짜부터 시작
        const lastUpdateDate = this.loadLastUpdateDate();
        let startDate = new Date(lastUpdateDate);
        
        // 기존 데이터가 있으면 다음 날부터, 없으면 배치 처리
        if (hasExistingData) {
            startDate.setDate(startDate.getDate() + 1); // 다음 날부터 시작
        } else {
            // 첫 실행시에는 월별 배치 처리
            const seasonStart = new Date('2025-03-01');
            console.log('🆕 첫 실행: 시즌 시작부터 월별 배치 처리로 수집합니다.');
            await this.scrapeByMonths(seasonStart, new Date());
            return;
        }
        
        const endDate = new Date();
        const currentDate = new Date(startDate);
        
        if (currentDate > endDate) {
            console.log('📅 업데이트할 새로운 데이터가 없습니다.');
            return;
        }
        
        console.log(`📅 ${startDate.toISOString().split('T')[0]}부터 ${endDate.toISOString().split('T')[0]}까지 업데이트`);
        
        let totalGames = 0;
        
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0].replace(/-/g, '');
            
            try {
                console.log(`📅 ${dateString} 데이터 수집 중...`);
                const html = await this.fetchScoreboardData(dateString);
                const games = this.parseGameResults(html, dateString);
                
                if (games.length > 0) {
                    this.updateRecords(games);
                    totalGames += games.length;
                    console.log(`   ✅ ${games.length}경기 처리 완료`);
                }
                
                // API 부하 방지를 위한 딜레이 (연결 안정성 향상)
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`   ❌ ${dateString} 데이터 수집 실패: ${error.message}`);
                // 중요한 오류가 5회 연속 발생하면 중단
                if (error.message.includes('타임아웃') || error.message.includes('ECONNRESET')) {
                    console.log('⚠️ 연결 불안정으로 잠시 대기합니다...');
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 10초 대기
                }
            }
            
            // 다음 날로 이동
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`🎯 총 ${totalGames}경기 데이터 수집 완료`);
        
        // 마지막 업데이트 날짜 저장
        if (totalGames > 0) {
            this.saveLastUpdateDate(endDate);
            this.saveDataToFile();
        }
    }

    // 월별 배치 처리로 초기 데이터 수집
    async scrapeByMonths(startDate, endDate) {
        console.log('📊 월별 배치 처리로 시즌 데이터 수집 시작...');
        
        const currentMonth = new Date(startDate);
        let totalGames = 0;
        
        while (currentMonth <= endDate) {
            const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            
            // 종료일을 넘지 않도록 조정
            if (monthEnd > endDate) {
                monthEnd.setTime(endDate.getTime());
            }
            
            const monthName = monthStart.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
            console.log(`📅 ${monthName} 데이터 수집 중...`);
            
            const monthGames = await this.scrapeMonthData(monthStart, monthEnd);
            totalGames += monthGames;
            
            console.log(`✅ ${monthName} 완료: ${monthGames}경기`);
            
            // 월 간 휴식 (서버 부하 방지)
            if (currentMonth < endDate) {
                console.log('⏳ 다음 월 처리를 위해 5초 대기...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // 다음 달로 이동
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        
        console.log(`🎉 전체 시즌 데이터 수집 완료: 총 ${totalGames}경기`);
        
        if (totalGames > 0) {
            this.saveLastUpdateDate(endDate);
            this.saveDataToFile();
        }
    }

    // 특정 월의 데이터 수집
    async scrapeMonthData(startDate, endDate) {
        const currentDate = new Date(startDate);
        let monthGames = 0;
        let errorCount = 0;
        
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0].replace(/-/g, '');
            
            try {
                const html = await this.fetchScoreboardData(dateString);
                const games = this.parseGameResults(html, dateString);
                
                if (games.length > 0) {
                    this.updateRecords(games);
                    monthGames += games.length;
                    console.log(`   ⚾ ${dateString}: ${games.length}경기`);
                }
                
                errorCount = 0; // 성공시 에러 카운트 리셋
                
                // API 부하 방지
                await new Promise(resolve => setTimeout(resolve, 1500));
                
            } catch (error) {
                errorCount++;
                console.log(`   ❌ ${dateString} 실패: ${error.message}`);
                
                // 연속 에러가 많으면 중단
                if (errorCount >= 5) {
                    console.log('⚠️ 연속 오류가 많아 월별 처리를 중단합니다.');
                    break;
                }
                
                // 에러시 더 긴 대기
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // 다음 날로 이동
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return monthGames;
    }

    // 데이터를 파일로 저장
    saveDataToFile() {
        try {
            // data 디렉토리가 없으면 생성
            const dataDir = './data';
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            fs.writeFileSync(this.dataFile, JSON.stringify(this.homeAwayRecords, null, 2));
            console.log('💾 홈/어웨이 전적 데이터 저장 완료');
        } catch (error) {
            console.log('❌ 데이터 저장 실패:', error.message);
        }
    }

    generateJSONData() {
        // 기존 headToHeadData 형식으로 변환
        const combinedData = {};
        
        Object.keys(this.homeAwayRecords).forEach(team1 => {
            combinedData[team1] = {};
            Object.keys(this.homeAwayRecords[team1]).forEach(team2 => {
                const record = this.homeAwayRecords[team1][team2];
                const totalWins = record.home.wins + record.away.wins;
                const totalLosses = record.home.losses + record.away.losses;
                const totalDraws = record.home.draws + record.away.draws;
                
                combinedData[team1][team2] = `${totalWins}-${totalLosses}-${totalDraws}`;
            });
        });
        
        return {
            lastUpdated: new Date().toISOString(),
            totalData: combinedData,
            homeAwayBreakdown: this.homeAwayRecords
        };
    }

    saveData() {
        const data = this.generateJSONData();
        
        // JSON 파일로 저장
        fs.writeFileSync('./kbo-records.json', JSON.stringify(data, null, 2));
        
        // JavaScript 형식으로도 저장 (HTML에서 직접 사용 가능)
        const jsContent = `// KBO 2025 홈/어웨이 상대전적 데이터 (자동 생성)
// 마지막 업데이트: ${data.lastUpdated}

const headToHeadData = ${JSON.stringify(data.totalData, null, 4)};

const homeAwayRecords = ${JSON.stringify(data.homeAwayBreakdown, null, 4)};

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
        
        console.log('💾 데이터 저장 완료:');
        console.log('   - kbo-records.json (JSON 형식)');
        console.log('   - kbo-records.js (JavaScript 형식)');
    }
}

// 실행
async function main() {
    const scraper = new KBOScraper();
    
    try {
        await scraper.scrapeSeasonData();
        scraper.saveData();
        console.log('🎉 KBO 홈/어웨이 상대전적 데이터 수집 완료!');
    } catch (error) {
        console.error('❌ 스크래핑 중 오류 발생:', error);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = KBOScraper;