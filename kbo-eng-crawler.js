#!/usr/bin/env node

/**
 * KBO 공식 영어 사이트 크롤링 테스트
 * http://eng.koreabaseball.com/Schedule/DailySchedule.aspx
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class KBOEngCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KIA': 'KIA',
            'KT': 'KT',
            'LG': 'LG',
            'NC': 'NC',
            'SSG': 'SSG',
            'Doosan': '두산',
            'Lotte': '롯데',
            'Samsung': '삼성',
            'Kiwoom': '키움',
            'Hanwha': '한화'
        };
        console.log('🏟️ KBO 공식 영어 사이트 크롤링 테스트 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: false, // 디버깅을 위해 브라우저 표시
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

    async testKBOEngSite() {
        try {
            // 두 개의 URL 테스트
            const urls = [
                'http://eng.koreabaseball.com/Schedule/Scoreboard.aspx',
                'http://eng.koreabaseball.com/Schedule/DailySchedule.aspx'
            ];
            
            const allResults = [];
            
            for (const url of urls) {
                console.log(`\n📡 KBO 영어 사이트 접속: ${url}`);
                
                await this.page.goto(url, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000 
                });

                // 페이지 로딩 대기
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 스크린샷 저장
                const fileName = url.includes('Scoreboard') ? 'kbo-eng-scoreboard-debug.png' : 'kbo-eng-schedule-debug.png';
                await this.page.screenshot({ path: fileName, fullPage: true });
                console.log(`📸 KBO 영어 사이트 스크린샷 저장: ${fileName}`);

                // 페이지 구조 분석
                const pageAnalysis = await this.page.evaluate((currentUrl) => {
                console.log('=== KBO 영어 사이트 구조 분석 ===');
                
                const analysis = {
                    title: document.title,
                    url: window.location.href,
                    tables: [],
                    scheduleElements: [],
                    gameResults: []
                };
                
                // 모든 테이블 분석
                const tables = document.querySelectorAll('table');
                console.log(`총 테이블 수: ${tables.length}`);
                
                tables.forEach((table, index) => {
                    const tableText = table.textContent || '';
                    const rows = table.querySelectorAll('tr');
                    const hasGameContent = tableText.includes('KIA') || tableText.includes('LG') || 
                                         tableText.includes('Schedule') || tableText.includes('vs');
                    
                    if (hasGameContent || tableText.length > 100) {
                        console.log(`테이블 ${index + 1}: 게임 관련 (${rows.length}행)`);
                        
                        const tableInfo = {
                            index: index,
                            rowCount: rows.length,
                            className: table.className,
                            id: table.id,
                            sample: tableText.substring(0, 200),
                            hasGameContent: hasGameContent
                        };
                        
                        analysis.tables.push(tableInfo);
                        
                        // 각 행 분석 (처음 10개만)
                        Array.from(rows).slice(0, 10).forEach((row, rowIndex) => {
                            const cells = row.querySelectorAll('td, th');
                            if (cells.length > 0) {
                                const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
                                const rowText = cellTexts.join(' | ');
                                
                                if (rowText.length > 10) {
                                    console.log(`  행 ${rowIndex}: ${rowText}`);
                                }
                            }
                        });
                    }
                });
                
                // 스케줄 관련 요소 찾기
                const scheduleSelectors = [
                    '[class*="schedule"]', '[id*="schedule"]',
                    '[class*="game"]', '[id*="game"]',
                    '[class*="match"]', '[id*="match"]'
                ];
                
                scheduleSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`${selector}: ${elements.length}개 요소`);
                        
                        Array.from(elements).slice(0, 5).forEach((element, index) => {
                            const text = element.textContent?.trim() || '';
                            if (text.length > 20) {
                                analysis.scheduleElements.push({
                                    selector: selector,
                                    index: index,
                                    text: text.substring(0, 150),
                                    className: element.className,
                                    id: element.id
                                });
                            }
                        });
                    }
                });
                
                // 경기 결과 패턴 찾기
                const bodyText = document.body.textContent || '';
                const teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', 'Doosan', 'Lotte', 'Samsung', 'Kiwoom', 'Hanwha'];
                
                // 점수 패턴과 팀명이 함께 있는 부분 찾기
                const scorePattern = /(\d+)\s*[-:]\s*(\d+)/g;
                let match;
                while ((match = scorePattern.exec(bodyText)) !== null) {
                    const startPos = Math.max(0, match.index - 100);
                    const endPos = Math.min(bodyText.length, match.index + 100);
                    const context = bodyText.substring(startPos, endPos);
                    
                    const foundTeams = teams.filter(team => context.includes(team));
                    if (foundTeams.length >= 2) {
                        analysis.gameResults.push({
                            score: match[0],
                            teams: foundTeams,
                            context: context.trim()
                        });
                        
                        console.log(`경기 발견: ${match[0]} - ${foundTeams.join(' vs ')}`);
                        
                        if (analysis.gameResults.length >= 10) break; // 최대 10개만
                    }
                }
                
                return analysis;
            });

            console.log('\n📊 KBO 영어 사이트 분석 결과:');
            console.log(`- 제목: ${pageAnalysis.title}`);
            console.log(`- 테이블 수: ${pageAnalysis.tables.length}개`);
            console.log(`- 스케줄 요소: ${pageAnalysis.scheduleElements.length}개`);
            console.log(`- 경기 결과: ${pageAnalysis.gameResults.length}개`);

            // 가장 유력한 테이블에서 데이터 추출 시도
            if (pageAnalysis.tables.length > 0) {
                const games = await this.extractGamesFromTables();
                console.log(`\n🎯 추출된 경기: ${games.length}개`);
                
                if (games.length > 0) {
                    // Clean.txt 형식으로 변환
                    const cleanFormat = this.convertToCleanFormat(games);
                    
                    // 파일 저장
                    fs.writeFileSync('kbo-eng-result.txt', cleanFormat, 'utf8');
                    console.log('💾 kbo-eng-result.txt에 저장 완료');
                    
                    // 결과 출력
                    console.log('\n📋 추출된 경기 결과:');
                    games.forEach((game, index) => {
                        console.log(`${index + 1}. ${game.date}: ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam}`);
                    });
                }
                
                return games;
            }

            // 결과 저장
            fs.writeFileSync('kbo-eng-analysis.json', JSON.stringify(pageAnalysis, null, 2), 'utf8');
            console.log('💾 kbo-eng-analysis.json에 분석 결과 저장');

            console.log('\n🔍 15초간 브라우저에서 페이지를 확인하세요...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            return pageAnalysis;

        } catch (error) {
            console.error(`❌ KBO 영어 사이트 크롤링 실패: ${error.message}`);
            return null;
        }
    }

    async extractGamesFromTables() {
        return await this.page.evaluate(() => {
            const results = [];
            const teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', 'Doosan', 'Lotte', 'Samsung', 'Kiwoom', 'Hanwha'];
            
            // 모든 테이블에서 데이터 추출
            const tables = document.querySelectorAll('table');
            
            tables.forEach((table, tableIndex) => {
                const rows = table.querySelectorAll('tr');
                
                Array.from(rows).forEach((row, rowIndex) => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length < 3) return;
                    
                    const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
                    const rowText = cellTexts.join(' ');
                    
                    // 팀명 찾기
                    const foundTeams = teams.filter(team => rowText.includes(team));
                    
                    if (foundTeams.length >= 2) {
                        // 점수 찾기
                        const scores = [];
                        cellTexts.forEach(text => {
                            const scoreMatch = text.match(/^\d+$/) || text.match(/(\d+)/);
                            if (scoreMatch && parseInt(scoreMatch[1]) >= 0 && parseInt(scoreMatch[1]) <= 30) {
                                scores.push(parseInt(scoreMatch[1]));
                            }
                        });
                        
                        // 날짜 찾기
                        let gameDate = '2025-07-31'; // 기본값
                        cellTexts.forEach(text => {
                            const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})/) || 
                                            text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/) ||
                                            text.match(/(\d{1,2})-(\d{1,2})/);
                            if (dateMatch) {
                                if (dateMatch[0].includes('-') && dateMatch[0].length > 5) {
                                    gameDate = dateMatch[0];
                                } else {
                                    const month = dateMatch[1].padStart(2, '0');
                                    const day = dateMatch[2].padStart(2, '0');
                                    gameDate = `2025-${month}-${day}`;
                                }
                            }
                        });
                        
                        if (foundTeams.length >= 2 && scores.length >= 2) {
                            results.push({
                                date: gameDate,
                                awayTeam: foundTeams[0],
                                homeTeam: foundTeams[1],
                                awayScore: scores[0],
                                homeScore: scores[1],
                                source: `table${tableIndex + 1}_row${rowIndex + 1}`,
                                raw: rowText
                            });
                            
                            console.log(`경기 추출: ${foundTeams[0]} ${scores[0]}:${scores[1]} ${foundTeams[1]} (${gameDate})`);
                        }
                    }
                });
            });
            
            return results;
        });
    }

    convertToCleanFormat(games) {
        const dateGroups = {};
        
        games.forEach(game => {
            if (!dateGroups[game.date]) {
                dateGroups[game.date] = [];
            }
            
            // 팀명 매핑
            const awayTeam = this.teamMapping[game.awayTeam] || game.awayTeam;
            const homeTeam = this.teamMapping[game.homeTeam] || game.homeTeam;
            
            const cleanLine = `${awayTeam} ${game.awayScore}:${game.homeScore} ${homeTeam}(H)`;
            dateGroups[game.date].push(cleanLine);
        });
        
        let result = '';
        Object.keys(dateGroups).sort().forEach(date => {
            result += `${date}\n`;
            dateGroups[date].forEach(game => {
                result += `${game}\n`;
            });
            result += '\n';
        });
        
        return result.trim();
    }

    async close() {
        if (this.browser) {
            console.log('\n🔚 5초 후 브라우저 종료...');
            setTimeout(async () => {
                await this.browser.close();
            }, 5000);
        }
    }
}

// 실행
async function main() {
    const crawler = new KBOEngCrawler();
    
    try {
        await crawler.init();
        const result = await crawler.testKBOEngSite();
        
        if (result && (result.gameResults?.length > 0 || result.length > 0)) {
            console.log('\n🎉 KBO 영어 사이트에서 데이터 발견!');
            console.log('📄 분석 결과 파일들을 확인하세요.');
        } else {
            console.log('\n⚠️ KBO 영어 사이트에서 유용한 데이터를 찾지 못했습니다.');
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