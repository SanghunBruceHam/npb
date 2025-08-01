#!/usr/bin/env node

/**
 * Daum Sports KBO 크롤링 - 개선된 최종 버전
 * DOM 구조 분석 기반으로 정확한 데이터 추출
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class DaumKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            '기아': 'KIA',
            'KIA': 'KIA',
            '롯데': '롯데',
            'LG': 'LG',
            '두산': '두산',
            'SSG': 'SSG',
            'SK': 'SSG',
            'NC': 'NC',
            '한화': '한화',
            'KT': 'KT',
            '삼성': '삼성',
            '키움': '키움'
        };
        console.log('🏟️ Daum Sports KBO 개선된 크롤러 시작...\n');
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

    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
        // 팀명에서 불필요한 문자 제거
        let cleaned = teamName.trim().replace(/[^\w가-힣]/g, '');
        
        // KIA 특별 처리
        if (cleaned.includes('기아') || cleaned.includes('KIA')) {
            return 'KIA';
        }
        
        // 다른 팀명들 매핑
        const teamNames = ['LG', '삼성', 'KT', 'SSG', 'NC', '롯데', '두산', '키움', '한화'];
        for (const team of teamNames) {
            if (cleaned.includes(team)) {
                return team;
            }
        }
        
        return this.teamMapping[cleaned] || cleaned;
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

            // 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 스크린샷 저장
            await this.page.screenshot({ path: 'daum-improved-debug.png', fullPage: true });
            console.log('📸 개선된 디버그 스크린샷 저장');

            // DOM 구조 상세 분석
            const pageInfo = await this.page.evaluate(() => {
                console.log('=== DOM 구조 상세 분석 ===');
                
                // 모든 테이블 찾기
                const tables = document.querySelectorAll('table');
                console.log(`총 테이블 수: ${tables.length}`);
                
                const tableInfo = [];
                tables.forEach((table, index) => {
                    const rows = table.querySelectorAll('tr');
                    const hasKBOContent = table.textContent.includes('LG') || 
                                         table.textContent.includes('KIA') || 
                                         table.textContent.includes('삼성');
                    
                    if (hasKBOContent) {
                        console.log(`테이블 ${index + 1}: KBO 관련 (${rows.length}행)`);
                        tableInfo.push({
                            index: index,
                            rowCount: rows.length,
                            className: table.className,
                            id: table.id,
                            sample: table.textContent.substring(0, 100)
                        });
                    }
                });
                
                return { tableInfo };
            });

            console.log('📋 테이블 정보:', pageInfo.tableInfo);

            // 경기 결과 추출 - 개선된 로직
            const games = await this.page.evaluate(() => {
                const results = [];
                const teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
                
                // 메인 스케줄 테이블 찾기 - 더 정확한 선택
                const candidateTables = Array.from(document.querySelectorAll('table')).filter(table => {
                    const text = table.textContent;
                    const teamCount = teams.filter(team => text.includes(team)).length;
                    return teamCount >= 5; // 최소 5개 이상의 팀이 언급된 테이블
                });
                
                console.log(`후보 테이블 수: ${candidateTables.length}`);
                
                candidateTables.forEach((table, tableIndex) => {
                    console.log(`\n=== 테이블 ${tableIndex + 1} 분석 ===`);
                    
                    const rows = Array.from(table.querySelectorAll('tr'));
                    let currentDate = null;
                    
                    rows.forEach((row, rowIndex) => {
                        const cells = Array.from(row.querySelectorAll('td, th'));
                        if (cells.length === 0) return;
                        
                        const cellTexts = cells.map(cell => {
                            // 텍스트만 추출, 이미지 alt 속성도 포함
                            let text = cell.textContent?.trim() || '';
                            const img = cell.querySelector('img');
                            if (img && img.alt) {
                                text += ' ' + img.alt.trim();
                            }
                            return text;
                        });
                        
                        const rowText = cellTexts.join(' ').trim();
                        
                        // 날짜 패턴 찾기 - 더 유연하게
                        const datePatterns = [
                            /(\d{1,2})월\s*(\d{1,2})일/,  // X월 Y일
                            /(\d{1,2})\/(\d{1,2})/,      // X/Y
                            /(\d{1,2})-(\d{1,2})/       // X-Y
                        ];
                        
                        let dateFound = false;
                        for (const pattern of datePatterns) {
                            const dateMatch = rowText.match(pattern);
                            if (dateMatch && cells.length <= 4) {
                                let month = dateMatch[1];
                                let day = dateMatch[2];
                                
                                // 월일 표기에서 월 추출
                                if (pattern.source.includes('월')) {
                                    month = month;
                                    day = dateMatch[2];
                                }
                                
                                month = month.padStart(2, '0');
                                day = day.padStart(2, '0');
                                currentDate = `2025-${month}-${day}`;
                                console.log(`날짜 발견: ${currentDate} (${rowText})`);
                                dateFound = true;
                                break;
                            }
                        }
                        
                        if (dateFound) return;
                        
                        // 경기 데이터 행 처리 - 더 정교한 로직
                        if (currentDate && cells.length >= 3) {
                            console.log(`행 ${rowIndex}: ${cellTexts.length}셀, 텍스트: [${cellTexts.join('] [')}]`);
                            
                            // 패턴 1: 팀 로고/이름이 있는 셀 찾기
                            const teamCells = [];
                            const scoreCells = [];
                            
                            cellTexts.forEach((cellText, cellIndex) => {
                                // 팀명 감지 (텍스트 또는 이미지 alt)
                                const foundTeam = teams.find(team => cellText.includes(team));
                                if (foundTeam) {
                                    teamCells.push({ index: cellIndex, team: foundTeam, text: cellText });
                                }
                                
                                // 점수 감지
                                const scoreMatch = cellText.match(/^(\d+)$/) || cellText.match(/(\d+)/);
                                if (scoreMatch && parseInt(scoreMatch[1]) >= 0 && parseInt(scoreMatch[1]) <= 30) {
                                    scoreCells.push({ index: cellIndex, score: parseInt(scoreMatch[1]), text: cellText });
                                }
                            });
                            
                            console.log(`  팀 셀: ${teamCells.length}개, 점수 셀: ${scoreCells.length}개`);
                            
                            // 경기 조합 찾기
                            if (teamCells.length >= 2 && scoreCells.length >= 2) {
                                // 가장 가까운 팀-점수 조합 찾기
                                for (let i = 0; i < teamCells.length - 1; i++) {
                                    for (let j = i + 1; j < teamCells.length; j++) {
                                        const team1 = teamCells[i];
                                        const team2 = teamCells[j];
                                        
                                        // 두 팀 사이의 점수들 찾기
                                        const betweenScores = scoreCells.filter(s => 
                                            s.index > Math.min(team1.index, team2.index) && 
                                            s.index < Math.max(team1.index, team2.index)
                                        );
                                        
                                        if (betweenScores.length === 2) {
                                            const score1 = betweenScores[0].score;
                                            const score2 = betweenScores[1].score;
                                            
                                            results.push({
                                                date: currentDate,
                                                awayTeam: team1.team,
                                                homeTeam: team2.team,
                                                awayScore: score1,
                                                homeScore: score2,
                                                source: `table${tableIndex + 1}_row${rowIndex + 1}_pattern1`,
                                                raw: cellTexts.join(' | ')
                                            });
                                            
                                            console.log(`  ✅ 경기: ${team1.team} ${score1}:${score2} ${team2.team}`);
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            // 패턴 2: 연속된 셀에서 팀-점수-점수-팀 찾기
                            if (teamCells.length >= 2 && scoreCells.length >= 2) {
                                for (let i = 0; i <= cellTexts.length - 4; i++) {
                                    const cell1 = cellTexts[i];
                                    const cell2 = cellTexts[i + 1];
                                    const cell3 = cellTexts[i + 2];
                                    const cell4 = cellTexts[i + 3];
                                    
                                    const team1 = teams.find(team => cell1.includes(team));
                                    const team2 = teams.find(team => cell4.includes(team));
                                    const score1Match = cell2.match(/^(\d+)$/);
                                    const score2Match = cell3.match(/^(\d+)$/);
                                    
                                    if (team1 && team2 && score1Match && score2Match) {
                                        const score1 = parseInt(score1Match[1]);
                                        const score2 = parseInt(score2Match[1]);
                                        
                                        if (score1 >= 0 && score1 <= 30 && score2 >= 0 && score2 <= 30) {
                                            results.push({
                                                date: currentDate,
                                                awayTeam: team1,
                                                homeTeam: team2,
                                                awayScore: score1,
                                                homeScore: score2,
                                                source: `table${tableIndex + 1}_row${rowIndex + 1}_pattern2`,
                                                raw: cellTexts.join(' | ')
                                            });
                                            
                                            console.log(`  ✅ 경기2: ${team1} ${score1}:${score2} ${team2}`);
                                        }
                                    }
                                }
                            }
                        }
                    });
                });
                
                console.log(`\n총 추출된 경기 수: ${results.length}`);
                return results;
            });

            console.log(`✅ Daum에서 ${games.length}개 경기 추출`);
            
            if (games.length > 0) {
                // 팀명 정규화
                const normalizedGames = games.map(game => ({
                    ...game,
                    awayTeam: this.normalizeTeamName(game.awayTeam),
                    homeTeam: this.normalizeTeamName(game.homeTeam)
                })).filter(game => game.awayTeam && game.homeTeam);

                console.log(`🔄 정규화 후: ${normalizedGames.length}개 경기`);
                
                // 중복 제거
                const uniqueGames = this.removeDuplicates(normalizedGames);
                console.log(`🔄 중복 제거 후: ${uniqueGames.length}개 경기`);
                
                // 날짜별로 정렬
                uniqueGames.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Clean.txt 형식으로 변환
                const cleanFormat = this.convertToCleanFormat(uniqueGames);
                
                // 파일 저장
                fs.writeFileSync('daum-improved-result.txt', cleanFormat, 'utf8');
                console.log('💾 daum-improved-result.txt에 저장 완료');
                
                // 상세 결과 출력
                console.log('\n📋 추출된 경기 결과:');
                this.printGamesByDate(uniqueGames);
                
                return uniqueGames;
            } else {
                console.log('❌ 추출된 경기가 없습니다.');
                
                // 디버깅을 위해 5초 대기
                console.log('🔍 브라우저에서 페이지를 확인하세요...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                return [];
            }

        } catch (error) {
            console.error(`❌ Daum 크롤링 실패: ${error.message}`);
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
            // 디버깅을 위해 5초 대기 후 종료
            setTimeout(async () => {
                await this.browser.close();
                console.log('🔚 브라우저 종료');
            }, 5000);
        }
    }
}

// 실행
async function main() {
    const crawler = new DaumKBOCrawler();
    
    try {
        await crawler.init();
        const games = await crawler.crawlDaumKBO('202507');
        
        if (games.length > 0) {
            console.log(`\n🎉 성공! ${games.length}개 경기 데이터 추출 완료`);
            console.log('📄 daum-improved-result.txt 파일을 확인하세요.');
            
            // 기존 clean.txt와 비교
            if (fs.existsSync('data/2025-season-data-clean.txt')) {
                console.log('\n🔍 기존 clean.txt와 비교 중...');
                const existingData = fs.readFileSync('data/2025-season-data-clean.txt', 'utf8');
                const existingLines = existingData.split('\n').filter(line => line.trim());
                console.log(`기존 데이터: ${existingLines.length}줄`);
                console.log(`크롤링 데이터: ${games.length}개 경기`);
            }
        } else {
            console.log('\n⚠️ 추출된 데이터가 없습니다.');
            console.log('브라우저에서 페이지 구조를 확인해보세요.');
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