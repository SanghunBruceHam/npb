#!/usr/bin/env node

/**
 * KBO 공식 사이트 팀 순위 크롤링
 * 정확한 데이터 정합성을 위한 공식 소스 사용
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class KBOOfficialCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        console.log('🏟️ KBO 공식 사이트 크롤링 시스템 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    async crawlOfficialRankings() {
        try {
            const url = 'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';
            console.log(`📡 KBO 공식 순위 크롤링: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 스크린샷 저장 (디버깅용)
            await this.page.screenshot({ path: 'kbo-official-debug.png' });
            console.log('📸 디버깅 스크린샷 저장: kbo-official-debug.png');
            
            // 순위 데이터 추출 (상세 데이터 포함)
            const rankings = await this.page.evaluate(() => {
                const teams = [];
                
                // KBO 팀명들
                const teamNames = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
                
                // 1. DOM 테이블에서 추출 시도
                const tableRows = document.querySelectorAll('table tbody tr');
                
                if (tableRows.length > 0) {
                    console.log(`테이블에서 ${tableRows.length}개 행 발견`);
                    
                    tableRows.forEach((row, index) => {
                        const cells = Array.from(row.querySelectorAll('td')).map(cell => cell.textContent.trim());
                        
                        if (cells.length >= 10) {
                            // 팀명 찾기
                            const teamName = cells.find(cell => teamNames.includes(cell));
                            
                            if (teamName) {
                                // 각 셀에서 데이터 추출
                                const rank = parseInt(cells[0]) || teams.length + 1;
                                const games = parseInt(cells[2]) || 0;
                                const wins = parseInt(cells[3]) || 0;
                                const losses = parseInt(cells[4]) || 0;
                                const draws = parseInt(cells[5]) || 0;
                                const winRate = parseFloat(cells[6]) || 0;
                                
                                // 최근 10경기 기록 추출 (예: "5승1무4패")
                                let recent10 = '';
                                let streak = '';
                                
                                for (let i = 7; i < cells.length; i++) {
                                    const cell = cells[i];
                                    
                                    // 최근 10경기 패턴 찾기 (승승무패 형태)
                                    if (cell.includes('승') && cell.includes('패')) {
                                        recent10 = cell;
                                    }
                                    
                                    // 연속 기록 패턴 찾기 (예: "2승", "1패")
                                    if (/^\d+[승패무]$/.test(cell) && !recent10.includes(cell)) {
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
                                    winRate: winRate,
                                    recent10: recent10 || 'N/A',
                                    streak: streak || 'N/A'
                                });
                            }
                        }
                    });
                }
                
                // 2. 텍스트 파싱으로 보완
                if (teams.length === 0) {
                    const bodyText = document.body.textContent || '';
                    console.log('텍스트 파싱 시작, 길이:', bodyText.length);
                    
                    const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // 팀명이 포함된 라인 찾기
                        for (const teamName of teamNames) {
                            if (line.includes(teamName)) {
                                // 숫자들을 추출
                                const numbers = line.match(/\d+/g);
                                const decimals = line.match(/\d+\.\d+/g);
                                
                                if (numbers && numbers.length >= 5) {
                                    const rank = teams.length + 1;
                                    const games = parseInt(numbers[1]) || 0;
                                    const wins = parseInt(numbers[2]) || 0;
                                    const losses = parseInt(numbers[3]) || 0;
                                    const draws = parseInt(numbers[4]) || 0;
                                    const winRate = decimals ? parseFloat(decimals[0]) : 0;
                                    
                                    // 최근 10경기와 연속 기록을 주변 라인에서 찾기
                                    let recent10 = 'N/A';
                                    let streak = 'N/A';
                                    
                                    // 현재 라인과 다음 몇 라인에서 패턴 찾기
                                    for (let j = i; j < Math.min(i + 3, lines.length); j++) {
                                        const checkLine = lines[j];
                                        
                                        // 승무패 패턴 (예: "5승1무4패")
                                        const recent10Match = checkLine.match(/(\d+승\d*무?\d*패|\d+승\d*패|\d+패\d*승)/);
                                        if (recent10Match && recent10 === 'N/A') {
                                            recent10 = recent10Match[1];
                                        }
                                        
                                        // 연속 기록 패턴 (예: "2승", "1패")
                                        const streakMatch = checkLine.match(/(\d+[승패무])/);
                                        if (streakMatch && streak === 'N/A' && !recent10.includes(streakMatch[1])) {
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
                                    
                                    console.log(`${teamName}: ${wins}승 ${losses}패 ${draws}무, 최근10: ${recent10}, 연속: ${streak}`);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                console.log('추출된 팀 수:', teams.length);
                return teams;
            });
            
            console.log(`✅ KBO 공식에서 ${rankings.length}개 팀 데이터 추출`);
            
            if (rankings.length > 0) {
                console.log('\n📊 KBO 공식 순위:');
                rankings.forEach((team, i) => {
                    console.log(`   ${team.rank || i+1}. ${team.team}: ${team.wins}승 ${team.losses}패 ${team.draws}무 (승률 ${team.winRate}) [${team.games}경기]`);
                });
            } else {
                console.log('⚠️ 순위 데이터를 추출하지 못했습니다.');
                
                // 페이지 내용 일부 출력 (디버깅)
                const pageContent = await this.page.evaluate(() => {
                    return document.body.textContent.substring(0, 2000);
                });
                console.log('\n📄 페이지 내용 샘플:');
                console.log(pageContent);
            }
            
            return rankings;
            
        } catch (error) {
            console.log(`❌ KBO 공식 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    async generateCorrectWebsiteData(officialRankings) {
        console.log('\n🌐 상세 웹사이트 데이터 생성...');
        
        if (officialRankings.length === 0) {
            console.log('❌ 공식 데이터가 없어 웹사이트 데이터를 생성할 수 없습니다.');
            return null;
        }
        
        // 승률 기준으로 정렬 (이미 정렬되어 있어야 하지만 확인)
        const sortedRankings = officialRankings.sort((a, b) => b.winRate - a.winRate);
        
        // 게임차 계산
        const topTeam = sortedRankings[0];
        const topWins = topTeam.wins;
        const topLosses = topTeam.losses;
        
        const rankings = sortedRankings.map((team, index) => {
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
                recent10: team.recent10 || 'N/A',
                streak: team.streak || 'N/A'
            };
        });
        
        // 매직넘버 계산 (개선된 버전)
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
            
            // 우승 매직넘버
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
            totalTeams: rankings.length,
            source: 'KBO_OFFICIAL_ENHANCED',
            note: 'KBO 공식 사이트 데이터 기반 (최근10경기, 연속기록 포함)',
            dataDate: new Date().toISOString().split('T')[0]
        };
        
        return websiteData;
    }

    async updateWebsiteWithOfficialData(websiteData) {
        if (!websiteData) {
            console.log('❌ 웹사이트 데이터가 없습니다.');
            return { success: false };
        }
        
        console.log('\n🌐 KBO 공식 데이터로 웹사이트 업데이트...');
        
        try {
            const websitePath = path.join(process.cwd(), 'magic-number', 'kbo-rankings.json');
            
            fs.writeFileSync(websitePath, JSON.stringify(websiteData, null, 2), 'utf8');
            
            console.log('✅ 웹사이트 데이터 업데이트 완료');
            console.log(`📊 순위표: ${websiteData.rankings.length}개 팀`);
            console.log(`🎯 데이터 소스: KBO 공식 사이트`);
            console.log(`💾 저장 위치: ${websitePath}`);
            
            // 상위 5팀 출력
            console.log('\n🏆 KBO 공식 상위 5팀:');
            websiteData.rankings.slice(0, 5).forEach((team, i) => {
                console.log(`   ${team.rank}. ${team.team}: ${team.wins}승 ${team.losses}패 ${team.draws}무 (승률 ${team.winRate}) [GB: ${team.gamesBehind}]`);
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
        console.log('🎯 KBO 공식 데이터 크롤링 및 웹사이트 업데이트 시작');
        
        try {
            await this.init();
            
            // 1. KBO 공식 사이트에서 순위 크롤링
            const officialRankings = await this.crawlOfficialRankings();
            
            if (officialRankings.length === 0) {
                console.log('⚠️ KBO 공식 데이터를 가져오지 못했습니다.');
                return { success: false, message: 'KBO 공식 데이터 없음' };
            }
            
            // 2. 웹사이트용 데이터 생성
            const websiteData = await this.generateCorrectWebsiteData(officialRankings);
            
            // 3. 웹사이트 업데이트
            const updateResult = await this.updateWebsiteWithOfficialData(websiteData);
            
            if (updateResult.success) {
                console.log('\n🎉 KBO 공식 데이터 크롤링 및 업데이트 완료!');
                return {
                    success: true,
                    teamsCount: officialRankings.length,
                    websiteUpdated: true,
                    websitePath: updateResult.websitePath,
                    source: 'KBO_OFFICIAL'
                };
            } else {
                return { success: false, error: updateResult.error };
            }
            
        } catch (error) {
            console.error('❌ KBO 공식 크롤링 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new KBOOfficialCrawler();
    
    console.log(`${'='.repeat(70)}`);
    console.log(`🏟️ KBO 공식 사이트 크롤링 시스템`);
    console.log(`🎯 목표: 정확한 데이터 정합성 확보`);
    console.log(`📡 소스: https://www.koreabaseball.com`);
    console.log(`${'='.repeat(70)}\n`);
    
    const result = await crawler.crawlAndUpdate();
    
    console.log(`\n${'='.repeat(70)}`);
    if (result.success) {
        console.log('✅ KBO 공식 데이터 크롤링 완료!');
        console.log(`📊 팀 수: ${result.teamsCount}개`);
        console.log(`🌐 웹사이트: 업데이트됨`);
        console.log(`📍 소스: ${result.source}`);
    } else {
        console.log('❌ KBO 공식 크롤링 실패');
        console.log(`💬 원인: ${result.error || result.message}`);
    }
    console.log(`${'='.repeat(70)}`);
}

if (require.main === module) {
    main();
}

module.exports = KBOOfficialCrawler;