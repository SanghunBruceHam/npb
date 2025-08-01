#!/usr/bin/env node

/**
 * 개선된 KBO 공식 사이트 크롤러
 * 최근 10경기, 연속 기록 등 상세 데이터 포함
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class EnhancedKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🏟️ 개선된 KBO 크롤링 시스템 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async crawlKBOOfficialRankings() {
        try {
            const url = 'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';
            console.log(`📡 KBO 공식 순위 크롤링: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 스크린샷 저장 (디버깅용)
            await this.page.screenshot({ path: 'enhanced-kbo-debug.png' });
            console.log('📸 디버깅 스크린샷 저장: enhanced-kbo-debug.png');
            
            // 순위 데이터 추출
            const rankings = await this.page.evaluate(() => {
                const teams = [];
                const teamNames = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
                
                // 메인 순위 테이블 찾기
                const tables = document.querySelectorAll('table');
                let rankingTable = null;
                
                for (const table of tables) {
                    const headerText = table.textContent;
                    if (headerText.includes('순위') && headerText.includes('팀명') && headerText.includes('승률')) {
                        rankingTable = table;
                        break;
                    }
                }
                
                if (rankingTable) {
                    const rows = rankingTable.querySelectorAll('tbody tr');
                    console.log(`순위 테이블에서 ${rows.length}개 행 발견`);
                    
                    rows.forEach((row, index) => {
                        const cells = Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim());
                        
                        if (cells.length >= 8) {
                            // 팀명 찾기
                            const teamName = cells.find(cell => teamNames.includes(cell));
                            
                            if (teamName) {
                                const teamIndex = cells.findIndex(cell => cell === teamName);
                                
                                // 순위 테이블 구조에 맞게 데이터 추출
                                const rank = parseInt(cells[0]) || teams.length + 1;
                                const games = parseInt(cells[teamIndex + 1]) || 0;
                                const wins = parseInt(cells[teamIndex + 2]) || 0;
                                const losses = parseInt(cells[teamIndex + 3]) || 0;
                                const draws = parseInt(cells[teamIndex + 4]) || 0;
                                const winRateText = cells[teamIndex + 5] || '0';
                                const winRate = parseFloat(winRateText.replace(/[^\d.]/g, '')) || 0;
                                
                                // 최근 10경기 찾기 (승무패 패턴)
                                let recent10 = 'N/A';
                                let streak = 'N/A';
                                
                                for (let i = teamIndex + 6; i < cells.length; i++) {
                                    const cell = cells[i];
                                    
                                    // 최근 10경기 패턴 (예: "5승1무4패")
                                    if (/\d+승.*?\d*무.*?\d*패/.test(cell) || /\d+승.*?\d*패/.test(cell)) {
                                        recent10 = cell;
                                    }
                                    
                                    // 연속 기록 패턴 (예: "2승", "1패")
                                    if (/^\d+[승패무]$/.test(cell) && recent10 !== cell) {
                                        streak = cell;
                                    }
                                }
                                
                                teams.push({
                                    rank: rank,
                                    team: teamName,
                                    games: games,
                                    wins: wins,
                                    losses: losses,
                                    draws: draws,
                                    winRate: winRate > 1 ? winRate / 1000 : winRate,
                                    recent10: recent10,
                                    streak: streak
                                });
                                
                                console.log(`${rank}. ${teamName}: ${wins}승 ${losses}패 ${draws}무 (승률 ${winRate}), 최근10: ${recent10}, 연속: ${streak}`);
                            }
                        }
                    });
                } else {
                    console.log('순위 테이블을 찾을 수 없습니다.');
                    
                    // 텍스트 기반 파싱으로 대체
                    const bodyText = document.body.textContent || '';
                    const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    
                    for (const teamName of teamNames) {
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            
                            if (line.includes(teamName) && /\d+/.test(line)) {
                                // 기본 통계 추출
                                const numbers = line.match(/\d+/g);
                                const decimals = line.match(/\d+\.\d+/g);
                                
                                if (numbers && numbers.length >= 5) {
                                    const rank = teams.length + 1;
                                    const games = parseInt(numbers[1]) || 0;
                                    const wins = parseInt(numbers[2]) || 0;
                                    const losses = parseInt(numbers[3]) || 0;
                                    const draws = parseInt(numbers[4]) || 0;
                                    const winRate = decimals ? parseFloat(decimals[0]) : 0;
                                    
                                    // 주변 라인에서 최근 기록 찾기
                                    let recent10 = 'N/A';
                                    let streak = 'N/A';
                                    
                                    for (let j = Math.max(0, i-2); j < Math.min(lines.length, i+3); j++) {
                                        const checkLine = lines[j];
                                        
                                        const recent10Match = checkLine.match(/(\d+승\d*무?\d*패)/);
                                        if (recent10Match && recent10 === 'N/A') {
                                            recent10 = recent10Match[1];
                                        }
                                        
                                        const streakMatch = checkLine.match(/(\d+[승패무])/);
                                        if (streakMatch && streak === 'N/A' && (!recent10Match || !recent10Match[1].includes(streakMatch[1]))) {
                                            streak = streakMatch[1];
                                        }
                                    }
                                    
                                    teams.push({
                                        rank: rank,
                                        team: teamName,
                                        games: games,
                                        wins: wins,
                                        losses: losses,
                                        draws: draws,
                                        winRate: winRate,
                                        recent10: recent10,
                                        streak: streak
                                    });
                                    
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // 중복 제거 및 정렬
                const uniqueTeams = [];
                const seenTeams = new Set();
                
                for (const team of teams) {
                    if (!seenTeams.has(team.team) && team.games > 50) { // 정규 시즌 팀만 (최소 50경기)
                        seenTeams.add(team.team);
                        uniqueTeams.push(team);
                    }
                }
                
                // 승률 기준으로 정렬
                uniqueTeams.sort((a, b) => b.winRate - a.winRate);
                
                // 순위 재계산
                uniqueTeams.forEach((team, index) => {
                    team.rank = index + 1;
                });
                
                console.log(`최종 추출된 팀 수: ${uniqueTeams.length}`);
                return uniqueTeams;
            });
            
            console.log(`✅ KBO 공식에서 ${rankings.length}개 팀 데이터 추출`);
            
            if (rankings.length > 0) {
                console.log('\n📊 KBO 공식 순위 (상세):');
                rankings.forEach((team) => {
                    console.log(`   ${team.rank}. ${team.team}: ${team.wins}승 ${team.losses}패 ${team.draws}무 (승률 ${team.winRate}) [${team.games}경기] - 최근10: ${team.recent10}, 연속: ${team.streak}`);
                });
            }
            
            return rankings;
            
        } catch (error) {
            console.log(`❌ KBO 공식 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    async generateEnhancedWebsiteData(rankings) {
        console.log('\n🌐 상세 웹사이트 데이터 생성...');
        
        if (rankings.length === 0) {
            console.log('❌ 데이터 없음');
            return null;
        }
        
        // 게임차 계산
        const topTeam = rankings[0];
        const topWins = topTeam.wins;
        const topLosses = topTeam.losses;
        
        const processedRankings = rankings.map((team, index) => {
            const gamesBehind = ((topWins - team.wins) + (team.losses - topLosses)) / 2;
            
            return {
                rank: index + 1,
                team: team.team,
                games: team.games,
                wins: team.wins,
                losses: team.losses,
                draws: team.draws,
                winRate: Math.round(team.winRate * 1000) / 1000,
                gamesBehind: Math.round(gamesBehind * 10) / 10,
                recent10: team.recent10,
                streak: team.streak
            };
        });
        
        // 매직넘버 계산
        const magicNumbers = {};
        const remainingGames = 144;
        
        processedRankings.forEach(ranking => {
            const team = ranking.team;
            const currentWins = ranking.wins;
            const currentGames = ranking.games;
            const gamesLeft = remainingGames - currentGames;
            
            // 플레이오프 진출 매직넘버 (5위 기준)
            const fifthPlaceWins = processedRankings[4] ? processedRankings[4].wins : 0;
            const playoffMagic = Math.max(0, (fifthPlaceWins + 1) - currentWins);
            
            // 우승 매직넘버
            const firstPlaceWins = processedRankings[0].wins;
            const championshipMagic = ranking.rank === 1 ? 
                Math.max(0, Math.ceil((processedRankings[1]?.wins || 0) + 1 - currentWins)) : 
                Math.max(0, firstPlaceWins + 1 - currentWins);
            
            magicNumbers[team] = {
                playoff: playoffMagic > gamesLeft ? 999 : playoffMagic,
                championship: championshipMagic > gamesLeft ? 999 : championshipMagic,
                remainingGames: gamesLeft
            };
        });
        
        const websiteData = {
            lastUpdated: new Date().toISOString(),
            updateDate: new Date().toLocaleDateString('ko-KR'),
            note: 'KBO 공식 사이트 기준 (최근10경기, 연속기록 포함)',
            rankings: processedRankings,
            magicNumbers: magicNumbers,
            totalTeams: processedRankings.length,
            source: 'KBO_OFFICIAL_ENHANCED',
            dataDate: new Date().toISOString().split('T')[0]
        };
        
        return websiteData;
    }

    async updateWebsiteData(websiteData) {
        if (!websiteData) {
            console.log('❌ 웹사이트 데이터가 없습니다.');
            return { success: false };
        }
        
        console.log('\n🌐 웹사이트 데이터 업데이트...');
        
        try {
            const websitePath = path.join(process.cwd(), 'magic-number', 'kbo-rankings.json');
            
            fs.writeFileSync(websitePath, JSON.stringify(websiteData, null, 2), 'utf8');
            
            console.log('✅ 웹사이트 데이터 업데이트 완료');
            console.log(`📊 순위표: ${websiteData.rankings.length}개 팀`);
            console.log(`🎯 데이터 소스: KBO 공식 사이트 (상세)`);
            console.log(`💾 저장 위치: ${websitePath}`);
            
            // 상위 5팀 출력
            console.log('\n🏆 KBO 상위 5팀 (상세):');
            websiteData.rankings.slice(0, 5).forEach((team) => {
                console.log(`   ${team.rank}. ${team.team}: ${team.wins}승 ${team.losses}패 ${team.draws}무 (승률 ${team.winRate}) [GB: ${team.gamesBehind}] - 최근10: ${team.recent10}, 연속: ${team.streak}`);
            });
            
            return { success: true, websitePath };
            
        } catch (error) {
            console.log(`❌ 웹사이트 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    async crawlAndUpdate() {
        console.log('🎯 개선된 KBO 크롤링 시작');
        
        try {
            await this.init();
            
            // 1. KBO 공식 사이트에서 순위 크롤링
            const rankings = await this.crawlKBOOfficialRankings();
            
            if (rankings.length === 0) {
                console.log('⚠️ KBO 데이터를 가져오지 못했습니다.');
                return { success: false, message: 'KBO 데이터 없음' };
            }
            
            // 2. 웹사이트용 데이터 생성
            const websiteData = await this.generateEnhancedWebsiteData(rankings);
            
            // 3. 웹사이트 업데이트
            const updateResult = await this.updateWebsiteData(websiteData);
            
            if (updateResult.success) {
                console.log('\n🎉 개선된 KBO 크롤링 완료!');
                return {
                    success: true,
                    teamsCount: rankings.length,
                    websiteUpdated: true,
                    websitePath: updateResult.websitePath,
                    source: 'KBO_OFFICIAL_ENHANCED'
                };
            } else {
                return { success: false, error: updateResult.error };
            }
            
        } catch (error) {
            console.error('❌ 개선된 KBO 크롤링 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new EnhancedKBOCrawler();
    
    console.log(`${'='.repeat(70)}`);
    console.log(`🏟️ 개선된 KBO 크롤링 시스템`);
    console.log(`🎯 목표: 상세 데이터 (최근10경기, 연속기록) 포함`);
    console.log(`📡 소스: https://www.koreabaseball.com`);
    console.log(`${'='.repeat(70)}\n`);
    
    const result = await crawler.crawlAndUpdate();
    
    console.log(`\n${'='.repeat(70)}`);
    if (result.success) {
        console.log('✅ 개선된 KBO 크롤링 완료!');
        console.log(`📊 팀 수: ${result.teamsCount}개`);
        console.log(`🌐 웹사이트: 업데이트됨`);
        console.log(`📍 소스: ${result.source}`);
    } else {
        console.log('❌ 개선된 KBO 크롤링 실패');
        console.log(`💬 원인: ${result.error || result.message}`);
    }
    console.log(`${'='.repeat(70)}`);
}

if (require.main === module) {
    main();
}

module.exports = EnhancedKBOCrawler;