#!/usr/bin/env node

/**
 * 다중 소스 KBO 크롤링 시스템
 * - KBO 공식 홈페이지 (최우선)
 * - 네이버 스포츠 (백업)
 * - 기타 스포츠 사이트들
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class MultiSourceKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KT': 'KT', 'LG': 'LG', '키움': '키움', 'SSG': 'SSG', 'NC': 'NC',
            '롯데': '롯데', '두산': '두산', 'KIA': 'KIA', '삼성': '삼성', '한화': '한화'
        };
        console.log('🕷️ 다중 소스 KBO 크롤링 시스템 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    // 1. KBO 공식 홈페이지 크롤링
    async crawlKBOOfficial(date) {
        console.log(`🏟️ KBO 공식 사이트 크롤링 시도...`);
        
        try {
            const urls = [
                `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?GameDate=${date}`,
                `https://www.koreabaseball.com/Schedule/Game.aspx?GameDate=${date}`,
                `https://www.koreabaseball.com/Schedule/Schedule.aspx?GameDate=${date}`
            ];

            for (const url of urls) {
                console.log(`📡 KBO URL 시도: ${url}`);
                
                try {
                    await this.page.goto(url, { 
                        waitUntil: 'networkidle2',
                        timeout: 15000 
                    });
                    
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    // 페이지 스크린샷 (디버깅용)
                    await this.page.screenshot({ path: `kbo-debug-${date}.png` });
                    
                    const gameResults = await this.page.evaluate((targetDate) => {
                        const games = [];
                        const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                        const bodyText = document.body.textContent || '';
                        
                        console.log('KBO 페이지 텍스트 길이:', bodyText.length);
                        
                        // KBO 사이트 특정 패턴들
                        const kboPatterns = [
                            // 팀명 점수 경기종료 패턴
                            /경기종료[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*(\d+)[^0-9]*[-:][^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g,
                            // 승패 표시가 있는 패턴
                            /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*승[^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*패[^0-9]*(\d+)/g,
                            // 스코어보드 패턴
                            /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)/g
                        ];
                        
                        for (const pattern of kboPatterns) {
                            let match;
                            while ((match = pattern.exec(bodyText)) !== null) {
                                const team1 = match[1];
                                const score1 = parseInt(match[2]);
                                const team2 = match[3];
                                const score2 = parseInt(match[4]);
                                
                                if (team1 !== team2 && !isNaN(score1) && !isNaN(score2) && 
                                    teams.includes(team1) && teams.includes(team2)) {
                                    
                                    games.push({
                                        source: 'KBO_OFFICIAL',
                                        team1, score1, team2, score2,
                                        winner: score1 > score2 ? team1 : team2,
                                        loser: score1 > score2 ? team2 : team1
                                    });
                                }
                            }
                        }
                        
                        // DOM 요소에서 직접 찾기
                        const scoreElements = document.querySelectorAll('[class*="score"], [class*="Score"], .teamT');
                        console.log('KBO 스코어 요소 개수:', scoreElements.length);
                        
                        return games;
                        
                    }, date);

                    console.log(`   ✅ KBO 공식에서 ${gameResults.length}개 경기 발견`);
                    
                    if (gameResults.length > 0) {
                        gameResults.forEach((game, i) => {
                            console.log(`      ${i+1}. ${game.team1} ${game.score1} - ${game.score2} ${game.team2}`);
                        });
                        return gameResults;
                    }
                    
                } catch (urlError) {
                    console.log(`   ❌ ${url} 실패: ${urlError.message}`);
                }
            }
            
            console.log('   ⚠️ KBO 공식 사이트에서 데이터를 찾을 수 없음');
            return [];
            
        } catch (error) {
            console.log(`❌ KBO 공식 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    // 2. 네이버 스포츠 크롤링 (기존)
    async crawlNaverSports(date) {
        console.log(`🔵 네이버 스포츠 크롤링 시도...`);
        
        try {
            const formattedDate = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${formattedDate}&category=kbo`;
            
            console.log(`📡 네이버 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const gameResults = await this.page.evaluate((targetDate) => {
                const games = [];
                const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                const bodyText = document.body.textContent || '';
                
                // 날짜 찾기 (7월 31일)
                const dateStr = targetDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일');
                const dateIndex = bodyText.indexOf(dateStr);
                
                if (dateIndex === -1) {
                    console.log(`네이버에서 ${dateStr}을 찾을 수 없음`);
                    return [];
                }
                
                const dateSection = bodyText.substring(dateIndex, dateIndex + 5000);
                console.log(`네이버 ${dateStr} 섹션 길이:`, dateSection.length);
                
                // 네이버 스포츠 패턴
                const naverPatterns = [
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)/g
                ];
                
                for (const pattern of naverPatterns) {
                    let match;
                    while ((match = pattern.exec(dateSection)) !== null) {
                        const team1 = match[1];
                        const score1 = parseInt(match[2]);
                        const team2 = match[3];
                        const score2 = parseInt(match[4]);
                        
                        if (team1 !== team2 && !isNaN(score1) && !isNaN(score2) && 
                            teams.includes(team1) && teams.includes(team2)) {
                            
                            games.push({
                                source: 'NAVER_SPORTS',
                                team1, score1, team2, score2,
                                winner: score1 > score2 ? team1 : team2,
                                loser: score1 > score2 ? team2 : team1
                            });
                        }
                    }
                }
                
                return games;
                
            }, formattedDate);

            console.log(`   ✅ 네이버에서 ${gameResults.length}개 경기 발견`);
            
            if (gameResults.length > 0) {
                gameResults.forEach((game, i) => {
                    console.log(`      ${i+1}. ${game.team1} ${game.score1} - ${game.score2} ${game.team2}`);
                });
            }
            
            return gameResults;
            
        } catch (error) {
            console.log(`❌ 네이버 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    // 3. 스포츠칸 크롤링
    async crawlSportsKhan(date) {
        console.log(`📰 스포츠칸 크롤링 시도...`);
        
        try {
            // 스포츠칸 KBO 스케줄 페이지
            const url = `https://sports.khan.co.kr/kbo/schedule`;
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 15000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const gameResults = await this.page.evaluate(() => {
                const games = [];
                const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                
                // 스포츠칸 특정 패턴
                const elements = document.querySelectorAll('.game-item, .match-item, [class*="score"]');
                
                elements.forEach(el => {
                    const text = el.textContent || '';
                    const teamMatches = text.match(/(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g);
                    const scoreMatches = text.match(/\d+/g);
                    
                    if (teamMatches && teamMatches.length >= 2 && scoreMatches && scoreMatches.length >= 2) {
                        const team1 = teamMatches[0];
                        const team2 = teamMatches[1];
                        const score1 = parseInt(scoreMatches[0]);
                        const score2 = parseInt(scoreMatches[1]);
                        
                        if (team1 !== team2 && !isNaN(score1) && !isNaN(score2)) {
                            games.push({
                                source: 'SPORTS_KHAN',
                                team1, score1, team2, score2,
                                winner: score1 > score2 ? team1 : team2,
                                loser: score1 > score2 ? team2 : team1
                            });
                        }
                    }
                });
                
                return games;
            });

            console.log(`   ✅ 스포츠칸에서 ${gameResults.length}개 경기 발견`);
            return gameResults;
            
        } catch (error) {
            console.log(`❌ 스포츠칸 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    // 결과 통합 및 검증
    mergeAndValidateResults(allResults) {
        console.log('\n🔄 다중 소스 결과 통합 및 검증...');
        
        const sourceResults = {
            KBO_OFFICIAL: allResults.filter(r => r.source === 'KBO_OFFICIAL'),
            NAVER_SPORTS: allResults.filter(r => r.source === 'NAVER_SPORTS'),
            SPORTS_KHAN: allResults.filter(r => r.source === 'SPORTS_KHAN')
        };
        
        console.log(`📊 소스별 결과:`);
        console.log(`   KBO 공식: ${sourceResults.KBO_OFFICIAL.length}개`);
        console.log(`   네이버: ${sourceResults.NAVER_SPORTS.length}개`);
        console.log(`   스포츠칸: ${sourceResults.SPORTS_KHAN.length}개`);
        
        // 우선순위: KBO 공식 > 네이버 > 스포츠칸
        let finalResults = [];
        
        if (sourceResults.KBO_OFFICIAL.length > 0) {
            console.log('✅ KBO 공식 데이터 사용');
            finalResults = sourceResults.KBO_OFFICIAL;
        } else if (sourceResults.NAVER_SPORTS.length > 0) {
            console.log('✅ 네이버 스포츠 데이터 사용');
            finalResults = sourceResults.NAVER_SPORTS;
        } else if (sourceResults.SPORTS_KHAN.length > 0) {
            console.log('✅ 스포츠칸 데이터 사용');
            finalResults = sourceResults.SPORTS_KHAN;
        }
        
        // 중복 제거 및 검증
        const uniqueGames = [];
        const gameKeys = new Set();
        
        for (const game of finalResults) {
            const key = `${game.team1}-${game.team2}-${game.score1}-${game.score2}`;
            if (!gameKeys.has(key)) {
                gameKeys.add(key);
                uniqueGames.push({
                    date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                    winner: game.winner,
                    loser: game.loser,
                    winnerScore: Math.max(game.score1, game.score2),
                    loserScore: Math.min(game.score1, game.score2),
                    awayTeam: game.team1,
                    homeTeam: game.team2,
                    awayScore: game.score1,
                    homeScore: game.score2,
                    source: game.source
                });
            }
        }
        
        console.log(`🎯 최종 검증된 경기: ${uniqueGames.length}개`);
        
        return uniqueGames;
    }

    updateRecords(gameResults) {
        console.log('\n📊 상대전적 업데이트...');
        
        try {
            const recordsPath = path.join(process.cwd(), 'kbo-records.json');
            let records = {};
            
            if (fs.existsSync(recordsPath)) {
                records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
            }

            if (!records.totalData) {
                records = {
                    lastUpdated: new Date().toISOString(),
                    updateDate: new Date().toLocaleDateString('ko-KR'),
                    totalData: {},
                    sources: []
                };
            }

            let addedGames = 0;
            const usedSources = new Set();

            gameResults.forEach((game) => {
                const { winner, loser } = game;
                
                if (!records.totalData[winner]) {
                    records.totalData[winner] = {};
                }
                if (!records.totalData[winner][loser]) {
                    records.totalData[winner][loser] = { wins: 0, losses: 0, draws: 0 };
                }
                if (!records.totalData[loser]) {
                    records.totalData[loser] = {};
                }
                if (!records.totalData[loser][winner]) {
                    records.totalData[loser][winner] = { wins: 0, losses: 0, draws: 0 };
                }

                records.totalData[winner][loser].wins++;
                records.totalData[loser][winner].losses++;
                
                usedSources.add(game.source);
                
                console.log(`   ✅ ${winner} vs ${loser}: ${records.totalData[winner][loser].wins}승 ${records.totalData[winner][loser].losses}패 [${game.source}]`);
                addedGames++;
            });

            records.lastUpdated = new Date().toISOString();
            records.updateDate = new Date().toLocaleDateString('ko-KR');
            records.sources = Array.from(usedSources);

            fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
            
            console.log(`\n📈 총 ${addedGames}개 경기 결과 추가`);
            console.log(`📡 사용된 소스: ${Array.from(usedSources).join(', ')}`);
            console.log(`💾 업데이트 완료: ${recordsPath}`);

            return { success: true, addedGames, sources: Array.from(usedSources) };

        } catch (error) {
            console.log(`❌ 기록 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    async crawlAllSources(targetDate) {
        console.log(`🎯 ${targetDate} 경기 결과 다중 소스 크롤링 시작`);
        
        try {
            await this.init();
            
            const allResults = [];
            
            // 1. KBO 공식 (최우선)
            const kboResults = await this.crawlKBOOfficial(targetDate);
            allResults.push(...kboResults);
            
            // 2. 네이버 스포츠
            const naverResults = await this.crawlNaverSports(targetDate);
            allResults.push(...naverResults);
            
            // 3. 스포츠칸
            const khanResults = await this.crawlSportsKhan(targetDate);
            allResults.push(...khanResults);
            
            // 결과 통합 및 검증
            const finalResults = this.mergeAndValidateResults(allResults);
            
            if (finalResults.length === 0) {
                console.log('⚠️ 모든 소스에서 경기 결과를 찾을 수 없음');
                return { success: false, message: '경기 결과 없음' };
            }
            
            // 상대전적 업데이트
            const updateResult = this.updateRecords(finalResults);
            
            if (updateResult.success) {
                console.log('\n🎉 다중 소스 크롤링 및 통합 성공!');
                return {
                    success: true,
                    addedGames: updateResult.addedGames,
                    sources: updateResult.sources,
                    gameResults: finalResults
                };
            } else {
                return { success: false, error: updateResult.error };
            }
            
        } catch (error) {
            console.error('❌ 다중 소스 크롤링 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new MultiSourceKBOCrawler();
    
    const targetDate = process.argv[2] || '20250731';
    
    console.log(`${'='.repeat(70)}`);
    console.log(`🕷️ 다중 소스 KBO 크롤링 시스템`);
    console.log(`📅 대상 날짜: ${targetDate}`);
    console.log(`🎯 소스 우선순위: KBO 공식 > 네이버 > 스포츠칸`);
    console.log(`${'='.repeat(70)}\n`);
    
    const result = await crawler.crawlAllSources(targetDate);
    
    console.log(`\n${'='.repeat(70)}`);
    if (result.success) {
        console.log('✅ 다중 소스 크롤링 완료!');
        console.log(`📊 총 ${result.addedGames}개 경기 결과 통합`);
        console.log(`📡 사용된 소스: ${result.sources.join(', ')}`);
    } else {
        console.log('❌ 크롤링 실패');
        console.log(`💬 원인: ${result.error || result.message}`);
    }
    console.log(`${'='.repeat(70)}`);
}

if (require.main === module) {
    main();
}

module.exports = MultiSourceKBOCrawler;