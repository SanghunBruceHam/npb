#!/usr/bin/env node

/**
 * Daum Sports KBO 크롤링 직접 테스트
 */

const puppeteer = require('puppeteer');

class DaumKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🏟️ Daum Sports KBO 직접 크롤링 테스트...\\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: false, // 브라우저 UI 표시로 디버깅
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async testDaumScraping(targetDate = '20250731') {
        try {
            console.log(`📡 다음 스포츠 KBO 스케줄 크롤링 테스트 (${targetDate})`);
            
            const url = `https://sports.daum.net/schedule/kbo?date=${targetDate}`;
            console.log(`🔗 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 스크린샷 저장
            await this.page.screenshot({ path: 'daum-debug.png', fullPage: true });
            console.log('📸 스크린샷 저장: daum-debug.png');

            // 페이지 구조 분석
            const results = await this.page.evaluate(() => {
                console.log('=== Daum Sports 페이지 분석 ===');
                console.log('URL:', window.location.href);
                console.log('Title:', document.title);
                
                // 모든 텍스트에서 KBO 팀명 찾기
                const teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
                const bodyText = document.body.textContent || '';
                
                console.log('페이지 전체 텍스트 길이:', bodyText.length);
                
                // 팀명 언급 횟수
                teams.forEach(team => {
                    const count = (bodyText.match(new RegExp(team, 'g')) || []).length;
                    if (count > 0) {
                        console.log(`팀 ${team}: ${count}회 언급`);
                    }
                });
                
                // 점수 패턴 찾기
                const scorePatterns = [
                    /(\d+)\\s*:\\s*(\d+)/g,  // 점수:점수
                    /(\d+)\\s*-\\s*(\d+)/g,  // 점수-점수
                    /스코어\\s*(\d+)/g        // 스코어N
                ];
                
                let scoreMatches = [];
                scorePatterns.forEach((pattern, i) => {
                    const matches = [...bodyText.matchAll(pattern)];
                    console.log(`점수 패턴 ${i + 1}: ${matches.length}개 발견`);
                    scoreMatches = scoreMatches.concat(matches.slice(0, 5)); // 처음 5개만
                });
                
                // DOM 구조 분석
                const possibleSelectors = [
                    '.match', '.game', '.schedule', '.result', '.score',
                    '[class*="match"]', '[class*="game"]', '[class*="schedule"]',
                    '[class*="result"]', '[class*="score"]', '[class*="team"]',
                    '.list_match', '.info_match', '.match_info',
                    '.schedule_list', '.game_list'
                ];
                
                const elementInfo = [];
                possibleSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`${selector}: ${elements.length}개 요소`);
                        elementInfo.push({
                            selector: selector,
                            count: elements.length,
                            sample: elements[0] ? elements[0].textContent?.substring(0, 100) : ''
                        });
                    }
                });
                
                // 테이블 찾기
                const tables = document.querySelectorAll('table');
                console.log(`테이블: ${tables.length}개`);
                
                tables.forEach((table, i) => {
                    const text = table.textContent?.substring(0, 200);
                    const hasTeams = teams.some(team => text?.includes(team));
                    if (hasTeams) {
                        console.log(`테이블 ${i + 1}: KBO 팀명 포함`);
                    }
                });
                
                // 리스트 찾기
                const lists = document.querySelectorAll('ul, ol');
                console.log(`리스트: ${lists.length}개`);
                
                // 경기 결과 추출 시도
                const gameResults = [];
                
                // 방법 1: 클래스명 기반
                const gameElements = document.querySelectorAll('[class*="game"], [class*="match"], [class*="schedule"]');
                gameElements.forEach((element, i) => {
                    const text = element.textContent?.trim();
                    if (text && teams.some(team => text.includes(team))) {
                        const scoreMatch = text.match(/(\\d+)\\s*[:-]\\s*(\\d+)/);
                        if (scoreMatch) {
                            gameResults.push({
                                element: `game${i + 1}`,
                                text: text.substring(0, 100),
                                score: scoreMatch[0]
                            });
                        }
                    }
                });
                
                return {
                    url: window.location.href,
                    title: document.title,
                    bodyLength: bodyText.length,
                    elementInfo: elementInfo,
                    tableCount: tables.length,
                    listCount: lists.length,
                    gameResults: gameResults,
                    scoreMatches: scoreMatches.map(m => m[0]).slice(0, 10)
                };
            });

            console.log('\\n📊 Daum Sports 분석 결과:');
            console.log(`- URL: ${results.url}`);
            console.log(`- 제목: ${results.title}`);
            console.log(`- 텍스트 길이: ${results.bodyLength}`);
            console.log(`- 테이블 수: ${results.tableCount}`);
            console.log(`- 리스트 수: ${results.listCount}`);
            console.log(`- 발견된 요소들:`);
            
            if (results.elementInfo.length > 0) {
                results.elementInfo.forEach(info => {
                    console.log(`  ${info.selector}: ${info.count}개`);
                    if (info.sample) {
                        console.log(`    샘플: ${info.sample.substring(0, 50)}...`);
                    }
                });
            } else {
                console.log('  관련 요소 없음');
            }
            
            console.log(`- 경기 결과: ${results.gameResults.length}개`);
            results.gameResults.forEach((game, i) => {
                console.log(`  ${i + 1}. ${game.text}`);
            });
            
            console.log(`- 점수 패턴: ${results.scoreMatches.length}개`);
            results.scoreMatches.forEach((score, i) => {
                console.log(`  ${i + 1}. ${score}`);
            });

        } catch (error) {
            console.error(`❌ Daum 크롤링 실패: ${error.message}`);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }
}

// 실행
async function main() {
    const crawler = new DaumKBOCrawler();
    
    try {
        await crawler.init();
        await crawler.testDaumScraping('20250731');
        
        // 5초 후 자동 종료
        setTimeout(async () => {
            await crawler.close();
            process.exit(0);
        }, 5000);
        
    } catch (error) {
        console.error('❌ 테스트 중 오류:', error);
        await crawler.close();
    }
}

if (require.main === module) {
    main();
}