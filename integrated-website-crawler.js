#!/usr/bin/env node

/**
 * 통합 KBO 크롤링 시스템 - 웹사이트 자동 업데이트 포함
 * - 경기 결과 크롤링
 * - 상대전적 업데이트
 * - 웹사이트용 순위표 및 매직넘버 자동 생성
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class IntegratedWebsiteCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KT': 'KT', 'LG': 'LG', '키움': '키움', 'SSG': 'SSG', 'NC': 'NC',
            '롯데': '롯데', '두산': '두산', 'KIA': 'KIA', '삼성': '삼성', '한화': '한화'
        };
        console.log('🌐 통합 웹사이트 크롤링 시스템 시작...\n');
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
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async crawlGameResults(date) {
        try {
            const formattedDate = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${formattedDate}&category=kbo`;
            
            console.log(`📡 경기 결과 크롤링: ${formattedDate}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const gameResults = await this.page.evaluate((targetDate) => {
                const bodyText = document.body.textContent || '';
                const games = [];
                const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                
                // 해당 날짜 찾기
                const dateStr = targetDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일');
                const dateIndex = bodyText.indexOf(dateStr);
                
                if (dateIndex === -1) {
                    console.log(`${dateStr}을 찾을 수 없음`);
                    return [];
                }
                
                const dateSection = bodyText.substring(dateIndex, dateIndex + 5000);
                
                const scorePatterns = [
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*(\d+)[^0-9]*[-–][^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g,
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)/g
                ];
                
                for (const pattern of scorePatterns) {
                    let match;
                    while ((match = pattern.exec(dateSection)) !== null) {
                        const team1 = match[1];
                        const score1 = parseInt(match[2]);
                        const team2 = match[3] || match[4];
                        const score2 = parseInt(match[3] ? match[4] : match[3]);
                        
                        if (team1 !== team2 && !isNaN(score1) && !isNaN(score2) && 
                            teams.includes(team1) && teams.includes(team2)) {
                            
                            let winner, loser, winnerScore, loserScore;
                            if (score1 > score2) {
                                winner = team1;
                                loser = team2;
                                winnerScore = score1;
                                loserScore = score2;
                            } else if (score2 > score1) {
                                winner = team2;
                                loser = team1;
                                winnerScore = score2;
                                loserScore = score1;
                            } else {
                                continue; // 무승부
                            }
                            
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
                
                // 중복 제거
                const uniqueGames = [];
                const gameKeys = new Set();
                
                for (const game of games) {
                    const key = `${game.awayTeam}-${game.homeTeam}-${game.awayScore}-${game.homeScore}`;
                    if (!gameKeys.has(key)) {
                        gameKeys.add(key);
                        uniqueGames.push(game);
                    }
                }
                
                return uniqueGames;
                
            }, formattedDate);
            
            console.log(`✅ ${gameResults.length}개 경기 발견`);
            gameResults.forEach((game, i) => {
                console.log(`   ${i+1}. ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam} (승자: ${game.winner})`);
            });
            
            return gameResults;
            
        } catch (error) {
            console.log(`❌ 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    updateBackendRecords(gameResults) {
        console.log('\n📊 백엔드 상대전적 업데이트...');
        
        try {
            const recordsPath = path.join(process.cwd(), 'kbo-records.json');
            let records = {};
            
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

            gameResults.forEach((game) => {
                const { winner, loser } = game;
                
                if (!records.totalData[winner]) {
                    records.totalData[winner] = {};
                }
                if (!records.totalData[winner][loser]) {
                    records.totalData[winner][loser] = { wins: 0, losses: 0, draws: 0 };
                }
                if (!records.totalData[loser]) {
                    records.totalData[loser] = {};
                }
                if (!records.totalData[loser][winner]) {
                    records.totalData[loser][winner] = { wins: 0, losses: 0, draws: 0 };
                }

                records.totalData[winner][loser].wins++;
                records.totalData[loser][winner].losses++;
                
                console.log(`   ✅ ${winner} vs ${loser}: ${records.totalData[winner][loser].wins}승 ${records.totalData[winner][loser].losses}패`);
                addedGames++;
            });

            records.lastUpdated = new Date().toISOString();
            records.updateDate = new Date().toLocaleDateString('ko-KR');

            fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
            
            console.log(`📈 백엔드 ${addedGames}개 경기 결과 추가 완료`);

            return { success: true, addedGames, records };

        } catch (error) {
            console.log(`❌ 백엔드 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    calculateTeamStats(records) {
        console.log('\n🧮 팀별 통계 계산...');
        
        const teams = Object.keys(this.teamMapping);
        const teamStats = {};
        
        // 각 팀의 승/패/무 계산
        teams.forEach(team => {
            let wins = 0, losses = 0, draws = 0;
            
            if (records.totalData[team]) {
                Object.values(records.totalData[team]).forEach(record => {
                    wins += record.wins;
                    losses += record.losses;
                    draws += record.draws;
                });
            }
            
            const games = wins + losses + draws;
            const winRate = games > 0 ? wins / (wins + losses) : 0;
            
            teamStats[team] = {
                wins,
                losses,
                draws,
                games,
                winRate: Math.round(winRate * 1000) / 1000 // 소수점 3자리
            };
        });
        
        return teamStats;
    }

    generateWebsiteData(teamStats) {
        console.log('\n🌐 웹사이트용 데이터 생성...');
        
        // 승률 기준으로 정렬
        const sortedTeams = Object.entries(teamStats)
            .sort(([,a], [,b]) => b.winRate - a.winRate);
        
        const rankings = [];
        let previousWinRate = null;
        let previousGamesBehind = 0;
        const topWins = sortedTeams[0][1].wins;
        const topLosses = sortedTeams[0][1].losses;
        
        sortedTeams.forEach(([team, stats], index) => {
            // 게임 차이 계산
            const gamesBehind = ((topWins - stats.wins) + (stats.losses - topLosses)) / 2;
            
            rankings.push({
                rank: index + 1,
                team: team,
                games: stats.games,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                winRate: stats.winRate,
                gamesBehind: Math.round(gamesBehind * 10) / 10 // 소수점 1자리
            });
        });
        
        // 매직넘버 계산 (간단한 버전)
        const magicNumbers = {};
        const remainingGames = 144; // KBO 정규시즌 총 경기수
        
        rankings.forEach(ranking => {
            const team = ranking.team;
            const currentWins = ranking.wins;
            const currentGames = ranking.games;
            const gamesLeft = remainingGames - currentGames;
            
            // 플레이오프 진출 매직넘버 (5위 기준)
            const fifthPlaceWins = rankings[4] ? rankings[4].wins : 0;
            const playoffMagic = Math.max(0, (fifthPlaceWins + 1) - currentWins);
            
            // 우승 매직넘버 (1위 기준)
            const firstPlaceWins = rankings[0].wins;
            const championshipMagic = ranking.rank === 1 ? 
                Math.max(0, Math.ceil((rankings[1]?.wins || 0) + 1 - currentWins)) : 
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
            rankings: rankings,
            magicNumbers: magicNumbers,
            totalTeams: rankings.length
        };
        
        return websiteData;
    }

    updateWebsiteData(websiteData) {
        console.log('\n🌐 웹사이트 데이터 업데이트...');
        
        try {
            const websitePath = path.join(process.cwd(), 'magic-number', 'kbo-rankings.json');
            
            // 디렉토리가 존재하는지 확인
            const magicNumberDir = path.join(process.cwd(), 'magic-number');
            if (!fs.existsSync(magicNumberDir)) {
                console.log('⚠️ magic-number 디렉토리가 존재하지 않습니다');
                return { success: false, error: 'magic-number 디렉토리 없음' };
            }
            
            fs.writeFileSync(websitePath, JSON.stringify(websiteData, null, 2), 'utf8');
            
            console.log('✅ 웹사이트 데이터 업데이트 완료');
            console.log(`📊 순위표: ${websiteData.rankings.length}개 팀`);
            console.log(`🎯 매직넘버: ${Object.keys(websiteData.magicNumbers).length}개 팀`);
            console.log(`💾 저장 위치: ${websitePath}`);
            
            // 상위 3팀 출력
            console.log('\n🏆 현재 상위 3팀:');
            websiteData.rankings.slice(0, 3).forEach((team, i) => {
                console.log(`   ${i+1}. ${team.team}: ${team.wins}승 ${team.losses}패 (승률 ${team.winRate.toFixed(3)})`);
            });
            
            return { success: true, websitePath };
            
        } catch (error) {
            console.log(`❌ 웹사이트 데이터 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    async crawlAndUpdateAll(targetDate) {
        console.log(`🎯 ${targetDate} 통합 업데이트 시작`);
        
        try {
            await this.init();
            
            // 1. 경기 결과 크롤링
            const gameResults = await this.crawlGameResults(targetDate);
            
            if (gameResults.length === 0) {
                console.log('⚠️ 새로운 경기 결과가 없습니다. 기존 데이터로 웹사이트 업데이트합니다.');
            }
            
            // 2. 백엔드 상대전적 업데이트 (경기 있을 때만)
            let backendResult = { success: true, records: null };
            if (gameResults.length > 0) {
                backendResult = this.updateBackendRecords(gameResults);
                if (!backendResult.success) {
                    return { success: false, error: backendResult.error };
                }
            }
            
            // 3. 현재 기록 읽기
            const recordsPath = path.join(process.cwd(), 'kbo-records.json');
            let currentRecords = {};
            if (fs.existsSync(recordsPath)) {
                currentRecords = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
            }
            
            // 4. 팀별 통계 계산
            const teamStats = this.calculateTeamStats(currentRecords);
            
            // 5. 웹사이트용 데이터 생성
            const websiteData = this.generateWebsiteData(teamStats);
            
            // 6. 웹사이트 데이터 업데이트
            const websiteResult = this.updateWebsiteData(websiteData);
            
            if (websiteResult.success) {
                console.log('\n🎉 통합 업데이트 완료!');
                return {
                    success: true,
                    addedGames: backendResult.addedGames || 0,
                    gameResults,
                    websiteUpdated: true,
                    websitePath: websiteResult.websitePath
                };
            } else {
                return { success: false, error: websiteResult.error };
            }
            
        } catch (error) {
            console.error('❌ 통합 업데이트 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new IntegratedWebsiteCrawler();
    
    // 기본값을 어제 날짜로 설정 (경기는 보통 어제 끝남)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const defaultDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
    
    const targetDate = process.argv[2] || defaultDate;
    
    console.log(`${'='.repeat(70)}`);
    console.log(`🌐 통합 웹사이트 크롤링 시스템`);
    console.log(`📅 대상 날짜: ${targetDate}`);
    console.log(`🎯 기능: 경기결과 크롤링 + 백엔드 업데이트 + 웹사이트 자동 업데이트`);
    console.log(`${'='.repeat(70)}\n`);
    
    const result = await crawler.crawlAndUpdateAll(targetDate);
    
    console.log(`\n${'='.repeat(70)}`);
    if (result.success) {
        console.log('✅ 통합 업데이트 완료!');
        if (result.addedGames > 0) {
            console.log(`📊 새로운 경기: ${result.addedGames}개`);
        }
        console.log(`🌐 웹사이트: 업데이트됨`);
        console.log(`📍 웹사이트 파일: ${result.websitePath || 'magic-number/kbo-rankings.json'}`);
    } else {
        console.log('❌ 통합 업데이트 실패');
        console.log(`💬 원인: ${result.error}`);
    }
    console.log(`${'='.repeat(70)}`);
}

if (require.main === module) {
    main();
}

module.exports = IntegratedWebsiteCrawler;