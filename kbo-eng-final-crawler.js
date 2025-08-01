#!/usr/bin/env node

/**
 * KBO 공식 영어 사이트 크롤링 - 스코어보드 & 일정 페이지
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class KBOEngFinalCrawler {
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
        console.log('🏟️ KBO 공식 영어 사이트 최종 크롤링 테스트 시작...\n');
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

    async testKBOEngSites() {
        const urls = [
            {
                url: 'http://eng.koreabaseball.com/Schedule/Scoreboard.aspx',
                name: 'Scoreboard',
                screenshot: 'kbo-eng-scoreboard-debug.png'
            },
            {
                url: 'http://eng.koreabaseball.com/Schedule/DailySchedule.aspx',
                name: 'DailySchedule',
                screenshot: 'kbo-eng-schedule-debug.png'
            }
        ];
        
        const allResults = [];
        
        for (const urlInfo of urls) {
            try {
                console.log(`\n📡 KBO 영어 사이트 접속: ${urlInfo.name}`);
                console.log(`🔗 URL: ${urlInfo.url}`);
                
                await this.page.goto(urlInfo.url, { 
                    waitUntil: 'networkidle2',
                    timeout: 30000 
                });

                // 페이지 로딩 대기
                await new Promise(resolve => setTimeout(resolve, 5000));

                // 스크린샷 저장
                await this.page.screenshot({ path: urlInfo.screenshot, fullPage: true });
                console.log(`📸 스크린샷 저장: ${urlInfo.screenshot}`);

                // 페이지 구조 분석
                const pageAnalysis = await this.page.evaluate((pageName) => {
                    console.log(`=== ${pageName} 페이지 구조 분석 ===`);
                    
                    const analysis = {
                        pageName: pageName,
                        title: document.title,
                        url: window.location.href,
                        tables: [],
                        scheduleElements: [],
                        gameResults: [],
                        formElements: []
                    };
                    
                    // 모든 테이블 분석
                    const tables = document.querySelectorAll('table');
                    console.log(`총 테이블 수: ${tables.length}`);
                    
                    tables.forEach((table, index) => {
                        const tableText = table.textContent || '';
                        const rows = table.querySelectorAll('tr');
                        const hasGameContent = tableText.includes('KIA') || tableText.includes('LG') || 
                                             tableText.includes('vs') || tableText.includes('Score') ||
                                             tableText.includes('Home') || tableText.includes('Away');
                        
                        if (hasGameContent && rows.length > 1) {
                            console.log(`\n🎯 테이블 ${index + 1}: 게임 관련 (${rows.length}행)`);
                            console.log(`클래스: ${table.className}`);
                            console.log(`ID: ${table.id}`);
                            
                            const tableInfo = {
                                index: index,
                                rowCount: rows.length,
                                className: table.className,
                                id: table.id,
                                sample: tableText.substring(0, 300),
                                rows: []
                            };
                            
                            // 각 행 상세 분석
                            Array.from(rows).forEach((row, rowIndex) => {
                                const cells = row.querySelectorAll('td, th');
                                if (cells.length > 0) {
                                    const cellData = Array.from(cells).map(cell => {
                                        const text = cell.textContent?.trim() || '';
                                        const links = cell.querySelectorAll('a');
                                        const images = cell.querySelectorAll('img');
                                        
                                        return {
                                            text: text,
                                            links: Array.from(links).map(link => link.href),
                                            images: Array.from(images).map(img => img.src),
                                            className: cell.className
                                        };
                                    });
                                    
                                    const rowText = cellData.map(c => c.text).join(' | ');
                                    
                                    if (rowText.length > 5) {
                                        console.log(`  행 ${rowIndex}: [${cellData.length}셀] ${rowText}`);
                                        
                                        tableInfo.rows.push({
                                            rowIndex: rowIndex,
                                            cellCount: cells.length,
                                            cells: cellData,
                                            fullText: rowText
                                        });
                                    }
                                }
                            });
                            
                            analysis.tables.push(tableInfo);
                        }
                    });
                    
                    // 경기 결과 추출 시도
                    const teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', 'Doosan', 'Lotte', 'Samsung', 'Kiwoom', 'Hanwha'];
                    
                    analysis.tables.forEach(table => {
                        table.rows.forEach(row => {
                            const foundTeams = [];
                            const scores = [];
                            let gameDate = null;
                            
                            row.cells.forEach((cell, cellIndex) => {
                                // 팀명 찾기
                                const teamFound = teams.find(team => cell.text.includes(team));
                                if (teamFound) {
                                    foundTeams.push({ team: teamFound, cellIndex: cellIndex });
                                }
                                
                                // 점수 찾기
                                const scoreMatch = cell.text.match(/^\\d+$/) || cell.text.match(/(\\d+)/);
                                if (scoreMatch && parseInt(scoreMatch[1]) >= 0 && parseInt(scoreMatch[1]) <= 30) {
                                    scores.push({ score: parseInt(scoreMatch[1]), cellIndex: cellIndex });
                                }
                                
                                // 날짜 찾기
                                const dateMatch = cell.text.match(/(\\d{1,2})\\/(\\d{1,2})/) || 
                                                cell.text.match(/(\\d{4})-(\\d{1,2})-(\\d{1,2})/) ||
                                                cell.text.match(/(\\d{1,2})-(\\d{1,2})/);
                                if (dateMatch && !gameDate) {
                                    if (dateMatch[0].includes('-') && dateMatch[0].length > 5) {
                                        gameDate = dateMatch[0];
                                    } else {
                                        const month = dateMatch[1].padStart(2, '0');
                                        const day = dateMatch[2].padStart(2, '0');
                                        gameDate = `2025-${month}-${day}`;
                                    }
                                }
                            });
                            
                            // 경기 조합 생성
                            if (foundTeams.length >= 2 && scores.length >= 2) {
                                const game = {
                                    date: gameDate || '2025-07-31',
                                    awayTeam: foundTeams[0].team,
                                    homeTeam: foundTeams[1].team,
                                    awayScore: scores[0].score,
                                    homeScore: scores[1].score,
                                    source: `${pageName}_table${table.index + 1}_row${row.rowIndex + 1}`,
                                    raw: row.fullText
                                };
                                
                                analysis.gameResults.push(game);
                                console.log(`  ✅ 경기 추출: ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam} (${game.date})`);
                            }
                        });
                    });
                    
                    // ASP.NET 폼 요소 찾기 (날짜 선택 등)
                    const forms = document.querySelectorAll('form');
                    const selects = document.querySelectorAll('select');
                    const inputs = document.querySelectorAll('input[type="text"], input[type="date"]');
                    
                    analysis.formElements = {
                        forms: forms.length,
                        selects: Array.from(selects).map(select => ({
                            id: select.id,
                            name: select.name,
                            options: Array.from(select.options).map(opt => opt.text)
                        })),
                        inputs: Array.from(inputs).map(input => ({
                            id: input.id,
                            name: input.name,
                            value: input.value,
                            type: input.type
                        }))
                    };
                    
                    return analysis;
                }, urlInfo.name);

                console.log(`\n📊 ${urlInfo.name} 페이지 분석 결과:`);
                console.log(`- 제목: ${pageAnalysis.title}`);
                console.log(`- 테이블 수: ${pageAnalysis.tables.length}개`);
                console.log(`- 경기 결과: ${pageAnalysis.gameResults.length}개`);
                console.log(`- 폼 요소: ${pageAnalysis.formElements.forms}개 폼, ${pageAnalysis.formElements.selects.length}개 셀렉트`);

                allResults.push(pageAnalysis);
                
                // 다음 페이지로 가기 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ ${urlInfo.name} 페이지 크롤링 실패: ${error.message}`);
            }
        }
        
        // 모든 결과 통합
        const allGames = [];
        allResults.forEach(result => {
            if (result.gameResults) {
                allGames.push(...result.gameResults);
            }
        });
        
        console.log(`\n🎯 총 추출된 경기: ${allGames.length}개`);
        
        if (allGames.length > 0) {
            // 중복 제거
            const uniqueGames = this.removeDuplicates(allGames);
            console.log(`🔄 중복 제거 후: ${uniqueGames.length}개 경기`);
            
            // Clean.txt 형식으로 변환
            const cleanFormat = this.convertToCleanFormat(uniqueGames);
            
            // 파일 저장
            fs.writeFileSync('kbo-eng-final-result.txt', cleanFormat, 'utf8');
            console.log('💾 kbo-eng-final-result.txt에 저장 완료');
            
            // 결과 출력
            console.log('\n📋 추출된 경기 결과:');
            uniqueGames.forEach((game, index) => {
                const awayTeam = this.teamMapping[game.awayTeam] || game.awayTeam;
                const homeTeam = this.teamMapping[game.homeTeam] || game.homeTeam;
                console.log(`${index + 1}. ${game.date}: ${awayTeam} ${game.awayScore}:${game.homeScore} ${homeTeam}`);
            });
        }
        
        // 전체 분석 결과 저장
        fs.writeFileSync('kbo-eng-complete-analysis.json', JSON.stringify(allResults, null, 2), 'utf8');
        console.log('💾 kbo-eng-complete-analysis.json에 완전한 분석 결과 저장');
        
        console.log('\n🔍 15초간 브라우저에서 페이지를 확인하세요...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        return allResults;
    }

    removeDuplicates(games) {
        const uniqueGames = [];
        const gameKeys = new Set();
        
        games.forEach(game => {
            const key = `${game.date}-${game.awayTeam}-${game.homeTeam}-${game.awayScore}-${game.homeScore}`;
            if (!gameKeys.has(key)) {
                gameKeys.add(key);
                uniqueGames.push(game);
            }
        });
        
        return uniqueGames;
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
    const crawler = new KBOEngFinalCrawler();
    
    try {
        await crawler.init();
        const results = await crawler.testKBOEngSites();
        
        const totalGames = results.reduce((sum, result) => sum + (result.gameResults?.length || 0), 0);
        
        if (totalGames > 0) {
            console.log(`\n🎉 KBO 영어 사이트에서 총 ${totalGames}개 경기 데이터 발견!`);
            console.log('📄 결과 파일들을 확인하세요.');
        } else {
            console.log('\n⚠️ KBO 영어 사이트에서 경기 데이터를 찾지 못했습니다.');
            console.log('💡 페이지 구조가 예상과 다르거나 데이터가 JavaScript로 로딩될 수 있습니다.');
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