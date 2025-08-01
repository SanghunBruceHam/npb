#!/usr/bin/env node

/**
 * Puppeteer를 사용한 KBO 경기 결과 크롤링 테스트
 * JavaScript가 로드된 후 실제 DOM 데이터 수집
 */

const puppeteer = require('puppeteer');

class KBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🤖 Puppeteer KBO 크롤링 테스트 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: true, // false로 하면 브라우저 창이 보임
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // User-Agent 설정
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 뷰포트 설정
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async crawlNaverSports(date) {
        try {
            // 날짜 형식 변환 (20250731 -> 2025-07-31)
            const formattedDate = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${formattedDate}&category=kbo`;
            
            console.log(`🔵 네이버 스포츠 크롤링: ${url}`);
            
            // 페이지 로드
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // 페이지가 완전히 로드될 때까지 대기
            console.log('⏳ 페이지 로딩 대기...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 경기 데이터 추출
            const games = await this.page.evaluate(() => {
                const gameElements = document.querySelectorAll('.MatchBox, .match-box, .game-item, [class*="match"], [class*="game"]');
                console.log('게임 요소 개수:', gameElements.length);
                
                const results = [];
                
                // 다양한 선택자로 시도
                const selectors = [
                    '.MatchBox',
                    '.match-box', 
                    '.game-item',
                    '[class*="match"]',
                    '[class*="game"]',
                    '[class*="schedule"]'
                ];
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`${selector}: ${elements.length}개 발견`);
                        
                        elements.forEach((element, i) => {
                            const text = element.textContent || '';
                            const teamMatches = text.match(/(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g);
                            const scoreMatches = text.match(/\d+/g);
                            
                            if (teamMatches && teamMatches.length >= 2) {
                                results.push({
                                    selector: selector,
                                    index: i,
                                    text: text.trim(),
                                    teams: teamMatches,
                                    scores: scoreMatches
                                });
                            }
                        });
                    }
                }
                
                // 텍스트에서 직접 찾기
                const bodyText = document.body.textContent || '';
                const gamePattern = /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)\s*(\d+)\s*[-:]\s*(\d+)\s*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g;
                let match;
                while ((match = gamePattern.exec(bodyText)) !== null) {
                    results.push({
                        selector: 'textPattern',
                        awayTeam: match[1],
                        awayScore: parseInt(match[2]),
                        homeScore: parseInt(match[3]),
                        homeTeam: match[4]
                    });
                }
                
                return results;
            });
            
            console.log(`✅ 네이버에서 ${games.length}개 게임 데이터 발견`);
            games.forEach((game, i) => {
                console.log(`   ${i+1}. ${JSON.stringify(game)}`);
            });
            
            return games;
            
        } catch (error) {
            console.log(`❌ 네이버 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    async crawlKBOOfficial(date) {
        try {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?GameDate=${date}`;
            console.log(`🏟️ KBO 공식 사이트 크롤링: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            console.log('⏳ 페이지 로딩 대기...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 스크린샷 찍기 (디버깅용)
            await this.page.screenshot({ path: `kbo-screenshot-${date}.png` });
            console.log(`📸 스크린샷 저장: kbo-screenshot-${date}.png`);
            
            // 경기 데이터 추출
            const games = await this.page.evaluate(() => {
                const results = [];
                
                // KBO 사이트의 다양한 선택자 시도
                const selectors = [
                    '.smsScore',
                    '.gameInfo',
                    '.teamT',
                    '[class*="team"]',
                    '[class*="score"]',
                    '[class*="game"]'
                ];
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`KBO ${selector}: ${elements.length}개 발견`);
                    }
                }
                
                // 팀명 찾기
                const teamElements = document.querySelectorAll('.teamT, strong[class*="teamT"]');
                console.log('팀명 요소:', teamElements.length);
                
                const teams = [];
                teamElements.forEach(el => {
                    const teamName = el.textContent.trim();
                    if (['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'].includes(teamName)) {
                        teams.push(teamName);
                    }
                });
                
                // 점수 찾기
                const scoreElements = document.querySelectorAll('[class*="Score"], .score');
                const scores = [];
                scoreElements.forEach(el => {
                    const score = parseInt(el.textContent.trim());
                    if (!isNaN(score)) {
                        scores.push(score);
                    }
                });
                
                // 게임 상태 찾기
                const stateElements = document.querySelectorAll('[class*="GameState"], [class*="State"]');
                const states = [];
                stateElements.forEach(el => {
                    const state = el.textContent.trim();
                    if (['경기전', '경기중', '경기종료'].includes(state)) {
                        states.push(state);
                    }
                });
                
                // 페이지 전체 텍스트에서 패턴 찾기
                const bodyText = document.body.textContent || '';
                const finishedGamePattern = /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화).*?(\d+).*?(\d+).*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화).*?경기종료/g;
                let match;
                while ((match = finishedGamePattern.exec(bodyText)) !== null) {
                    results.push({
                        awayTeam: match[1],
                        awayScore: parseInt(match[2]),
                        homeScore: parseInt(match[3]),
                        homeTeam: match[4],
                        status: '경기종료'
                    });
                }
                
                return {
                    results,
                    teams,
                    scores,
                    states,
                    debug: {
                        bodyTextLength: bodyText.length,
                        teamElements: teamElements.length,
                        scoreElements: scoreElements.length
                    }
                };
            });
            
            console.log(`✅ KBO 공식에서 데이터 수집:`);
            console.log(`   팀명: ${games.teams.length}개 (${games.teams.join(', ')})`);
            console.log(`   점수: ${games.scores.length}개 (${games.scores.join(', ')})`);
            console.log(`   상태: ${games.states.length}개 (${games.states.join(', ')})`);
            console.log(`   완료 경기: ${games.results.length}개`);
            
            games.results.forEach((game, i) => {
                console.log(`   ${i+1}. ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam} (${game.status})`);
            });
            
            return games.results;
            
        } catch (error) {
            console.log(`❌ KBO 공식 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    async crawlMultipleSources(date) {
        console.log(`🎯 ${date} 날짜의 경기 결과를 여러 소스에서 크롤링`);
        
        const allResults = [];
        
        // 1. 네이버 스포츠
        const naverResults = await this.crawlNaverSports(date);
        if (naverResults.length > 0) {
            allResults.push(...naverResults.map(r => ({...r, source: 'naver'})));
        }
        
        // 2. KBO 공식
        const kboResults = await this.crawlKBOOfficial(date);
        if (kboResults.length > 0) {
            allResults.push(...kboResults.map(r => ({...r, source: 'kbo'})));
        }
        
        return allResults;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    async testCrawling(testDate = '20250731') {
        try {
            await this.init();
            
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🕷️ ${testDate} KBO 경기 결과 크롤링 테스트`);
            console.log(`${'='.repeat(60)}`);
            
            const results = await this.crawlMultipleSources(testDate);
            
            console.log(`\n🎉 총 ${results.length}개 결과 수집:`);
            
            if (results.length > 0) {
                results.forEach((result, i) => {
                    console.log(`\n${i+1}. [${result.source}] ${JSON.stringify(result, null, 2)}`);
                });
            } else {
                console.log('😞 수집된 경기 결과가 없습니다.');
                console.log('   - JavaScript 로딩 시간이 부족할 수 있음');
                console.log('   - 사이트 구조가 변경되었을 수 있음');
                console.log('   - 해당 날짜에 경기가 없거나 아직 완료되지 않음');
            }
            
        } catch (error) {
            console.error('❌ 크롤링 테스트 중 오류:', error);
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new KBOCrawler();
    
    // 명령행에서 날짜 받기 (기본값: 20250731)
    const testDate = process.argv[2] || '20250731';
    
    await crawler.testCrawling(testDate);
}

if (require.main === module) {
    main();
}

module.exports = KBOCrawler;