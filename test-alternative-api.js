#!/usr/bin/env node

/**
 * 대안적인 KBO API 테스트
 */

const https = require('https');

class AlternativeKBOTester {
    constructor() {
        console.log('🔍 대안적인 KBO API 테스트 시작...\n');
    }

    // 방법 1: KBO 공식 API (JSON)
    async testKBOAPI(date) {
        return new Promise((resolve, reject) => {
            // KBO에서 사용하는 것으로 보이는 API 엔드포인트들
            const apiUrls = [
                `https://www.koreabaseball.com/ws/Main.asmx/GetGamesOfDay?gameDate=${date}&leagueId=1&seriesId=1`,
                `https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleByDate?gameDate=${date}&leagueId=1&seriesId=1`,
                `https://api.koreabaseball.com/schedule/games?date=${date}`,
                `https://www.koreabaseball.com/ws/Schedule.asmx/GetGamesResultByDate?gameDate=${date}&leagueId=1&seriesId=1`
            ];
            
            console.log(`📡 KBO API 테스트 (${date})`);
            
            const testPromises = apiUrls.map((url, index) => {
                return new Promise((resolve) => {
                    console.log(`   API ${index + 1}: ${url}`);
                    
                    const req = https.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json, text/plain, */*',
                            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                            'Referer': 'https://www.koreabaseball.com/'
                        }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            console.log(`   API ${index + 1} 응답: ${res.statusCode} (${data.length}자)`);
                            if (data.length > 100) {
                                console.log(`   샘플: ${data.substring(0, 200)}...`);
                            }
                            resolve({ index: index + 1, status: res.statusCode, data, url });
                        });
                    }).on('error', (error) => {
                        console.log(`   API ${index + 1} 오류: ${error.message}`);
                        resolve({ index: index + 1, error: error.message, url });
                    });
                    
                    req.setTimeout(10000, () => {
                        req.destroy();
                        resolve({ index: index + 1, error: '타임아웃', url });
                    });
                });
            });
            
            Promise.all(testPromises).then(results => {
                resolve(results);
            });
        });
    }

    // 방법 2: 네이버 스포츠 API
    async testNaverSports(date) {
        return new Promise((resolve, reject) => {
            // 네이버 스포츠에서 KBO 데이터를 가져오는 API
            const naverUrls = [
                `https://sports.news.naver.com/game/index.nhn?category=kbo&date=${date}`,
                `https://sports.news.naver.com/ajax/gamecenter/gameList.nhn?category=kbo&date=${date}`,
                `https://api-gw.sports.naver.com/schedule/games?date=${date}&sport=baseball&league=kbo`
            ];
            
            console.log(`📡 네이버 스포츠 API 테스트 (${date})`);
            
            const testPromises = naverUrls.map((url, index) => {
                return new Promise((resolve) => {
                    console.log(`   네이버 API ${index + 1}: ${url}`);
                    
                    const req = https.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json, text/html, */*',
                            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                            'Referer': 'https://sports.news.naver.com/'
                        }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            console.log(`   네이버 API ${index + 1} 응답: ${res.statusCode} (${data.length}자)`);
                            if (data.length > 100) {
                                console.log(`   샘플: ${data.substring(0, 200)}...`);
                            }
                            resolve({ index: index + 1, status: res.statusCode, data, url });
                        });
                    }).on('error', (error) => {
                        console.log(`   네이버 API ${index + 1} 오류: ${error.message}`);
                        resolve({ index: index + 1, error: error.message, url });
                    });
                    
                    req.setTimeout(10000, () => {
                        req.destroy();
                        resolve({ index: index + 1, error: '타임아웃', url });
                    });
                });
            });
            
            Promise.all(testPromises).then(results => {
                resolve(results);
            });
        });
    }

    // 방법 3: 스포츠 데이터 API
    async testSportsDataAPIs(date) {
        return new Promise((resolve, reject) => {
            // 기타 스포츠 데이터 제공 API들
            const otherUrls = [
                `https://www.espn.com/baseball/league/schedule/_/date/${date.replace(/(\d{4})(\d{2})(\d{2})/, '$1$2$3')}/league/kbo`,
                `https://api.sportradar.com/baseball/trial/v7/en/games/${date}/schedule.json`,
                `https://statsapi.web.nhl.com/api/v1/schedule?date=${date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}`
            ];
            
            console.log(`📡 기타 스포츠 API 테스트 (${date})`);
            
            const testPromises = otherUrls.map((url, index) => {
                return new Promise((resolve) => {
                    console.log(`   API ${index + 1}: ${url}`);
                    
                    const req = https.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json, */*',
                            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
                        }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            console.log(`   API ${index + 1} 응답: ${res.statusCode} (${data.length}자)`);
                            if (data.length > 100) {
                                console.log(`   샘플: ${data.substring(0, 200)}...`);
                            }
                            resolve({ index: index + 1, status: res.statusCode, data, url });
                        });
                    }).on('error', (error) => {
                        console.log(`   API ${index + 1} 오류: ${error.message}`);
                        resolve({ index: index + 1, error: error.message, url });
                    });
                    
                    req.setTimeout(10000, () => {
                        req.destroy();
                        resolve({ index: index + 1, error: '타임아웃', url });
                    });
                });
            });
            
            Promise.all(testPromises).then(results => {
                resolve(results);
            });
        });
    }

    // 방법 4: 브라우저 DevTools에서 발견한 실제 API 확인
    async testBrowserAPIs(date) {
        return new Promise((resolve, reject) => {
            // 브라우저에서 실제로 사용되는 API 엔드포인트들
            const browserUrls = [
                `https://www.koreabaseball.com/ws/Main.asmx/GetScheduleList?leagueId=1&seriesId=1&gameDate=${date}&gameId=0&teamId=0`,
                `https://www.koreabaseball.com/ws/Main.asmx/GetDailySchedule?leagueId=1&seriesId=0&gameDate=${date}`,
                `https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList?leagueId=1&seriesId=1&seasonId=2025&gameDate=${date}&teamId=0`,
                `https://www.koreabaseball.com/ajax/schedule.aspx?date=${date}`
            ];
            
            console.log(`📡 브라우저 실제 API 테스트 (${date})`);
            
            const testPromises = browserUrls.map((url, index) => {
                return new Promise((resolve) => {
                    console.log(`   브라우저 API ${index + 1}: ${url}`);
                    
                    const req = https.get(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json, text/xml, */*',
                            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                            'Referer': 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }, (res) => {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            console.log(`   브라우저 API ${index + 1} 응답: ${res.statusCode} (${data.length}자)`);
                            if (data.length > 100) {
                                console.log(`   샘플: ${data.substring(0, 500)}...`);
                                
                                // JSON인지 XML인지 확인
                                if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
                                    try {
                                        const json = JSON.parse(data);
                                        console.log(`   ✅ 유효한 JSON 데이터!`);
                                        if (json.length || Object.keys(json).length) {
                                            console.log(`   📊 데이터 구조:`, Object.keys(json));
                                        }
                                    } catch (e) {
                                        console.log(`   ❌ JSON 파싱 실패`);
                                    }
                                } else if (data.trim().startsWith('<')) {
                                    console.log(`   📄 XML/HTML 데이터`);
                                    // 실제 게임 데이터가 있는지 확인
                                    if (data.includes('gameId') || data.includes('score') || data.includes('team')) {
                                        console.log(`   ✅ 게임 데이터 포함 가능성!`);
                                    }
                                }
                            }
                            resolve({ index: index + 1, status: res.statusCode, data, url });
                        });
                    }).on('error', (error) => {
                        console.log(`   브라우저 API ${index + 1} 오류: ${error.message}`);
                        resolve({ index: index + 1, error: error.message, url });
                    });
                    
                    req.setTimeout(15000, () => {
                        req.destroy();
                        resolve({ index: index + 1, error: '타임아웃', url });
                    });
                });
            });
            
            Promise.all(testPromises).then(results => {
                resolve(results);
            });
        });
    }

    async runAllTests() {
        const testDate = '20250731'; // 최근 경기가 있었을 가능성이 높은 날짜
        console.log(`🗓️ 테스트 날짜: ${testDate}\n`);
        
        console.log('=' .repeat(60));
        const kboResults = await this.testKBOAPI(testDate);
        
        console.log('\n' + '=' .repeat(60));
        const naverResults = await this.testNaverSports(testDate);
        
        console.log('\n' + '=' .repeat(60));
        const sportsResults = await this.testSportsDataAPIs(testDate);
        
        console.log('\n' + '=' .repeat(60));
        const browserResults = await this.testBrowserAPIs(testDate);
        
        console.log('\n' + '=' .repeat(60));
        console.log('📊 테스트 결과 요약:');
        console.log('=' .repeat(60));
        
        const allResults = [
            { name: 'KBO 공식 API', results: kboResults },
            { name: '네이버 스포츠', results: naverResults },
            { name: '기타 스포츠 API', results: sportsResults },
            { name: '브라우저 실제 API', results: browserResults }
        ];
        
        allResults.forEach(group => {
            console.log(`\n${group.name}:`);
            group.results.forEach(result => {
                if (result.error) {
                    console.log(`   ❌ API ${result.index}: ${result.error}`);
                } else if (result.status === 200 && result.data && result.data.length > 1000) {
                    console.log(`   ✅ API ${result.index}: 성공 (${result.data.length}자)`);
                    console.log(`      URL: ${result.url}`);
                } else {
                    console.log(`   ⚠️ API ${result.index}: ${result.status} (${result.data?.length || 0}자)`);
                }
            });
        });
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎯 테스트 완료!');
        console.log('=' .repeat(60));
    }
}

// 실행
async function main() {
    const tester = new AlternativeKBOTester();
    
    try {
        await tester.runAllTests();
    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = AlternativeKBOTester;