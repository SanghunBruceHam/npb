#!/usr/bin/env node
/**
 * NPB 2025년 실제 데이터 크롤러
 * NPB 공식사이트, Yahoo 스포츠에서 2025년 실제 경기결과 크롤링
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class NPB2025RealCrawler {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.screenshotDir = path.join(this.dataDir, 'screenshots');
        
        // 2025년 NPB 팀 매핑
        this.teamMapping = {
            '読売ジャイアンツ': '巨人',
            'ジャイアンツ': '巨人',
            '巨人': '巨人',
            '阪神タイガース': '阪神',
            'タイガース': '阪神',
            '阪神': '阪神',
            '横浜DeNAベイスターズ': 'DeNA',
            'ベイスターズ': 'DeNA',
            'DeNA': 'DeNA',
            '広島東洋カープ': '広島',
            'カープ': '広島',
            '広島': '広島',
            '中日ドラゴンズ': '中日',
            'ドラゴンズ': '中日',
            '中日': '中日',
            'ヤクルトスワローズ': 'ヤクルト',
            'スワローズ': 'ヤクルト',
            'ヤクルト': 'ヤクルト',
            'オリックス・バファローズ': 'オリックス',
            'バファローズ': 'オリックス',
            'オリックス': 'オリックス',
            '千葉ロッテマリーンズ': 'ロッテ',
            'マリーンズ': 'ロッテ',
            'ロッテ': 'ロッテ',
            '福岡ソフトバンクホークス': 'ソフトバンク',
            'ホークス': 'ソフトバンク',
            'ソフトバンク': 'ソフトバンク',
            '北海道日本ハムファイターズ': '日本ハム',
            'ファイターズ': '日本ハム',
            '日本ハム': '日本ハム',
            '東北楽天ゴールデンイーグルス': '楽天',
            'イーグルス': '楽天',
            '楽天': '楽天',
            '埼玉西武ライオンズ': '西武',
            'ライオンズ': '西武',
            '西武': '西武'
        };
    }

    async init() {
        await fs.mkdir(this.dataDir, { recursive: true });
        await fs.mkdir(this.screenshotDir, { recursive: true });
    }

    normalizeTeamName(teamName) {
        // 팀명 정규화
        for (const [key, value] of Object.entries(this.teamMapping)) {
            if (teamName.includes(key)) {
                return value;
            }
        }
        return teamName;
    }

    async crawlNPBOfficial2025(date) {
        console.log(`🏟️ ${date} NPB 공식사이트에서 실제 데이터 크롤링...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            // NPB 공식 일정 페이지
            const dateStr = date.replace(/-/g, '/');
            const url = `https://npb.jp/games/${date.substring(0, 4)}/schedule_detail_${date.replace(/-/g, '')}.html`;
            
            console.log(`🌐 NPB 공식: ${url}`);
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // 스크리ーン샷 저장
            const screenshotPath = path.join(
                this.screenshotDir,
                `npb_official_2025_${date.replace(/-/g, '')}_${Date.now()}.png`
            );
            
            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            
            console.log(`📸 NPB 공식 스크린샷 저장: ${screenshotPath}`);

            // 경기 데이터 추출
            const games = await page.evaluate(() => {
                const results = [];
                
                // NPB 공식사이트 경기결과 셀렉터들
                const gameSelectors = [
                    '.game-score',
                    '.score-table',
                    '.schedule-score',
                    '.game-result',
                    'table.score tr'
                ];

                for (const selector of gameSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach(element => {
                            const text = element.textContent.trim();
                            // 점수 패턴 찾기
                            if (text.match(/\d+.*[：:-].*\d+/) || text.includes('vs')) {
                                results.push({
                                    text: text,
                                    html: element.innerHTML
                                });
                            }
                        });
                        if (results.length > 0) break;
                    }
                }

                return results;
            });

            return { games, screenshotPath, source: 'NPB公式' };

        } catch (error) {
            console.error(`❌ NPB 공식사이트 크롤링 실패: ${error.message}`);
            return { games: [], screenshotPath: null, source: 'NPB公式' };
        } finally {
            await browser.close();
        }
    }

    async crawlYahooSports2025(date) {
        console.log(`⚾ ${date} Yahoo!스포츠에서 실제 데이터 크롤링...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            // Yahoo 스포츠 NPB 일정
            const dateStr = date.replace(/-/g, '');
            const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${dateStr}`;
            
            console.log(`🌐 Yahoo: ${url}`);
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // 스크리이샷 저장
            const screenshotPath = path.join(
                this.screenshotDir,
                `yahoo_npb_2025_${dateStr}_${Date.now()}.png`
            );
            
            await page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            
            console.log(`📸 Yahoo 스크린샷 저장: ${screenshotPath}`);

            // 경기 데이터 추출
            const games = await page.evaluate(() => {
                const results = [];
                
                // Yahoo 스포츠 경기결과 셀렉터들
                const selectors = [
                    '.bb-score__content',
                    '.sc-score__content', 
                    '[data-testid="game-score"]',
                    '.game-score',
                    '.score-board',
                    '.bb-gameScore__content',
                    'table.bb-score',
                    '.yjMS'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach(element => {
                            const text = element.textContent.trim();
                            // 경기 결과 패턴 확인
                            if (text.match(/\d+.*[：:-].*\d+/) || text.includes('vs') || text.includes('対')) {
                                results.push({
                                    text: text,
                                    html: element.innerHTML
                                });
                            }
                        });
                        if (results.length > 0) break;
                    }
                }

                // 전체 페이지 텍스트에서 패턴 찾기
                if (results.length === 0) {
                    const pageText = document.body.innerText;
                    const lines = pageText.split('\n');
                    
                    for (const line of lines) {
                        // NPB 팀명과 점수 패턴 찾기
                        if (line.match(/(巨人|阪神|DeNA|広島|中日|ヤクルト|オリックス|ロッテ|ソフトバンク|日本ハム|楽天|西武).*\d+.*[：:-].*\d+/)) {
                            results.push({
                                text: line.trim(),
                                html: line.trim()
                            });
                        }
                    }
                }

                return results;
            });

            const pageText = await page.evaluate(() => document.body.innerText);

            return { 
                games, 
                screenshotPath, 
                source: 'Yahoo!スポーツ',
                pageText: pageText.substring(0, 1000)
            };

        } catch (error) {
            console.error(`❌ Yahoo 스포츠 크롤링 실패: ${error.message}`);
            return { games: [], screenshotPath: null, source: 'Yahoo!スポーツ', pageText: '' };
        } finally {
            await browser.close();
        }
    }

    async crawl2025RealGames() {
        console.log('🚀 NPB 2025년 실제 경기결과 크롤링 시작...');

        // 2025년 3월부터 현재까지의 날짜
        const startDate = new Date('2025-03-28'); // 개막일
        const endDate = new Date(); // 오늘까지
        
        const dates = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0]);
        }

        console.log(`📅 크롤링 기간: ${dates[0]} ~ ${dates[dates.length-1]} (총 ${dates.length}일)`);

        const results = [];

        for (const date of dates.slice(0, 10)) { // 처음 10일만 테스트
            console.log(`\n📊 ${date} 경기 데이터 수집...`);
            
            // NPB 공식사이트와 Yahoo 동시 크롤링
            const npbResult = await this.crawlNPBOfficial2025(date);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const yahooResult = await this.crawlYahooSports2025(date);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 결과 통합
            const allGames = [...npbResult.games, ...yahooResult.games];
            const screenshots = [npbResult.screenshotPath, yahooResult.screenshotPath].filter(Boolean);

            results.push({
                date,
                games: allGames,
                screenshots,
                sources: [npbResult.source, yahooResult.source],
                pageText: yahooResult.pageText || ''
            });

            console.log(`✅ ${date}: 경기 ${allGames.length}개, 스크린샷 ${screenshots.length}개`);
        }

        return results;
    }

    async saveRealData(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // TXT 형식 저장
        const txtLines = [];
        txtLines.push('# NPB 2025年 実際の試合結果');
        txtLines.push(`# 取得日時: ${new Date().toLocaleString('ja-JP')}`);
        txtLines.push('# データソース: NPB公式サイト, Yahoo!スポーツ');
        txtLines.push('');

        results.forEach(dayResult => {
            if (dayResult.games.length > 0) {
                txtLines.push(dayResult.date);
                
                dayResult.games.forEach(game => {
                    // 텍스트에서 경기 결과 추출 및 포맷팅
                    let gameText = game.text;
                    
                    // 팀명 정규화
                    for (const [original, normalized] of Object.entries(this.teamMapping)) {
                        gameText = gameText.replace(new RegExp(original, 'g'), normalized);
                    }
                    
                    txtLines.push(gameText);
                });
                
                txtLines.push('');
            }
        });

        const txtPath = path.join(this.dataDir, `npb-2025-real-games-${timestamp}.txt`);
        await fs.writeFile(txtPath, txtLines.join('\n'), 'utf8');

        // JSON 형식 저장
        const jsonPath = path.join(this.dataDir, `npb-2025-real-games-${timestamp}.json`);
        await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');

        console.log(`\n✅ 실제 데이터 저장:`);
        console.log(`   TXT: ${txtPath}`);
        console.log(`   JSON: ${jsonPath}`);

        return { txtPath, jsonPath };
    }

    async run() {
        console.log('🏟️ NPB 2025년 실제 데이터 크롤러 시작...');
        
        const results = await this.crawl2025RealGames();
        
        if (results.length > 0) {
            await this.saveRealData(results);
            
            console.log('\n📊 크롤링 결과:');
            console.log(`   수집일수: ${results.length}일`);
            console.log(`   총 경기: ${results.reduce((sum, r) => sum + r.games.length, 0)}개`);
            console.log(`   스크린샷: ${results.reduce((sum, r) => sum + r.screenshots.length, 0)}개`);
            
            return true;
        }

        return false;
    }
}

async function main() {
    try {
        const crawler = new NPB2025RealCrawler();
        await crawler.init();

        console.log('🚀 NPB 2025년 실제 데이터 크롤링 시작...');
        const success = await crawler.run();
        
        if (success) {
            console.log('\n🎉 NPB 2025년 실제 데이터 크롤링 완료!');
            console.log('📁 데이터 파일과 스크린샷을 확인하세요.');
        } else {
            console.log('\n❌ 실제 데이터 크롤링에 실패했습니다.');
        }

        process.exit(0);

    } catch (error) {
        console.error('💥 크롤링 에러:', error.message);
        process.exit(1);
    }
}

main();