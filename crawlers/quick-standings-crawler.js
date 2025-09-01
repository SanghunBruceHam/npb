const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * NPB 현재 순위 빠른 크롤러
 */
class NPBQuickStandingsCrawler {
    constructor() {
        this.baseUrl = 'https://baseball.yahoo.co.jp/npb/standings/';
        this.dataDir = path.join(__dirname, '..', 'data');
    }

    async crawl() {
        console.log('🏁 NPB 현재 순위 크롤링 시작...');
        const browser = await puppeteer.launch({ headless: true });
        
        try {
            const page = await browser.newPage();
            await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // 순위 데이터 추출
            const standings = await page.evaluate(() => {
                const teams = [];
                
                // 센트럴 리그와 퍼시픽 리그 테이블 찾기
                const tables = document.querySelectorAll('table.bb-rankTable');
                
                tables.forEach((table, leagueIndex) => {
                    const league = leagueIndex === 0 ? 'central' : 'pacific';
                    const rows = table.querySelectorAll('tbody tr');
                    
                    rows.forEach((row, index) => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 8) return;
                        
                        const teamName = cells[1]?.textContent?.trim() || '';
                        const wins = parseInt(cells[3]?.textContent?.trim() || '0');
                        const losses = parseInt(cells[4]?.textContent?.trim() || '0');
                        const draws = parseInt(cells[5]?.textContent?.trim() || '0');
                        const winPct = parseFloat(cells[6]?.textContent?.trim() || '0');
                        const gamesBehind = cells[7]?.textContent?.trim() || '-';
                        
                        teams.push({
                            rank: index + 1,
                            name: teamName,
                            league: league,
                            wins: wins,
                            losses: losses,
                            draws: draws,
                            winPct: winPct,
                            gamesBehind: gamesBehind === '-' ? 0 : parseFloat(gamesBehind),
                            gamesPlayed: wins + losses + draws
                        });
                    });
                });
                
                return teams;
            });
            
            // 데이터 저장
            const timestamp = new Date().toISOString();
            const outputData = {
                timestamp: timestamp,
                season: 2025,
                standings: standings
            };
            
            const outputPath = path.join(this.dataDir, 'npb-standings.json');
            await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
            
            console.log(`✅ 순위 데이터 저장 완료: ${outputPath}`);
            console.log(`📊 총 ${standings.length}팀 데이터 수집`);
            
            return standings;
            
        } catch (error) {
            console.error('❌ 크롤링 실패:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }
}

// 실행
if (require.main === module) {
    const crawler = new NPBQuickStandingsCrawler();
    crawler.crawl()
        .then(() => console.log('✅ 크롤링 완료!'))
        .catch(error => {
            console.error('❌ 오류:', error);
            process.exit(1);
        });
}

module.exports = NPBQuickStandingsCrawler;