#!/usr/bin/env node

/**
 * Puppeteer 크롤링 결과를 KBO 상대전적 시스템에 통합
 * 실제 웹에서 가져온 경기 결과를 파싱하여 추가
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class IntegratedKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KT': 'KT', 'LG': 'LG', '키움': '키움', 'SSG': 'SSG', 'NC': 'NC',
            '롯데': '롯데', '두산': '두산', 'KIA': 'KIA', '삼성': '삼성', '한화': '한화'
        };
        console.log('🤖 Puppeteer 통합 KBO 크롤링 시스템 시작...\n');
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
            
            console.log(`📡 네이버 스포츠 크롤링: ${formattedDate}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 페이지 텍스트에서 완료된 경기 결과 추출
            const gameResults = await this.page.evaluate((targetDate) => {
                const bodyText = document.body.textContent || '';
                
                const games = [];
                const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                
                console.log('Body text length:', bodyText.length);
                console.log('Looking for date:', targetDate);
                
                // 7월 31일 찾기
                const july31Index = bodyText.indexOf('7월 31일');
                console.log('7월 31일 found at index:', july31Index);
                
                if (july31Index === -1) {
                    console.log('7월 31일을 찾을 수 없음');
                    return [];
                }
                
                // 7월 31일 섹션 추출 (더 넓게)
                const startIndex = july31Index;
                const endIndex = Math.min(july31Index + 5000, bodyText.length);
                const july31Section = bodyText.substring(startIndex, endIndex);
                
                console.log('July 31 section length:', july31Section.length);
                console.log('July 31 section preview:', july31Section.substring(0, 500));
                
                // 간단한 패턴: 팀명 점수 - 점수 팀명
                const scorePatterns = [
                    // KT 0 - 18 LG 패턴
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*(\d+)[^0-9]*[-–][^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/g,
                    // 패 헤이수스 스코어 0 LG 홈 승 송승기 스코어 18 패턴
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)/g
                ];
                
                for (const pattern of scorePatterns) {
                    let match;
                    while ((match = pattern.exec(july31Section)) !== null) {
                        const team1 = match[1];
                        const score1 = parseInt(match[2]);
                        const team2 = match[3] || match[4];
                        const score2 = parseInt(match[3] ? match[4] : match[3]);
                        
                        console.log('Found match:', team1, score1, team2, score2);
                        
                        // 팀명이 다르고 유효한 점수인지 확인
                        if (team1 !== team2 && !isNaN(score1) && !isNaN(score2) && 
                            teams.includes(team1) && teams.includes(team2)) {
                            
                            // 승/패 결정
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
            
            console.log(`✅ ${gameResults.length}개 완료된 경기 발견:`);
            gameResults.forEach((game, i) => {
                console.log(`   ${i+1}. ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam} (승자: ${game.winner})`);
            });
            
            return gameResults;
            
        } catch (error) {
            console.log(`❌ 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    updateRecords(gameResults) {
        console.log('\n📊 상대전적 업데이트 시작...');
        
        try {
            // 현재 records 읽기
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

            // 각 게임 결과 추가
            gameResults.forEach((game) => {
                const { winner, loser } = game;
                
                // totalData 업데이트
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

                // 승/패 추가
                records.totalData[winner][loser].wins++;
                records.totalData[loser][winner].losses++;
                
                console.log(`   ✅ ${winner} vs ${loser}: ${records.totalData[winner][loser].wins}승 ${records.totalData[winner][loser].losses}패로 업데이트`);
                addedGames++;
            });

            // 업데이트 시간 갱신
            records.lastUpdated = new Date().toISOString();
            records.updateDate = new Date().toLocaleDateString('ko-KR');

            // 파일 저장
            fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
            
            console.log(`\n📈 총 ${addedGames}개 경기 결과 추가 완료`);
            console.log(`💾 업데이트된 상대전적 저장: ${recordsPath}`);

            return { success: true, addedGames, records };

        } catch (error) {
            console.log(`❌ 기록 업데이트 실패: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    async crawlAndIntegrate(targetDate) {
        console.log(`🎯 ${targetDate} 경기 결과 크롤링 및 통합 시작`);
        
        try {
            await this.init();
            
            // 1. 웹에서 경기 결과 크롤링
            const gameResults = await this.crawlGameResults(targetDate);
            
            if (gameResults.length === 0) {
                console.log('⚠️ 크롤링된 경기 결과가 없습니다.');
                return { success: false, message: '경기 결과 없음' };
            }
            
            // 2. 기존 기록에 통합
            const updateResult = this.updateRecords(gameResults);
            
            if (updateResult.success) {
                console.log('\n🎉 크롤링 및 통합 성공!');
                console.log(`   - ${updateResult.addedGames}개 경기 결과 추가`);
                console.log(`   - 상대전적 정상 업데이트`);
                
                return {
                    success: true,
                    addedGames: updateResult.addedGames,
                    gameResults,
                    records: updateResult.records
                };
            } else {
                console.log('\n❌ 통합 실패:', updateResult.error);
                return { success: false, error: updateResult.error };
            }
            
        } catch (error) {
            console.error('❌ 크롤링 및 통합 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new IntegratedKBOCrawler();
    
    // 명령행에서 날짜 받기 (기본값: 20250731)
    const targetDate = process.argv[2] || '20250731';
    
    console.log(`${'='.repeat(60)}`);
    console.log(`🕷️ Puppeteer 통합 KBO 크롤링 시스템`);
    console.log(`📅 대상 날짜: ${targetDate}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const result = await crawler.crawlAndIntegrate(targetDate);
    
    console.log(`\n${'='.repeat(60)}`);
    if (result.success) {
        console.log('✅ 크롤링 및 통합 완료!');
        console.log(`📊 총 ${result.addedGames}개 경기 결과 통합됨`);
    } else {
        console.log('❌ 크롤링 및 통합 실패');
        console.log(`💬 원인: ${result.error || result.message}`);
    }
    console.log(`${'='.repeat(60)}`);
}

if (require.main === module) {
    main();
}

module.exports = IntegratedKBOCrawler;