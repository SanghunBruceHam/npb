#!/usr/bin/env node

/**
 * KBO 홈/어웨이 상대전적 데이터 스크래핑 (최종 버전)
 * 실제 HTML 구조에 맞춘 정확한 파싱
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 엠블럼 파일명으로 팀명 매핑
const EMBLEM_TO_TEAM = {
    'emblem_KT.png': 'KT',
    'emblem_LG.png': 'LG',
    'emblem_WO.png': '키움',
    'emblem_SK.png': 'SSG',
    'emblem_NC.png': 'NC',
    'emblem_LT.png': '롯데',
    'emblem_OB.png': '두산',
    'emblem_HT.png': 'KIA',
    'emblem_SS.png': '삼성',
    'emblem_HH.png': '한화'
};

// 팀명 정규화
const TEAM_NAMES = ['한화', 'LG', '롯데', 'KT', 'KIA', '삼성', 'SSG', 'NC', '두산', '키움'];

class KBOFinalScraper {
    constructor() {
        this.homeAwayRecords = {};
        this.gameResults = [];
        this.initializeRecords();
        
        this.client = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
    }

    initializeRecords() {
        TEAM_NAMES.forEach(team1 => {
            this.homeAwayRecords[team1] = {};
            TEAM_NAMES.forEach(team2 => {
                if (team1 !== team2) {
                    this.homeAwayRecords[team1][team2] = {
                        home: { wins: 0, losses: 0, draws: 0 },
                        away: { wins: 0, losses: 0, draws: 0 }
                    };
                }
            });
        });
    }

    getTeamFromEmblem(emblemSrc) {
        const fileName = emblemSrc.split('/').pop();
        return EMBLEM_TO_TEAM[fileName] || null;
    }

    async fetchScoreboardData(date) {
        try {
            const url = 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx';
            const params = { 
                seriesId: 1, 
                gameDate: date 
            };
            
            console.log(`  📡 ${date} 데이터 요청...`);
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

        // 각 경기 블록 찾기
        $('.gameBox').each((gameIndex, gameElement) => {
            try {
                const $game = $(gameElement);
                
                // 원정팀 정보 (leftTeam)
                const $leftTeam = $game.find('.leftTeam');
                const awayEmblemSrc = $leftTeam.find('img').attr('src') || '';
                const awayTeamText = $leftTeam.find('strong.teamT').text().trim();
                const awayScoreText = $leftTeam.find('.score span').text().trim();
                
                // 홈팀 정보 (rightTeam)
                const $rightTeam = $game.find('.rightTeam');
                const homeEmblemSrc = $rightTeam.find('img').attr('src') || '';
                const homeTeamText = $rightTeam.find('strong.teamT').text().trim();
                const homeScoreText = $rightTeam.find('.score span').text().trim();
                
                // 경기 상태
                const gameStatus = $game.find('strong.flag span').text().trim();
                
                // 팀명 매핑 (엠블럼과 텍스트 둘 다 사용)
                const awayTeam = this.getTeamFromEmblem(awayEmblemSrc) || awayTeamText;
                const homeTeam = this.getTeamFromEmblem(homeEmblemSrc) || homeTeamText;
                
                // 점수 파싱
                const awayScore = parseInt(awayScoreText) || 0;
                const homeScore = parseInt(homeScoreText) || 0;
                
                // 경기 종료 여부 확인
                const isFinished = gameStatus.includes('종료') || 
                                  gameStatus.includes('경기종료') ||
                                  (awayScoreText !== '' && homeScoreText !== '' && 
                                   !isNaN(awayScore) && !isNaN(homeScore));

                console.log(`    🔍 경기 ${gameIndex + 1}: ${awayTeam} vs ${homeTeam} - ${gameStatus}`);
                
                if (isFinished && TEAM_NAMES.includes(awayTeam) && TEAM_NAMES.includes(homeTeam)) {
                    const result = awayScore > homeScore ? 'away_win' : 
                                  homeScore > awayScore ? 'home_win' : 'draw';
                    
                    const game = {
                        date,
                        awayTeam,
                        homeTeam,
                        awayScore,
                        homeScore,
                        result,
                        status: gameStatus
                    };
                    
                    games.push(game);
                    console.log(`    ✅ ${awayTeam} ${awayScore} : ${homeScore} ${homeTeam} (${result})`);
                } else if (isFinished) {
                    console.log(`    ⚠️ 알 수 없는 팀: ${awayTeam} vs ${homeTeam}`);
                } else {
                    console.log(`    ⏸️ 미완료 경기: ${awayTeam} vs ${homeTeam} (${gameStatus})`);
                }
                
            } catch (error) {
                console.log(`    ❌ 경기 파싱 오류: ${error.message}`);
            }
        });

        return games;
    }

    updateRecords(games) {
        games.forEach(game => {
            const { homeTeam, awayTeam, result } = game;
            
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

    async scrapeSeasonData(startDate = '20250301', endDate = null) {
        if (!endDate) {
            endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        }
        
        console.log(`🏟️ KBO ${startDate}~${endDate} 경기 결과 수집 중...`);
        
        const start = new Date(startDate.slice(0, 4), parseInt(startDate.slice(4, 6)) - 1, startDate.slice(6, 8));
        const end = new Date(endDate.slice(0, 4), parseInt(endDate.slice(4, 6)) - 1, endDate.slice(6, 8));
        
        let totalGames = 0;
        let successDays = 0;
        let currentDate = new Date(start);
        
        while (currentDate <= end) {
            const dateString = currentDate.getFullYear() + 
                              String(currentDate.getMonth() + 1).padStart(2, '0') + 
                              String(currentDate.getDate()).padStart(2, '0');
            
            try {
                console.log(`📅 ${dateString} (${currentDate.toLocaleDateString('ko-KR')}) 처리 중...`);
                
                const html = await this.fetchScoreboardData(dateString);
                if (!html) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                }
                
                const games = this.parseGameResults(html, dateString);
                
                if (games.length > 0) {
                    this.updateRecords(games);
                    totalGames += games.length;
                    successDays++;
                    console.log(`  ✅ ${games.length}경기 처리 완료`);
                } else {
                    console.log(`  ⚪ 경기 없음`);
                }
                
                // API 부하 방지
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`  ❌ ${dateString} 처리 실패: ${error.message}`);
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        console.log(`\n🎯 수집 완료: ${totalGames}경기 (${successDays}일)`);
        return totalGames;
    }

    generateData() {
        const combinedData = {};
        const homeAwayData = {};
        
        TEAM_NAMES.forEach(team1 => {
            combinedData[team1] = {};
            homeAwayData[team1] = {};
            
            TEAM_NAMES.forEach(team2 => {
                if (team1 !== team2) {
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
                }
            });
        });
        
        return {
            lastUpdated: new Date().toISOString(),
            totalGames: this.gameResults.length,
            scrapedData: combinedData,
            homeAwayBreakdown: homeAwayData,
            recentGames: this.gameResults.slice(-30)
        };
    }

    async saveData() {
        const data = this.generateData();
        
        // JSON 파일 저장
        fs.writeFileSync('./magic-number/kbo-homeaway-data.json', JSON.stringify(data, null, 2));
        
        // JavaScript 파일 저장
        const jsContent = `// KBO 홈/어웨이 상대전적 데이터 (자동 스크래핑)
// 마지막 업데이트: ${data.lastUpdated}
// 수집된 경기 수: ${data.totalGames}

const homeAwayRecords = ${JSON.stringify(data.homeAwayBreakdown, null, 2)};

// 홈에서의 전적 조회 함수
function getHomeRecord(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].home : null;
}

// 원정에서의 전적 조회 함수
function getAwayRecord(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].away : null;
}

// 홈 승률 조회 함수
function getHomeWinRate(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].homeWinRate : 0.5;
}

// 원정 승률 조회 함수
function getAwayWinRate(team1, team2) {
    return homeAwayRecords[team1] && homeAwayRecords[team1][team2] ? 
           homeAwayRecords[team1][team2].awayWinRate : 0.5;
}

console.log('🏟️ KBO 홈/어웨이 상대전적 데이터 로드 완료 (' + ${data.totalGames} + '경기 기준)');
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
    
    const scraper = new KBOFinalScraper();
    
    try {
        // 2025년 3월부터 현재까지 데이터 수집
        const gamesCollected = await scraper.scrapeSeasonData('20250301');
        
        if (gamesCollected > 0) {
            const data = await scraper.saveData();
            console.log('\n🎉 스크래핑 성공!');
            console.log(`📊 총 ${gamesCollected}경기 데이터 수집 완료`);
            console.log(`⏰ 마지막 업데이트: ${new Date(data.lastUpdated).toLocaleString('ko-KR')}`);
            
            // 샘플 데이터 출력
            console.log('\n📈 샘플 홈/어웨이 전적:');
            console.log(`한화 vs LG 홈: ${data.homeAwayBreakdown['한화']['LG'].home}`);
            console.log(`한화 vs LG 원정: ${data.homeAwayBreakdown['한화']['LG'].away}`);
            
        } else {
            console.log('\n⚠️ 수집된 데이터가 없습니다.');
            console.log('현재 시즌이 시작되지 않았거나 웹사이트 구조가 변경되었을 수 있습니다.');
        }
        
    } catch (error) {
        console.error('\n❌ 스크래핑 중 오류 발생:', error.message);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = KBOFinalScraper;