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
            
            // 순위 데이터 추출
            const rankings = await this.page.evaluate(() => {
                const teams = [];
                
                // 다양한 선택자 시도
                const selectors = [
                    'table tbody tr',
                    '.tData tbody tr',
                    '#tblTeamRank tbody tr',
                    '[class*="rank"] tbody tr',
                    'table[class*="team"] tbody tr'
                ];
                
                let foundRows = [];
                
                for (const selector of selectors) {
                    const rows = document.querySelectorAll(selector);
                    if (rows.length > 0) {
                        console.log(`선택자 ${selector}: ${rows.length}개 행 발견`);
                        foundRows = Array.from(rows);
                        break;
                    }
                }
                
                // 텍스트에서 직접 추출 시도
                if (foundRows.length === 0) {
                    const bodyText = document.body.textContent || '';
                    console.log('Body text length:', bodyText.length);
                    
                    // KBO 팀명들
                    const teamNames = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
                    
                    // 순위표 패턴 찾기
                    const lines = bodyText.split('\n');
                    let rankingLines = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        for (const teamName of teamNames) {
                            if (line.includes(teamName) && /\d+/.test(line)) {
                                rankingLines.push(line);
                                console.log('순위 라인 발견:', line);
                            }
                        }
                    }
                    
                    // 패턴 매칭으로 데이터 추출
                    rankingLines.forEach((line, index) => {
                        // 순위 팀명 경기수 승 패 무 승률 패턴
                        const match = line.match(/(\d+)\s*(한화|LG|롯데|SSG|KT|KIA|삼성|NC|두산|키움)\s*(\d+)\s*(\d+)\s*(\d+)\s*(\d+)\s*(\d?\.\d+)/);
                        
                        if (match) {
                            teams.push({
                                rank: parseInt(match[1]),
                                team: match[2],
                                games: parseInt(match[3]),
                                wins: parseInt(match[4]),
                                losses: parseInt(match[5]),
                                draws: parseInt(match[6]),
                                winRate: parseFloat(match[7])
                            });
                        } else {
                            // 다른 패턴 시도
                            const altMatch = line.match(/(한화|LG|롯데|SSG|KT|KIA|삼성|NC|두산|키움).*?(\d+).*?(\d+).*?(\d+).*?(\d+).*?(\d?\.\d+)/);
                            if (altMatch) {
                                teams.push({
                                    rank: index + 1,
                                    team: altMatch[1],
                                    games: parseInt(altMatch[2]),
                                    wins: parseInt(altMatch[3]),
                                    losses: parseInt(altMatch[4]),
                                    draws: parseInt(altMatch[5]),
                                    winRate: parseFloat(altMatch[6])
                                });
                            }
                        }
                    });
                }
                
                // DOM에서 테이블 추출 시도
                if (foundRows.length > 0 && teams.length === 0) {
                    foundRows.forEach((row, index) => {
                        const cells = row.querySelectorAll('td, th');
                        if (cells.length >= 6) {
                            const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
                            
                            // 팀명이 포함된 행 찾기
                            const teamNames = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
                            const teamName = cellTexts.find(text => teamNames.includes(text));
                            
                            if (teamName) {
                                // 숫자 데이터 추출
                                const numbers = cellTexts.filter(text => /^\d+(\.\d+)?$/.test(text)).map(text => {
                                    return text.includes('.') ? parseFloat(text) : parseInt(text);
                                });
                                
                                if (numbers.length >= 5) {
                                    teams.push({
                                        rank: index + 1,
                                        team: teamName,
                                        games: numbers[0] || 0,
                                        wins: numbers[1] || 0,
                                        losses: numbers[2] || 0,
                                        draws: numbers[3] || 0,
                                        winRate: numbers[4] || 0
                                    });
                                }
                            }
                        }
                    });
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
        console.log('\n🌐 정확한 웹사이트 데이터 생성...');
        
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
                gamesBehind: Math.round(gamesBehind * 10) / 10
            };
        });
        
        // 매직넘버 계산 (간단 버전)
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
            source: 'KBO_OFFICIAL',
            note: 'KBO 공식 사이트 데이터 기반'
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