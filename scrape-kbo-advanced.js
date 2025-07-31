#!/usr/bin/env node

/**
 * KBO 홈/어웨이 상대전적 데이터 스크래핑 스크립트 (고급 버전)
 * Cheerio와 Axios를 사용한 정확한 HTML 파싱
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// KBO 팀 이름 정규화
const TEAM_NAMES = {
    'KT': 'KT',
    'LG': 'LG',
    '키움': '키움',
    'SSG': 'SSG',
    'NC': 'NC',
    '롯데': '롯데',
    '두산': '두산',
    'KIA': 'KIA',
    '삼성': '삼성',
    '한화': '한화',
    'kt': 'KT',
    'lg': 'LG'
};

class KBOAdvancedScraper {
    constructor() {
        this.homeAwayRecords = {};
        this.gameResults = [];
        this.initializeRecords();
        
        // HTTP 클라이언트 설정
        this.client = axios.create({
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });
    }

    initializeRecords() {
        Object.values(TEAM_NAMES).forEach(team1 => {
            this.homeAwayRecords[team1] = {};
            Object.values(TEAM_NAMES).forEach(team2 => {
                if (team1 !== team2) {
                    this.homeAwayRecords[team1][team2] = {
                        home: { wins: 0, losses: 0, draws: 0 },
                        away: { wins: 0, losses: 0, draws: 0 }
                    };
                }
            });
        });
    }

    normalizeTeamName(name) {
        const cleaned = name.trim().replace(/\s+/g, '');
        return TEAM_NAMES[cleaned] || cleaned;
    }

    async fetchScoreboardPage(date) {
        try {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx`;
            const params = {
                seriesId: 1,
                gameDate: date
            };
            
            console.log(`  📡 요청: ${url}?gameDate=${date}`);
            const response = await this.client.get(url, { params });
            return response.data;
        } catch (error) {
            console.log(`  ❌ ${date} 요청 실패: ${error.message}`);
            return null;
        }
    }

    parseGameResults(html, date) {
        const $ = cheerio.load(html);
        const games = [];

        // KBO 웹사이트의 실제 구조에 맞는 셀렉터 (동적으로 조정 필요)
        $('.game-item, .score-item, .match-item').each((i, element) => {
            try {
                const $game = $(element);
                
                // 팀 이름 추출 (여러 가능한 클래스명 시도)
                const awayTeam = this.normalizeTeamName(
                    $game.find('.away-team, .team-away, .visitor').first().text()
                );
                const homeTeam = this.normalizeTeamName(
                    $game.find('.home-team, .team-home, .home').first().text()
                );
                
                // 점수 추출
                const awayScore = parseInt(
                    $game.find('.away-score, .score-away, .visitor-score').first().text()
                ) || 0;
                const homeScore = parseInt(
                    $game.find('.home-score, .score-home, .home-score').first().text()
                ) || 0;
                
                // 경기 상태 확인 (종료된 경기만 처리)
                const gameStatus = $game.find('.status, .game-status').text().trim();
                const isFinished = gameStatus.includes('종료') || 
                                  gameStatus.includes('경기종료') ||
                                  (!isNaN(awayScore) && !isNaN(homeScore) && (awayScore > 0 || homeScore > 0));

                if (isFinished && awayTeam && homeTeam && TEAM_NAMES[awayTeam] && TEAM_NAMES[homeTeam]) {
                    const result = awayScore > homeScore ? 'away_win' : 
                                  homeScore > awayScore ? 'home_win' : 'draw';
                    
                    games.push({
                        date,
                        awayTeam,
                        homeTeam,
                        awayScore,
                        homeScore,
                        result,
                        status: gameStatus
                    });
                    
                    console.log(`    🏟️ ${awayTeam} ${awayScore} : ${homeScore} ${homeTeam} (${result})`);
                }
                
            } catch (error) {
                console.log(`    ⚠️ 경기 파싱 오류: ${error.message}`);
            }
        });

        return games;
    }

    updateRecords(games) {
        games.forEach(game => {
            const { homeTeam, awayTeam, result } = game;
            
            if (!this.homeAwayRecords[homeTeam] || !this.homeAwayRecords[awayTeam]) {
                console.log(`  ⚠️ 알 수 없는 팀: ${homeTeam} vs ${awayTeam}`);
                return;
            }
            
            // 홈팀 기준 업데이트
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
        
        this.gameResults.push(...games);
    }

    async scrapeRecentGames(days = 30) {
        console.log(`🏟️ 최근 ${days}일간 KBO 경기 결과 수집 중...`);
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        
        let totalGames = 0;
        let successDays = 0;
        
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateString = date.toISOString().split('T')[0].replace(/-/g, '');
            
            try {
                console.log(`📅 ${dateString} (${date.toLocaleDateString('ko-KR')}) 처리 중...`);
                
                const html = await this.fetchScoreboardPage(dateString);
                if (!html) continue;
                
                const games = this.parseGameResults(html, dateString);
                
                if (games.length > 0) {
                    this.updateRecords(games);
                    totalGames += games.length;
                    successDays++;
                    console.log(`  ✅ ${games.length}경기 처리 완료`);
                } else {
                    console.log(`  ⚪ 경기 없음 또는 파싱 실패`);
                }
                
                // API 부하 방지
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`  ❌ ${dateString} 처리 실패: ${error.message}`);
            }
        }
        
        console.log(`\n🎯 수집 완료: ${successDays}일 중 ${totalGames}경기`);
        return totalGames;
    }

    generateUpdatedData() {
        // 기존 전적 데이터와 새로운 홈/어웨이 데이터 병합
        const combinedData = {};
        const homeAwayData = {};
        
        Object.keys(this.homeAwayRecords).forEach(team1 => {
            combinedData[team1] = {};
            homeAwayData[team1] = {};
            
            Object.keys(this.homeAwayRecords[team1]).forEach(team2 => {
                const record = this.homeAwayRecords[team1][team2];
                
                // 전체 전적
                const totalWins = record.home.wins + record.away.wins;
                const totalLosses = record.home.losses + record.away.losses;
                const totalDraws = record.home.draws + record.away.draws;
                combinedData[team1][team2] = `${totalWins}-${totalLosses}-${totalDraws}`;
                
                // 홈/어웨이 구분 전적
                homeAwayData[team1][team2] = {
                    home: `${record.home.wins}-${record.home.losses}-${record.home.draws}`,
                    away: `${record.away.wins}-${record.away.losses}-${record.away.draws}`,
                    homeWinRate: record.home.wins + record.home.losses > 0 ? 
                        (record.home.wins / (record.home.wins + record.home.losses)) : 0.5,
                    awayWinRate: record.away.wins + record.away.losses > 0 ? 
                        (record.away.wins / (record.away.wins + record.away.losses)) : 0.5
                };
            });
        });
        
        return {
            lastUpdated: new Date().toISOString(),
            totalGames: this.gameResults.length,
            scrapedData: combinedData,
            homeAwayBreakdown: homeAwayData,
            recentGames: this.gameResults.slice(-20) // 최근 20경기만 저장
        };
    }

    async saveToFiles() {
        const data = this.generateUpdatedData();
        
        // JSON 형태로 저장
        fs.writeFileSync('./magic-number/kbo-homeaway-data.json', JSON.stringify(data, null, 2));
        
        // JavaScript 형태로 저장 (HTML에서 직접 임포트 가능)
        const jsContent = `// KBO 홈/어웨이 상대전적 데이터 (자동 스크래핑)
// 마지막 업데이트: ${data.lastUpdated}
// 수집된 경기 수: ${data.totalGames}

// 홈/어웨이 구분 상대전적 데이터
const homeAwayRecords = ${JSON.stringify(data.homeAwayBreakdown, null, 2)};

// 홈에서의 전적 조회
function getHomeRecord(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].home : null;
}

// 원정에서의 전적 조회
function getAwayRecord(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].away : null;
}

// 홈 승률 조회
function getHomeWinRate(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].homeWinRate : 0.5;
}

// 원정 승률 조회
function getAwayWinRate(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].awayWinRate : 0.5;
}

console.log('🏟️ KBO 홈/어웨이 상대전적 데이터 로드됨 (${data.totalGames}경기 기준)');
`;
        
        fs.writeFileSync('./magic-number/kbo-homeaway-data.js', jsContent);
        
        console.log('\n💾 파일 저장 완료:');
        console.log('  📁 ./magic-number/kbo-homeaway-data.json');
        console.log('  📁 ./magic-number/kbo-homeaway-data.js');
        
        return data;
    }
}

// 실행 함수
async function main() {
    console.log('🚀 KBO 홈/어웨이 상대전적 스크래핑 시작...\n');
    
    const scraper = new KBOAdvancedScraper();
    
    try {
        // 최근 60일간 데이터 수집
        const gamesCollected = await scraper.scrapeRecentGames(60);
        
        if (gamesCollected > 0) {
            const data = await scraper.saveToFiles();
            console.log('\n🎉 스크래핑 성공!');
            console.log(`📊 총 ${gamesCollected}경기 데이터 수집 완료`);
            console.log(`⏰ 마지막 업데이트: ${new Date(data.lastUpdated).toLocaleString('ko-KR')}`);
        } else {
            console.log('\n⚠️ 수집된 데이터가 없습니다. 웹사이트 구조가 변경되었을 수 있습니다.');
        }
        
    } catch (error) {
        console.error('\n❌ 스크래핑 중 오류 발생:', error.message);
        console.error('스택 트레이스:', error.stack);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = KBOAdvancedScraper;