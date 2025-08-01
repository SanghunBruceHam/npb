#!/usr/bin/env node

/**
 * Daum Sports KBO 크롤링 - 최종 완성 버전
 * JavaScript 동적 로딩 대응
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class DaumKBOFinalCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KIA': 'KIA',
            'KT': 'KT', 
            'LG': 'LG',
            'NC': 'NC',
            'SSG': 'SSG',
            '두산': '두산',
            '롯데': '롯데',
            '삼성': '삼성',
            '키움': '키움',
            '한화': '한화'
        };
        console.log('🏟️ Daum Sports KBO 최종 크롤러 시작...\n');
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

    async crawlDaumKBO(targetMonth = '202507') {
        try {
            console.log(`📡 Daum Sports KBO 크롤링 (${targetMonth})`);
            
            const url = `https://sports.daum.net/schedule/kbo?date=${targetMonth}`;
            console.log(`🔗 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            console.log('⏳ JavaScript 로딩 대기 중...');

            // JavaScript 로딩 대기 - scheduleList가 채워질 때까지
            await this.page.waitForFunction(() => {
                const scheduleList = document.querySelector('#scheduleList');
                return scheduleList && scheduleList.children.length > 0;
            }, { timeout: 15000 }).catch(() => {
                console.log('⚠️ scheduleList 로딩 타임아웃, 수동으로 진행');
            });

            // 추가 대기 시간
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('📸 스크린샷 저장 중...');
            await this.page.screenshot({ path: 'daum-final-debug.png', fullPage: true });

            // DOM 상태 확인
            const domInfo = await this.page.evaluate(() => {
                const scheduleList = document.querySelector('#scheduleList');
                const emptySchedule = document.querySelector('.empty_schedule');
                
                return {
                    scheduleListExists: !!scheduleList,
                    scheduleListChildren: scheduleList ? scheduleList.children.length : 0,
                    emptyScheduleVisible: emptySchedule ? getComputedStyle(emptySchedule).display !== 'none' : false,
                    scheduleListHTML: scheduleList ? scheduleList.innerHTML.substring(0, 500) : 'NOT_FOUND'
                };
            });

            console.log('📋 DOM 상태:', domInfo);

            if (domInfo.scheduleListChildren === 0) {
                console.log('⚠️ JavaScript로 로딩된 데이터가 없습니다.');
                console.log('🔄 페이지 새로고침 시도...');
                
                await this.page.reload({ waitUntil: 'networkidle2' });
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // 다시 확인
                const newDomInfo = await this.page.evaluate(() => {
                    const scheduleList = document.querySelector('#scheduleList');
                    return {
                        scheduleListChildren: scheduleList ? scheduleList.children.length : 0,
                        scheduleListHTML: scheduleList ? scheduleList.innerHTML.substring(0, 500) : 'NOT_FOUND'
                    };
                });
                
                console.log('🔄 새로고침 후 DOM 상태:', newDomInfo);
            }

            // 경기 데이터 추출
            const games = await this.page.evaluate(() => {
                const results = [];
                const scheduleList = document.querySelector('#scheduleList');
                
                if (!scheduleList || scheduleList.children.length === 0) {
                    console.log('❌ #scheduleList가 비어있습니다.');
                    return results;
                }

                console.log(`📊 #scheduleList에서 ${scheduleList.children.length}개 행 발견`);

                const rows = Array.from(scheduleList.children);
                
                rows.forEach((row, index) => {
                    console.log(`\n=== 행 ${index + 1} 분석 ===`);
                    
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 0) return;
                    
                    console.log(`셀 수: ${cells.length}`);
                    
                    // 각 셀의 내용 추출
                    const cellData = Array.from(cells).map((cell, cellIndex) => {
                        const text = cell.textContent?.trim() || '';
                        const images = cell.querySelectorAll('img');
                        const imageAlts = Array.from(images).map(img => img.alt?.trim() || '').filter(alt => alt);
                        
                        console.log(`  셀 ${cellIndex}: "${text}" | 이미지: [${imageAlts.join(', ')}]`);
                        
                        return {
                            text: text,
                            images: imageAlts,
                            combined: (text + ' ' + imageAlts.join(' ')).trim()
                        };
                    });
                    
                    // 날짜 추출 (첫 번째 셀에서)
                    const dateCell = cellData[0];
                    let gameDate = null;
                    
                    if (dateCell && dateCell.text) {
                        // 날짜 패턴들 시도
                        const datePatterns = [
                            /(\d{1,2})\/(\d{1,2})/,        // 7/1
                            /(\d{1,2})월\s*(\d{1,2})일/,   // 7월 1일
                            /(\d{4})-(\d{1,2})-(\d{1,2})/ // 2025-07-01
                        ];
                        
                        for (const pattern of datePatterns) {
                            const match = dateCell.text.match(pattern);
                            if (match) {
                                let month, day;
                                if (pattern.source.includes('월')) {
                                    month = match[1].padStart(2, '0');
                                    day = match[2].padStart(2, '0');
                                } else if (pattern.source.includes('-')) {
                                    month = match[2].padStart(2, '0');
                                    day = match[3].padStart(2, '0');
                                } else {
                                    month = match[1].padStart(2, '0');
                                    day = match[2].padStart(2, '0');
                                }
                                gameDate = `2025-${month}-${day}`;
                                console.log(`  📅 날짜 추출: ${gameDate}`);
                                break;
                            }
                        }
                    }
                    
                    // 팀명 추출 (이미지 alt 속성에서)
                    const teams = ['KIA', 'KT', 'LG', 'NC', 'SSG', '두산', '롯데', '삼성', '키움', '한화'];
                    const foundTeams = [];
                    const scores = [];
                    
                    cellData.forEach((cell, cellIndex) => {
                        // 팀명 찾기 (이미지 alt 또는 텍스트에서)
                        const teamFound = teams.find(team => 
                            cell.images.some(img => img.includes(team)) || 
                            cell.text.includes(team)
                        );
                        
                        if (teamFound) {
                            foundTeams.push({ team: teamFound, cellIndex: cellIndex });
                            console.log(`  🏟️  팀 발견: ${teamFound} (셀 ${cellIndex})`);
                        }
                        
                        // 점수 찾기
                        const scoreMatch = cell.text.match(/^\d+$/) || cell.text.match(/(\d+)/);
                        if (scoreMatch && parseInt(scoreMatch[1]) >= 0 && parseInt(scoreMatch[1]) <= 30) {
                            scores.push({ score: parseInt(scoreMatch[1]), cellIndex: cellIndex });
                            console.log(`  ⚾ 점수 발견: ${scoreMatch[1]} (셀 ${cellIndex})`);
                        }
                    });
                    
                    // 경기 조합 생성
                    if (foundTeams.length >= 2 && scores.length >= 2 && gameDate) {
                        // 가장 가능성 높은 조합 찾기
                        const team1 = foundTeams[0];
                        const team2 = foundTeams[1];
                        
                        // 두 팀 사이 또는 근처의 점수들 찾기
                        const relevantScores = scores.filter(s => 
                            s.cellIndex >= Math.min(team1.cellIndex, team2.cellIndex) - 1 &&
                            s.cellIndex <= Math.max(team1.cellIndex, team2.cellIndex) + 1
                        ).slice(0, 2);
                        
                        if (relevantScores.length >= 2) {
                            const game = {
                                date: gameDate,
                                awayTeam: team1.team,
                                homeTeam: team2.team,
                                awayScore: relevantScores[0].score,
                                homeScore: relevantScores[1].score,
                                source: `row${index + 1}`,
                                raw: cellData.map(c => c.combined).join(' | ')
                            };
                            
                            results.push(game);
                            console.log(`  ✅ 경기 생성: ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam} (${game.date})`);
                        }
                    }
                });
                
                console.log(`\n📈 총 추출된 경기: ${results.length}개`);
                return results;
            });

            console.log(`✅ Daum에서 ${games.length}개 경기 추출`);
            
            if (games.length > 0) {
                // 중복 제거
                const uniqueGames = this.removeDuplicates(games);
                console.log(`🔄 중복 제거 후: ${uniqueGames.length}개 경기`);
                
                // 날짜별로 정렬
                uniqueGames.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Clean.txt 형식으로 변환
                const cleanFormat = this.convertToCleanFormat(uniqueGames);
                
                // 파일 저장
                fs.writeFileSync('daum-final-result.txt', cleanFormat, 'utf8');
                console.log('💾 daum-final-result.txt에 저장 완료');
                
                // 결과 출력
                console.log('\n📋 추출된 경기 결과:');
                this.printGamesByDate(uniqueGames);
                
                return uniqueGames;
            } else {
                console.log('❌ 추출된 경기가 없습니다.');
                console.log('🔍 10초간 브라우저에서 확인 가능...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                return [];
            }

        } catch (error) {
            console.error(`❌ Daum 크롤링 실패: ${error.message}`);
            console.log('🔍 10초간 브라우저에서 확인 가능...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            return [];
        }
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

    printGamesByDate(games) {
        const dateGroups = {};
        games.forEach(game => {
            if (!dateGroups[game.date]) {
                dateGroups[game.date] = [];
            }
            dateGroups[game.date].push(game);
        });
        
        Object.keys(dateGroups).sort().forEach(date => {
            console.log(`\n📅 ${date}:`);
            dateGroups[date].forEach((game, index) => {
                console.log(`   ${index + 1}. ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam}`);
            });
        });
    }

    convertToCleanFormat(games) {
        const dateGroups = {};
        
        games.forEach(game => {
            if (!dateGroups[game.date]) {
                dateGroups[game.date] = [];
            }
            
            const cleanLine = `${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam}(H)`;
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
    const crawler = new DaumKBOFinalCrawler();
    
    try {
        await crawler.init();
        const games = await crawler.crawlDaumKBO('202507');
        
        if (games.length > 0) {
            console.log(`\n🎉 성공! ${games.length}개 경기 데이터 추출 완료`);
            console.log('📄 daum-final-result.txt 파일을 확인하세요.');
        } else {
            console.log('\n⚠️ 추출된 데이터가 없습니다.');
            console.log('💡 JavaScript 동적 로딩이 완료되지 않았을 수 있습니다.');
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