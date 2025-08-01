#!/usr/bin/env node

/**
 * Google KBO 검색 결과 크롤링 테스트
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class GoogleKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🔍 Google KBO 검색 결과 크롤링 테스트 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: false,
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

    async testGoogleKBO() {
        try {
            // 다양한 KBO 관련 검색어 테스트
            const searchQueries = [
                'KBO 경기 결과',
                'KBO 일정',
                'KBO 야구 오늘',
                'kbo baseball results',
                'KBO 7월 경기'
            ];

            const allResults = [];

            for (const query of searchQueries) {
                console.log(`\n📡 구글 검색: "${query}"`);
                
                const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                console.log(`🔗 URL: ${url}`);
                
                await this.page.goto(url, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000 
                });

                await new Promise(resolve => setTimeout(resolve, 3000));

                // 스크린샷 저장
                await this.page.screenshot({ 
                    path: `google-kbo-${query.replace(/[^가-힣a-zA-Z0-9]/g, '_')}.png`, 
                    fullPage: true 
                });

                // 스포츠 결과 추출
                const searchResults = await this.page.evaluate((searchQuery) => {
                    console.log(`=== 구글 검색 결과 분석: ${searchQuery} ===`);
                    
                    const results = {
                        query: searchQuery,
                        sportsCards: [],
                        gameResults: [],
                        scheduleInfo: []
                    };
                    
                    // 스포츠 카드 찾기
                    const sportsCards = document.querySelectorAll('[data-entityname], [jsname*="sports"], .sports, .match-tile');
                    console.log(`스포츠 카드 후보: ${sportsCards.length}개`);
                    
                    sportsCards.forEach((card, index) => {
                        const cardText = card.textContent?.trim() || '';
                        if (cardText.length > 10) {
                            console.log(`카드 ${index + 1}: ${cardText.substring(0, 100)}`);
                            results.sportsCards.push({
                                index: index,
                                text: cardText.substring(0, 200),
                                className: card.className,
                                hasKBO: cardText.includes('KBO') || cardText.includes('야구')
                            });
                        }
                    });
                    
                    // 특정 패턴으로 경기 결과 찾기
                    const teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화'];
                    const allText = document.body.textContent || '';
                    
                    // 점수 패턴 찾기
                    const scoreMatches = [...allText.matchAll(/(\d+)\s*[-:]\s*(\d+)/g)];
                    console.log(`점수 패턴 발견: ${scoreMatches.length}개`);
                    
                    scoreMatches.slice(0, 10).forEach((match, index) => {
                        const context = allText.substring(Math.max(0, match.index - 50), match.index + 50);
                        const hasTeam = teams.some(team => context.includes(team));
                        
                        if (hasTeam) {
                            console.log(`경기 가능성 ${index + 1}: ${context}`);
                            results.gameResults.push({
                                score: match[0],
                                context: context,
                                fullMatch: match[0]
                            });
                        }
                    });
                    
                    // 구글 스포츠 위젯 찾기
                    const sportsWidgets = document.querySelectorAll('.sports-widget, .match-info, .game-info, [role="listitem"]');
                    console.log(`스포츠 위젯: ${sportsWidgets.length}개`);
                    
                    sportsWidgets.forEach((widget, index) => {
                        const widgetText = widget.textContent?.trim() || '';
                        const hasKBOContent = teams.some(team => widgetText.includes(team)) || 
                                            widgetText.includes('KBO') || 
                                            widgetText.includes('야구');
                        
                        if (hasKBOContent && widgetText.length > 20) {
                            console.log(`KBO 위젯 ${index + 1}: ${widgetText.substring(0, 100)}`);
                            results.scheduleInfo.push({
                                index: index,
                                text: widgetText.substring(0, 300),
                                className: widget.className
                            });
                        }
                    });
                    
                    // 테이블 찾기
                    const tables = document.querySelectorAll('table');
                    console.log(`테이블 수: ${tables.length}`);
                    
                    tables.forEach((table, index) => {
                        const tableText = table.textContent || '';
                        const hasKBOContent = teams.some(team => tableText.includes(team));
                        
                        if (hasKBOContent) {
                            console.log(`KBO 테이블 ${index + 1} 발견`);
                            const rows = table.querySelectorAll('tr');
                            
                            Array.from(rows).slice(0, 5).forEach((row, rowIndex) => {
                                const rowText = row.textContent?.trim() || '';
                                if (rowText.length > 10) {
                                    console.log(`  행 ${rowIndex + 1}: ${rowText}`);
                                    results.scheduleInfo.push({
                                        index: `table${index + 1}_row${rowIndex + 1}`,
                                        text: rowText,
                                        type: 'table_row'
                                    });
                                }
                            });
                        }
                    });
                    
                    return results;
                }, query);

                console.log(`📊 "${query}" 검색 결과:`);
                console.log(`- 스포츠 카드: ${searchResults.sportsCards.length}개`);
                console.log(`- 경기 결과: ${searchResults.gameResults.length}개`);
                console.log(`- 스케줄 정보: ${searchResults.scheduleInfo.length}개`);

                allResults.push(searchResults);

                // 다음 검색 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 결과 정리 및 저장
            const summary = {
                timestamp: new Date().toISOString(),
                searchQueries: searchQueries,
                totalResults: allResults.length,
                results: allResults
            };

            fs.writeFileSync('google-kbo-results.json', JSON.stringify(summary, null, 2), 'utf8');
            console.log('\n💾 google-kbo-results.json에 결과 저장 완료');

            // 가장 유용한 결과 출력
            console.log('\n📋 구글 KBO 검색 결과 요약:');
            allResults.forEach((result, index) => {
                console.log(`\n${index + 1}. "${result.query}"`);
                
                if (result.gameResults.length > 0) {
                    console.log('  🏟️ 경기 결과:');
                    result.gameResults.slice(0, 3).forEach((game, i) => {
                        console.log(`    ${i + 1}. ${game.score} - ${game.context.substring(0, 50)}...`);
                    });
                }
                
                if (result.scheduleInfo.length > 0) {
                    console.log('  📅 스케줄 정보:');
                    result.scheduleInfo.slice(0, 3).forEach((info, i) => {
                        console.log(`    ${i + 1}. ${info.text.substring(0, 60)}...`);
                    });
                }
            });

            console.log('\n🔍 15초간 브라우저에서 결과를 확인하세요...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            return allResults;

        } catch (error) {
            console.error(`❌ Google 크롤링 실패: ${error.message}`);
            return [];
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
    const crawler = new GoogleKBOCrawler();
    
    try {
        await crawler.init();
        const results = await crawler.testGoogleKBO();
        
        if (results.length > 0) {
            console.log(`\n🎉 Google에서 ${results.length}개 검색 완료`);
            console.log('📄 google-kbo-results.json 파일을 확인하세요.');
        } else {
            console.log('\n⚠️ Google에서 데이터를 찾지 못했습니다.');
        }
        
    } catch (error) {
        console.error('❌ 크롤링 중 오류:', error);
    } finally {
        await crawler.close();
    }
}

if (require.main === module) {
    main();
}