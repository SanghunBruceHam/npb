#!/usr/bin/env node
/**
 * 간단한 Yahoo!스포츠 NPB 2025 실제 데이터 크롤러
 * 테스트용 - 오늘 경기부터 시작
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class SimpleYahooNPBCrawler {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
    }

    async init() {
        await fs.mkdir(this.dataDir, { recursive: true });
    }

    async crawlDate(dateStr) {
        console.log(`🚀 ${dateStr} NPB 경기 크롤링 시작...`);
        
        const browser = await puppeteer.launch({
            headless: false,  // 브라우저 보이게 해서 확인
            args: ['--no-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            // 지정된 날짜 일정 확인
            const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${dateStr}`;
            
            console.log(`🌐 URL: ${url}`);
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 페이지 전체 텍스트 확인
            const pageText = await page.evaluate(() => {
                return document.body.innerText;
            });

            console.log('\n📄 페이지 내용 (처음 500자):');
            console.log(pageText.substring(0, 500));
            console.log('...\n');

            // 경기 정보 찾기 시도
            const games = await page.evaluate(() => {
                const results = [];
                
                // 다양한 선택자로 시도
                const selectors = [
                    '.bb-scoreBoard',
                    '.game-score',
                    '.sc-score',
                    '[class*="score"]',
                    '[class*="game"]',
                    'table tr'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    console.log(`시도: ${selector} - 발견: ${elements.length}개`);
                    
                    if (elements.length > 0) {
                        elements.forEach((element, index) => {
                            const text = element.textContent.trim();
                            if (text.length > 10 && text.length < 200) {
                                results.push({
                                    selector: selector,
                                    index: index,
                                    text: text,
                                    html: element.innerHTML.substring(0, 200)
                                });
                            }
                        });
                    }
                }

                return results;
            });

            console.log(`🎯 발견된 요소들: ${games.length}개`);
            
            games.forEach((game, index) => {
                console.log(`${index + 1}. [${game.selector}] ${game.text.substring(0, 100)}`);
            });

            // 스크린샷 저장
            const screenshotPath = path.join(this.dataDir, `yahoo-npb-${dateStr}-test.png`);
            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            console.log(`📸 스크린샷 저장: ${screenshotPath}`);

            return { games, pageText, screenshotPath };

        } catch (error) {
            console.error(`❌ 크롤링 에러: ${error.message}`);
            return null;
        } finally {
            await browser.close();
        }
    }

    async run() {
        // 개막일부터 시작
        const startDate = '2025-03-28';
        const result = await this.crawlDate(startDate);
        
        if (result) {
            // 결과 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const resultPath = path.join(this.dataDir, `yahoo-npb-${startDate}-${timestamp}.json`);
            
            await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf8');
            console.log(`✅ ${startDate} 결과 저장: ${resultPath}`);
            
            return true;
        }
        
        return false;
    }
}

async function main() {
    try {
        const crawler = new SimpleYahooNPBCrawler();
        await crawler.init();
        
        const success = await crawler.run();
        
        if (success) {
            console.log('\n🎉 테스트 크롤링 완료!');
        } else {
            console.log('\n❌ 테스트 실패');
        }
        
    } catch (error) {
        console.error('💥 에러:', error.message);
    }
}

main();