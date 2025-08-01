#!/usr/bin/env node

/**
 * Daum Sports KBO 경기 결과 크롤링 - 최종 버전
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
        console.log('🏟️ Daum Sports KBO 크롤러 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: true,
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
        const cleaned = teamName.trim();
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

            await new Promise(resolve => setTimeout(resolve, 3000));

            // 스크린샷 저장
            await this.page.screenshot({ path: 'daum-crawling-debug.png', fullPage: true });
            console.log('📸 디버그 스크린샷 저장: daum-crawling-debug.png');

            // 경기 결과 추출
            const games = await this.page.evaluate(() => {
                const results = [];
                const teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
                
                // 모든 테이블 검사
                const tables = document.querySelectorAll('table');
                console.log(`총 테이블 수: ${tables.length}`);
                
                tables.forEach((table, tableIndex) => {
                    const tableText = table.textContent || '';
                    const hasKBOTeams = teams.some(team => tableText.includes(team));
                    
                    if (!hasKBOTeams) return;
                    
                    console.log(`테이블 ${tableIndex + 1}: KBO 관련 테이블 발견`);
                    
                    const rows = Array.from(table.querySelectorAll('tr'));
                    let currentDate = null;
                    
                    rows.forEach((row, rowIndex) => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length === 0) return;
                        
                        const rowText = row.textContent?.trim() || '';
                        
                        // 날짜 패턴 찾기 (7/1, 07/01 등)
                        const dateRegex = /(\d{1,2})\/(\d{1,2})/;
                        const dateMatch = rowText.match(dateRegex);
                        
                        if (dateMatch && cells.length <= 4) {
                            const month = dateMatch[1].padStart(2, '0');
                            const day = dateMatch[2].padStart(2, '0');
                            currentDate = `2025-${month}-${day}`;
                            console.log(`날짜 행 발견: ${currentDate} (${rowText.substring(0, 30)})`);
                            return;
                        }
                        
                        // 경기 데이터 행인지 확인
                        if (currentDate && cells.length >= 4) {
                            const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
                            
                            // 경기 데이터 추출 시도
                            let foundGame = false;
                            
                            // 방법 1: [팀1] [점수1] [점수2] [팀2] 패턴
                            for (let i = 0; i <= cellTexts.length - 4; i++) {
                                const team1 = cellTexts[i];
                                const score1Text = cellTexts[i + 1];
                                const score2Text = cellTexts[i + 2];
                                const team2 = cellTexts[i + 3];
                                
                                // 팀명 검증
                                const isTeam1Valid = teams.some(team => team1.includes(team));
                                const isTeam2Valid = teams.some(team => team2.includes(team));
                                
                                // 점수 검증
                                const score1 = parseInt(score1Text);
                                const score2 = parseInt(score2Text);
                                const areScoresValid = !isNaN(score1) && !isNaN(score2) && score1 >= 0 && score2 >= 0;
                                
                                if (isTeam1Valid && isTeam2Valid && areScoresValid) {
                                    results.push({
                                        date: currentDate,
                                        awayTeam: team1,
                                        homeTeam: team2,
                                        awayScore: score1,
                                        homeScore: score2,
                                        source: `table${tableIndex + 1}_row${rowIndex + 1}_pattern1`
                                    });
                                    
                                    console.log(`경기 추출: ${team1} ${score1}:${score2} ${team2} (${currentDate})`);
                                    foundGame = true;
                                    break;
                                }
                            }
                            
                            // 방법 2: [팀1] [점수:점수] [팀2] 패턴
                            if (!foundGame) {
                                for (let i = 0; i <= cellTexts.length - 3; i++) {
                                    const team1 = cellTexts[i];
                                    const scoreText = cellTexts[i + 1];
                                    const team2 = cellTexts[i + 2];
                                    
                                    const scoreMatch = scoreText.match(/^(\d+):(\d+)$/);
                                    
                                    if (scoreMatch) {
                                        const isTeam1Valid = teams.some(team => team1.includes(team));
                                        const isTeam2Valid = teams.some(team => team2.includes(team));
                                        
                                        if (isTeam1Valid && isTeam2Valid) {
                                            results.push({
                                                date: currentDate,
                                                awayTeam: team1,
                                                homeTeam: team2,
                                                awayScore: parseInt(scoreMatch[1]),
                                                homeScore: parseInt(scoreMatch[2]),
                                                source: `table${tableIndex + 1}_row${rowIndex + 1}_pattern2`
                                            });
                                            
                                            console.log(`경기 추출2: ${team1} ${scoreMatch[1]}:${scoreMatch[2]} ${team2} (${currentDate})`);
                                            foundGame = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    });
                });
                
                console.log(`총 추출된 경기 수: ${results.length}`);
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
                
                // 중복 제거 (같은 날짜, 같은 팀, 같은 점수)
                const uniqueGames = [];
                const gameKeys = new Set();
                
                normalizedGames.forEach(game => {
                    const key = `${game.date}-${game.awayTeam}-${game.homeTeam}-${game.awayScore}-${game.homeScore}`;
                    if (!gameKeys.has(key)) {
                        gameKeys.add(key);
                        uniqueGames.push(game);
                    }
                });
                
                console.log(`🔄 중복 제거 후: ${uniqueGames.length}개 경기`);
                
                // 날짜별로 정렬
                uniqueGames.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Clean.txt 형식으로 변환
                const cleanFormat = this.convertToCleanFormat(uniqueGames);
                
                // 파일 저장
                fs.writeFileSync('daum-crawling-result.txt', cleanFormat, 'utf8');
                console.log('💾 daum-crawling-result.txt에 저장 완료');
                
                // 샘플 출력
                console.log('\n📋 추출된 경기 (처음 15개):');
                uniqueGames.slice(0, 15).forEach((game, i) => {
                    console.log(`${i + 1}. ${game.date}: ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam}`);
                });
                
                return uniqueGames;
            } else {
                console.log('❌ 추출된 경기가 없습니다.');
                return [];
            }

        } catch (error) {
            console.error(`❌ Daum 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    convertToCleanFormat(games) {
        const dateGroups = {};
        
        // 날짜별로 그룹화
        games.forEach(game => {
            if (!dateGroups[game.date]) {
                dateGroups[game.date] = [];
            }
            
            // Clean.txt 형식: "원정팀 점수:점수 홈팀(H)"
            const cleanLine = `${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam}(H)`;
            dateGroups[game.date].push(cleanLine);
        });
        
        // 날짜 순으로 정렬하여 출력
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
        const games = await crawler.crawlDaumKBO('202507');
        
        if (games.length > 0) {
            console.log(`\n🎉 성공! ${games.length}개 경기 데이터 추출 완료`);
            console.log('📄 daum-crawling-result.txt 파일을 확인하세요.');
        } else {
            console.log('\n⚠️ 추출된 데이터가 없습니다.');
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