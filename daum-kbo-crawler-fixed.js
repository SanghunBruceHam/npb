#!/usr/bin/env node

/**
 * Daum Sports KBO 경기 결과 크롤링
 * 완전한 7월 데이터 추출
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
            'SK': 'SSG', // SSG로 변환
            'NC': 'NC',
            '한화': '한화',
            'KT': 'KT',
            '삼성': '삼성',
            '키움': '키움'
        };
        console.log('🏟️ Daum Sports KBO 크롤러 시작...\\n');
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
        
        // 공백 제거
        const cleaned = teamName.trim();
        
        // 매핑 테이블에서 찾기
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
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 경기 결과 추출
            const games = await this.page.evaluate(() => {
                const results = [];
                
                // 메인 스케줄 테이블 찾기
                const tables = document.querySelectorAll('table');
                console.log(`테이블 수: ${tables.length}`);
                
                tables.forEach((table, tableIndex) => {
                    const tableText = table.textContent || '';
                    const teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
                    const hasKBOTeams = teams.some(team => tableText.includes(team));
                    
                    if (!hasKBOTeams) return;
                    
                    console.log(`테이블 ${tableIndex + 1}: KBO 팀명 포함`);
                    
                    const rows = table.querySelectorAll('tr');
                    let currentDate = null;
                    
                    rows.forEach((row, rowIndex) => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length === 0) return;
                        
                        const rowText = row.textContent?.trim();
                        if (!rowText) return;
                        
                        console.log(`행 ${rowIndex}: ${rowText.substring(0, 50)}`);
                        
                        // 날짜 행 찾기 (7/31, 07/31 형태)
                        const dateMatch = rowText.match(/(\\d{1,2})\\/(\\d{1,2})/);
                        if (dateMatch && cells.length <= 3) {
                            const month = dateMatch[1].padStart(2, '0');
                            const day = dateMatch[2].padStart(2, '0');
                            currentDate = `2025-${month}-${day}`;
                            console.log(`날짜 발견: ${currentDate}`);
                            return;
                        }
                        
                        // 경기 데이터 행 찾기
                        if (currentDate && cells.length >= 5) {
                            const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim());
                            
                            // 팀명과 점수가 있는지 확인
                            let team1 = null, team2 = null, score1 = null, score2 = null;
                            
                            // 셀 순회하면서 패턴 찾기
                            for (let i = 0; i < cellTexts.length - 3; i++) {
                                const text1 = cellTexts[i];
                                const text2 = cellTexts[i + 1];
                                const text3 = cellTexts[i + 2];
                                const text4 = cellTexts[i + 3];
                                
                                // 점수 패턴: [팀1] [점수1] [점수2] [팀2]
                                if (/^\\d+$/.test(text2) && /^\\d+$/.test(text3)) {
                                    const hasTeam1 = teams.some(team => text1?.includes(team));
                                    const hasTeam4 = teams.some(team => text4?.includes(team));
                                    
                                    if (hasTeam1 && hasTeam4) {
                                        team1 = text1;
                                        score1 = parseInt(text2);
                                        score2 = parseInt(text3);
                                        team2 = text4;
                                        console.log(`경기 발견: ${team1} ${score1}:${score2} ${team2}`);
                                        break;
                                    }
                                }
                                
                                // 점수 패턴: [팀1] [점수:점수] [팀2]
                                const scorePattern = text2?.match(/^(\\d+):(\\d+)$/);
                                if (scorePattern) {
                                    const hasTeam1 = teams.some(team => text1?.includes(team));
                                    const hasTeam3 = teams.some(team => text3?.includes(team));
                                    
                                    if (hasTeam1 && hasTeam3) {
                                        team1 = text1;
                                        score1 = parseInt(scorePattern[1]);
                                        score2 = parseInt(scorePattern[2]);
                                        team2 = text3;
                                        console.log(`경기 발견2: ${team1} ${score1}:${score2} ${team2}`);
                                        break;
                                    }
                                }
                            }
                            
                            if (team1 && team2 && score1 !== null && score2 !== null) {
                                results.push({
                                    date: currentDate,
                                    awayTeam: team1,
                                    homeTeam: team2,
                                    awayScore: score1,
                                    homeScore: score2,
                                    source: `table${tableIndex + 1}_row${rowIndex + 1}`
                                });
                            }
                        }
                    });
                });
                
                console.log(`추출된 경기 수: ${results.length}`);
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
                
                // 날짜별로 정렬
                normalizedGames.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Clean.txt 형식으로 변환
                const cleanFormat = this.convertToCleanFormat(normalizedGames);
                
                // 파일 저장
                fs.writeFileSync('daum-crawling-result.txt', cleanFormat, 'utf8');
                console.log('💾 daum-crawling-result.txt에 저장 완료');
                
                // 샘플 출력
                console.log('\\n📋 추출된 경기 (처음 10개):');
                normalizedGames.slice(0, 10).forEach((game, i) => {
                    console.log(`${i + 1}. ${game.date}: ${game.awayTeam} ${game.awayScore}:${game.homeScore} ${game.homeTeam}`);
                });
                
                return normalizedGames;
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
            result += `${date}\\n`;
            dateGroups[date].forEach(game => {
                result += `${game}\\n`;
            });
            result += '\\n';
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
            console.log(`\\n🎉 성공! ${games.length}개 경기 데이터 추출 완료`);
        } else {
            console.log('\\n⚠️ 추출된 데이터가 없습니다.');
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