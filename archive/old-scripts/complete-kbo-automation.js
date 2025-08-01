#!/usr/bin/env node

/**
 * 완전 자동화 KBO 크롤링 시스템
 * - KBO 공식 사이트에서 팀 순위/통계 크롤링 (최근10경기, 연속기록 포함)
 * - 네이버 스포츠에서 최신 경기 결과 크롤링
 * - 상대전적 자동 업데이트
 * - 웹사이트 데이터 실시간 동기화
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CompleteKBOAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KT': 'KT', 'LG': 'LG', '키움': '키움', 'SSG': 'SSG', 'NC': 'NC',
            '롯데': '롯데', '두산': '두산', 'KIA': 'KIA', '삼성': '삼성', '한화': '한화'
        };
        console.log('🚀 완전 자동화 KBO 시스템 시작...\n');
    }

    async init() {
        console.log('🌟 브라우저 초기화...');
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
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    // ========================================
    // 1. KBO 공식 사이트 팀 순위/통계 크롤링
    // ========================================
    async crawlKBOOfficialRankings() {
        try {
            const url = 'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';
            console.log(`\n📊 KBO 공식 순위 크롤링: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 디버깅 스크린샷
            await this.page.screenshot({ path: 'complete-kbo-debug.png' });
            console.log('📸 디버깅 스크린샷: complete-kbo-debug.png');
            
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
                    
                    rows.forEach((row) => {
                        const cells = Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim());
                        
                        if (cells.length >= 8) {
                            const teamName = cells.find(cell => teamNames.includes(cell));
                            
                            if (teamName) {
                                const teamIndex = cells.findIndex(cell => cell === teamName);
                                
                                const rank = parseInt(cells[0]) || teams.length + 1;
                                const games = parseInt(cells[teamIndex + 1]) || 0;
                                const wins = parseInt(cells[teamIndex + 2]) || 0;
                                const losses = parseInt(cells[teamIndex + 3]) || 0;
                                const draws = parseInt(cells[teamIndex + 4]) || 0;
                                const winRateText = cells[teamIndex + 5] || '0';
                                const winRate = parseFloat(winRateText.replace(/[^\d.]/g, '')) || 0;
                                
                                // 최근 10경기, 연속 기록 찾기
                                let recent10 = 'N/A';
                                let streak = 'N/A';
                                
                                for (let i = teamIndex + 6; i < cells.length; i++) {
                                    const cell = cells[i];
                                    
                                    if (/\d+승.*?\d*무.*?\d*패/.test(cell) || /\d+승.*?\d*패/.test(cell)) {
                                        recent10 = cell;
                                    }
                                    
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
                }
                
                // 중복 제거 및 정렬
                const uniqueTeams = [];
                const seenTeams = new Set();
                
                for (const team of teams) {
                    if (!seenTeams.has(team.team) && team.games > 50) {
                        seenTeams.add(team.team);
                        uniqueTeams.push(team);
                    }
                }
                
                uniqueTeams.sort((a, b) => b.winRate - a.winRate);
                uniqueTeams.forEach((team, index) => {
                    team.rank = index + 1;
                });
                
                return uniqueTeams;
            });
            
            console.log(`✅ KBO 공식에서 ${rankings.length}개 팀 순위 데이터 추출`);
            return rankings;
            
        } catch (error) {
            console.log(`❌ KBO 공식 순위 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    // ========================================
    // 2. 네이버 스포츠 최신 경기 결과 크롤링
    // ========================================
    async crawlRecentGameResults(daysBack = 3) {
        console.log(`\n⚾ 최근 ${daysBack}일 경기 결과 크롤링...`);
        
        const allResults = [];
        const today = new Date();
        
        for (let i = 0; i < daysBack; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - i);
            
            const dateStr = targetDate.toISOString().split('T')[0];
            const results = await this.crawlGameResultsForDate(dateStr);
            
            if (results.length > 0) {
                allResults.push(...results);
                console.log(`   📅 ${dateStr}: ${results.length}개 경기`);
            }
        }
        
        console.log(`✅ 총 ${allResults.length}개 경기 결과 수집`);
        return allResults;
    }

    async crawlGameResultsForDate(date) {
        try {
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${date}&category=kbo`;
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const gameResults = await this.page.evaluate((targetDate) => {
                const games = [];
                const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                
                // 스코어 패턴 찾기
                const bodyText = document.body.textContent || '';
                const scorePatterns = [
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*(\d+)[^0-9]*[-–:][^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g,
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^\d]*(\d+)\s*:\s*(\d+)[^\d]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g
                ];
                
                for (const pattern of scorePatterns) {
                    let match;
                    while ((match = pattern.exec(bodyText)) !== null) {
                        const team1 = match[1];
                        const score1 = parseInt(match[2]);
                        const score2 = parseInt(match[3]);
                        const team2 = match[4];
                        
                        if (team1 !== team2 && !isNaN(score1) && !isNaN(score2) && 
                            teams.includes(team1) && teams.includes(team2)) {
                            
                            if (score1 !== score2) { // 무승부 제외
                                const winner = score1 > score2 ? team1 : team2;
                                const loser = score1 > score2 ? team2 : team1;
                                const winnerScore = Math.max(score1, score2);
                                const loserScore = Math.min(score1, score2);
                                
                                games.push({
                                    date: targetDate,
                                    winner,
                                    loser,
                                    winnerScore,
                                    loserScore,
                                    awayTeam: team1,
                                    homeTeam: team2,
                                    awayScore: score1,
                                    homeScore: score2
                                });
                            }
                        }
                    }
                }
                
                // 중복 제거
                const uniqueGames = [];
                const gameKeys = new Set();
                
                for (const game of games) {
                    const key = `${game.date}-${game.awayTeam}-${game.homeTeam}-${game.awayScore}-${game.homeScore}`;
                    if (!gameKeys.has(key)) {
                        gameKeys.add(key);
                        uniqueGames.push(game);
                    }
                }
                
                return uniqueGames;
                
            }, date);
            
            return gameResults;
            
        } catch (error) {
            console.log(`❌ ${date} 경기 결과 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    // ========================================
    // 3. 상대전적 데이터 업데이트
    // ========================================
    updateHeadToHeadRecords(gameResults) {
        console.log(`\n🔄 상대전적 데이터 업데이트... (${gameResults.length}개 경기)`);
        
        try {
            const recordsPath = path.join(process.cwd(), 'kbo-records.json');
            let records = {};
            
            // 기존 데이터 로드
            if (fs.existsSync(recordsPath)) {
                records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
            }

            if (!records.totalData) {
                records = {
                    lastUpdated: new Date().toISOString(),
                    updateDate: new Date().toLocaleDateString('ko-KR'),
                    totalData: {},
                    homeAwayBreakdown: {}
                };
            }

            let addedGames = 0;
            const processedGames = new Set();

            gameResults.forEach((game) => {
                const gameKey = `${game.date}-${game.awayTeam}-${game.homeTeam}-${game.awayScore}-${game.homeScore}`;
                
                if (processedGames.has(gameKey)) return;
                processedGames.add(gameKey);

                const { winner, loser, awayTeam, homeTeam, awayScore, homeScore } = game;
                
                // 전체 상대전적 업데이트
                if (!records.totalData[winner]) records.totalData[winner] = {};
                if (!records.totalData[winner][loser]) {
                    records.totalData[winner][loser] = { wins: 0, losses: 0, draws: 0 };
                }
                if (!records.totalData[loser]) records.totalData[loser] = {};
                if (!records.totalData[loser][winner]) {
                    records.totalData[loser][winner] = { wins: 0, losses: 0, draws: 0 };
                }

                records.totalData[winner][loser].wins++;
                records.totalData[loser][winner].losses++;
                
                // 홈/어웨이 세부 기록 업데이트
                if (!records.homeAwayBreakdown[awayTeam]) records.homeAwayBreakdown[awayTeam] = {};
                if (!records.homeAwayBreakdown[awayTeam][homeTeam]) {
                    records.homeAwayBreakdown[awayTeam][homeTeam] = {
                        home: { wins: 0, losses: 0, draws: 0 },
                        away: { wins: 0, losses: 0, draws: 0 }
                    };
                }

                if (winner === awayTeam) {
                    records.homeAwayBreakdown[awayTeam][homeTeam].away.wins++;
                } else {
                    records.homeAwayBreakdown[awayTeam][homeTeam].away.losses++;
                }

                console.log(`   ✅ ${winner} ${game.winnerScore}-${game.loserScore} ${loser} (${game.date})`);
                addedGames++;
            });

            records.lastUpdated = new Date().toISOString();
            records.updateDate = new Date().toLocaleDateString('ko-KR');

            fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
            
            console.log(`📊 상대전적 ${addedGames}개 경기 업데이트 완료`);
            return { success: true, addedGames, records };

        } catch (error) {
            console.log(`❌ 상대전적 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // 4. 웹사이트 데이터 생성 및 업데이트
    // ========================================
    generateWebsiteData(rankings) {
        console.log(`\n🌐 웹사이트 데이터 생성...`);
        
        if (rankings.length === 0) {
            console.log('❌ 순위 데이터 없음');
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
        
        return {
            lastUpdated: new Date().toISOString(),
            updateDate: new Date().toLocaleDateString('ko-KR'),
            note: 'KBO 공식 + 네이버 스포츠 통합 (완전 자동화)',
            rankings: processedRankings,
            magicNumbers: magicNumbers,
            totalTeams: processedRankings.length,
            source: 'COMPLETE_AUTOMATION',
            dataDate: new Date().toISOString().split('T')[0]
        };
    }

    updateWebsiteFiles(websiteData) {
        if (!websiteData) {
            console.log('❌ 웹사이트 데이터가 없습니다.');
            return { success: false };
        }
        
        console.log(`\n📱 웹사이트 파일 업데이트...`);
        
        try {
            const websitePath = path.join(process.cwd(), 'magic-number', 'kbo-rankings.json');
            
            fs.writeFileSync(websitePath, JSON.stringify(websiteData, null, 2), 'utf8');
            
            console.log('✅ 웹사이트 데이터 업데이트 완료');
            console.log(`📊 순위표: ${websiteData.rankings.length}개 팀`);
            console.log(`🎯 데이터 소스: 완전 자동화 시스템`);
            console.log(`💾 저장 위치: ${websitePath}`);
            
            // 상위 5팀 출력
            console.log(`\n🏆 KBO 상위 5팀 (완전 자동화):`);
            websiteData.rankings.slice(0, 5).forEach((team) => {
                console.log(`   ${team.rank}. ${team.team}: ${team.wins}승 ${team.losses}패 ${team.draws}무 (승률 ${team.winRate}) [GB: ${team.gamesBehind}] - 최근10: ${team.recent10}, 연속: ${team.streak}`);
            });
            
            return { success: true, websitePath };
            
        } catch (error) {
            console.log(`❌ 웹사이트 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // 5. 메인 실행 함수
    // ========================================
    async runCompleteAutomation() {
        console.log(`${'='.repeat(80)}`);
        console.log(`🚀 완전 자동화 KBO 시스템 실행`);
        console.log(`📊 순위 크롤링 + ⚾ 경기 결과 + 🔄 상대전적 + 🌐 웹사이트 업데이트`);
        console.log(`${'='.repeat(80)}\n`);
        
        try {
            await this.init();
            
            // 1단계: KBO 공식 순위 크롤링
            console.log('🎯 1단계: KBO 공식 순위 데이터 크롤링');
            const rankings = await this.crawlKBOOfficialRankings();
            
            if (rankings.length === 0) {
                console.log('⚠️ KBO 순위 데이터를 가져오지 못했습니다.');
                return { success: false, message: 'KBO 순위 데이터 없음' };
            }
            
            // 2단계: 최신 경기 결과 크롤링
            console.log('🎯 2단계: 최신 경기 결과 크롤링');
            const gameResults = await this.crawlRecentGameResults(3);
            
            // 3단계: 상대전적 업데이트
            console.log('🎯 3단계: 상대전적 데이터 업데이트');
            const recordsUpdate = this.updateHeadToHeadRecords(gameResults);
            
            // 4단계: 웹사이트 데이터 생성
            console.log('🎯 4단계: 웹사이트 데이터 생성');
            const websiteData = this.generateWebsiteData(rankings);
            
            // 5단계: 웹사이트 파일 업데이트
            console.log('🎯 5단계: 웹사이트 파일 업데이트');
            const websiteUpdate = this.updateWebsiteFiles(websiteData);
            
            if (websiteUpdate.success) {
                console.log(`\n${'='.repeat(80)}`);
                console.log('🎉 완전 자동화 KBO 시스템 실행 완료!');
                console.log(`📊 팀 순위: ${rankings.length}개 팀`);
                console.log(`⚾ 경기 결과: ${gameResults.length}개 경기`);
                console.log(`🔄 상대전적: ${recordsUpdate.addedGames || 0}개 경기 추가`);
                console.log(`🌐 웹사이트: 업데이트 완료`);
                console.log(`${'='.repeat(80)}`);
                
                return {
                    success: true,
                    rankings: rankings.length,
                    gameResults: gameResults.length,
                    recordsUpdated: recordsUpdate.addedGames || 0,
                    websiteUpdated: true,
                    source: 'COMPLETE_AUTOMATION'
                };
            } else {
                return { success: false, error: websiteUpdate.error };
            }
            
        } catch (error) {
            console.error('❌ 완전 자동화 실행 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
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
    const automation = new CompleteKBOAutomation();
    const result = await automation.runCompleteAutomation();
    
    if (result.success) {
        console.log('\n✅ 완전 자동화 성공!');
        process.exit(0);
    } else {
        console.log('\n❌ 완전 자동화 실패:', result.error || result.message);
        process.exit(1);
    }
}

// 스크립트 직접 실행 시
if (require.main === module) {
    main().catch(console.error);
}

module.exports = CompleteKBOAutomation;