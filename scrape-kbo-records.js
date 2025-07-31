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

    async fetchScoreboardData(date) {
        return new Promise((resolve, reject) => {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?seriesId=1&gameDate=${date}`;
            
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    parseGameResults(html, gameDate) {
        const games = [];
        
        // 정규식으로 경기 결과 파싱 (실제 HTML 구조에 맞게 조정 필요)
        const gameRegex = /<div class="game-result"[^>]*>[\s\S]*?<\/div>/g;
        const teamRegex = /class="team[^"]*"[^>]*>([^<]+)</g;
        const scoreRegex = /class="score[^"]*"[^>]*>(\d+)</g;
        
        let match;
        while ((match = gameRegex.exec(html)) !== null) {
            const gameHtml = match[0];
            const teams = [];
            const scores = [];
            
            let teamMatch;
            while ((teamMatch = teamRegex.exec(gameHtml)) !== null) {
                teams.push(teamMatch[1].trim());
            }
            
            let scoreMatch;
            while ((scoreMatch = scoreRegex.exec(gameHtml)) !== null) {
                scores.push(parseInt(scoreMatch[1]));
            }
            
            if (teams.length >= 2 && scores.length >= 2) {
                const awayTeam = teams[0];
                const homeTeam = teams[1];
                const awayScore = scores[0];
                const homeScore = scores[1];
                
                games.push({
                    date: gameDate,
                    awayTeam,
                    homeTeam,
                    awayScore,
                    homeScore,
                    result: awayScore > homeScore ? 'away_win' : 
                           homeScore > awayScore ? 'home_win' : 'draw'
                });
            }
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

    async scrapeSeasonData() {
        console.log('🏟️ KBO 2025 시즌 홈/어웨이 상대전적 수집 시작...');
        
        // 2025년 3월부터 현재까지 데이터 수집
        const startDate = new Date('2025-03-01');
        const endDate = new Date();
        const currentDate = new Date(startDate);
        
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
                
                // API 부하 방지를 위한 딜레이
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`   ❌ ${dateString} 데이터 수집 실패: ${error.message}`);
            }
            
            // 다음 날로 이동
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`🎯 총 ${totalGames}경기 데이터 수집 완료`);
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