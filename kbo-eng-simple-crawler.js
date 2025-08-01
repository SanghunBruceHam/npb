#!/usr/bin/env node

/**
 * KBO 공식 영어 사이트 간단 크롤링
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class KBOEngSimpleCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🏟️ KBO 영어 사이트 간단 크롤링 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async testKBOEngSites() {
        const urls = [
            'http://eng.koreabaseball.com/Schedule/Scoreboard.aspx',
            'http://eng.koreabaseball.com/Schedule/DailySchedule.aspx'
        ];
        
        for (const url of urls) {
            console.log(`\n📡 접속: ${url}`);
            
            try {
                await this.page.goto(url, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000 
                });

                await new Promise(resolve => setTimeout(resolve, 5000));

                const fileName = url.includes('Scoreboard') ? 'kbo-scoreboard.png' : 'kbo-schedule.png';
                await this.page.screenshot({ path: fileName, fullPage: true });
                console.log(`📸 스크린샷: ${fileName}`);

                // 페이지 분석
                const analysis = await this.page.evaluate(() => {
                    const result = {
                        title: document.title,
                        tables: [],
                        textContent: document.body.textContent.substring(0, 1000)
                    };
                    
                    const tables = document.querySelectorAll('table');
                    console.log(`테이블 수: ${tables.length}`);
                    
                    tables.forEach((table, index) => {
                        const text = table.textContent || '';
                        const rows = table.querySelectorAll('tr');
                        
                        if (text.includes('KIA') || text.includes('LG') || text.includes('vs') || rows.length > 5) {
                            console.log(`테이블 ${index + 1}: ${rows.length}행, KBO 관련`);
                            
                            const tableData = {
                                index: index,
                                rowCount: rows.length,
                                className: table.className,
                                id: table.id,
                                sample: text.substring(0, 200)
                            };
                            
                            result.tables.push(tableData);
                        }
                    });
                    
                    return result;
                });

                console.log(`📊 ${analysis.title}`);
                console.log(`- 테이블: ${analysis.tables.length}개`);
                
                if (analysis.tables.length > 0) {
                    console.log('주요 테이블들:');
                    analysis.tables.forEach(table => {
                        console.log(`  테이블 ${table.index + 1}: ${table.rowCount}행 (${table.className})`);
                    });
                }
                
                // 결과 저장
                const resultFileName = url.includes('Scoreboard') ? 'kbo-scoreboard-analysis.json' : 'kbo-schedule-analysis.json';
                fs.writeFileSync(resultFileName, JSON.stringify(analysis, null, 2), 'utf8');
                console.log(`💾 ${resultFileName} 저장`);
                
            } catch (error) {
                console.error(`❌ ${url} 크롤링 실패: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log('\n🔍 15초간 브라우저에서 확인하세요...');
        await new Promise(resolve => setTimeout(resolve, 15000));
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
    const crawler = new KBOEngSimpleCrawler();
    
    try {
        await crawler.init();
        await crawler.testKBOEngSites();
        console.log('\n🎉 KBO 영어 사이트 크롤링 완료');
        
    } catch (error) {
        console.error('❌ 크롤링 중 오류:', error);
    } finally {
        await crawler.close();
    }
}

if (require.main === module) {
    main();
}