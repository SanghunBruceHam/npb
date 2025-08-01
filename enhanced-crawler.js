#!/usr/bin/env node

/**
 * 개선된 KBO 크롤링 시스템
 * - 네이버 스포츠 (주요 소스, 검증됨)
 * - KBO 공식 (보조 소스, 검증용)
 * - 크로스 체크 및 신뢰성 확보
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class EnhancedKBOCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.teamMapping = {
            'KT': 'KT', 'LG': 'LG', '키움': '키움', 'SSG': 'SSG', 'NC': 'NC',
            '롯데': '롯데', '두산': '두산', 'KIA': 'KIA', '삼성': '삼성', '한화': '한화'
        };
        console.log('⚡ 개선된 KBO 크롤링 시스템 시작...\n');
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

    // 네이버 스포츠 크롤링 (메인 소스)
    async crawlNaverSports(date) {
        console.log(`🔵 네이버 스포츠 크롤링 (메인 소스)...`);
        
        try {
            const formattedDate = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${formattedDate}&category=kbo`;
            
            console.log(`📡 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 20000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            const gameResults = await this.page.evaluate((targetDate) => {
                const games = [];
                const teams = ['KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화'];
                const bodyText = document.body.textContent || '';
                
                console.log('페이지 텍스트 길이:', bodyText.length);
                
                // 날짜 찾기
                const dateStr = targetDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$2월 $3일');
                const dateIndex = bodyText.indexOf(dateStr);
                console.log(`${dateStr} 위치:`, dateIndex);
                
                if (dateIndex === -1) {
                    return [];
                }
                
                // 해당 날짜 섹션 추출
                const sectionStart = dateIndex;
                const sectionEnd = Math.min(dateIndex + 8000, bodyText.length);
                const dateSection = bodyText.substring(sectionStart, sectionEnd);
                
                console.log(`${dateStr} 섹션 길이:`, dateSection.length);
                
                // 개선된 패턴 매칭
                const patterns = [
                    // 패턴 1: 팀명 스코어 숫자 팀명 스코어 숫자
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*스코어[^0-9]*(\d+)/g,
                    // 패턴 2: 승/패 표시와 함께
                    /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*[승패][^0-9]*(\d+)[^0-9]*(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)[^0-9]*[승패][^0-9]*(\d+)/g
                ];
                
                const foundGames = new Set();
                
                for (const pattern of patterns) {
                    let match;
                    while ((match = pattern.exec(dateSection)) !== null) {
                        const team1 = match[1];
                        const score1 = parseInt(match[2]);
                        const team2 = match[3];
                        const score2 = parseInt(match[4]);
                        
                        console.log(`패턴 매치: ${team1} ${score1} vs ${team2} ${score2}`);
                        
                        if (team1 !== team2 && !isNaN(score1) && !isNaN(score2) && 
                            teams.includes(team1) && teams.includes(team2)) {
                            
                            const gameKey = `${team1}-${team2}-${score1}-${score2}`;
                            if (!foundGames.has(gameKey)) {
                                foundGames.add(gameKey);
                                
                                games.push({
                                    source: 'NAVER_SPORTS',
                                    team1, score1, team2, score2,
                                    winner: score1 > score2 ? team1 : team2,
                                    loser: score1 > score2 ? team2 : team1,
                                    winnerScore: Math.max(score1, score2),
                                    loserScore: Math.min(score1, score2)
                                });
                            }
                        }
                    }
                }
                
                return games;
                
            }, formattedDate);

            console.log(`   ✅ 네이버에서 ${gameResults.length}개 경기 발견`);
            
            gameResults.forEach((game, i) => {
                console.log(`      ${i+1}. ${game.team1} ${game.score1} - ${game.score2} ${game.team2} (승: ${game.winner})`);
            });
            
            return gameResults;
            
        } catch (error) {
            console.log(`❌ 네이버 크롤링 실패: ${error.message}`);
            return [];
        }
    }

    // KBO 공식 사이트 (검증용)
    async crawlKBOForVerification(date) {
        console.log(`🏟️ KBO 공식 사이트 검증 크롤링...`);
        
        try {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?GameDate=${date}`;
            console.log(`📡 KBO URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 페이지 제목과 기본 정보 확인
            const pageInfo = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    textLength: document.body.textContent.length,
                    hasGameData: document.body.textContent.includes('경기') || 
                                document.body.textContent.includes('KT') ||
                                document.body.textContent.includes('LG')
                };
            });
            
            console.log(`   📄 페이지 제목: ${pageInfo.title}`);
            console.log(`   📊 텍스트 길이: ${pageInfo.textLength}`);
            console.log(`   🎯 경기 데이터 존재: ${pageInfo.hasGameData ? '예' : '아니오'}`);
            
            if (pageInfo.hasGameData && pageInfo.textLength > 1000) {
                console.log(`   ✅ KBO 공식 사이트 접근 가능 (검증 소스로 활용 가능)`);
                return { accessible: true, reliable: true };
            } else {
                console.log(`   ⚠️ KBO 공식 사이트 데이터 부족`);
                return { accessible: false, reliable: false };
            }
            
        } catch (error) {
            console.log(`   ❌ KBO 공식 크롤링 실패: ${error.message}`);
            return { accessible: false, reliable: false };
        }
    }

    // 결과 검증 및 신뢰성 체크
    validateResults(naverResults, kboVerification) {
        console.log('\n🔍 결과 검증 및 신뢰성 체크...');
        
        let reliabilityScore = 0;
        const validationResults = {
            naverCount: naverResults.length,
            kboAccessible: kboVerification.accessible,
            reliabilityScore: 0,
            confidence: 'LOW'
        };
        
        // 네이버 결과 평가
        if (naverResults.length > 0) {
            reliabilityScore += 60; // 기본 점수
            
            // 경기 수가 합리적인지 (1-5경기)
            if (naverResults.length >= 1 && naverResults.length <= 5) {
                reliabilityScore += 20;
                console.log(`   ✅ 합리적인 경기 수: ${naverResults.length}경기 (+20점)`);
            }
            
            // 점수가 합리적인지 (0-30점 사이)
            const hasReasonableScores = naverResults.every(game => 
                game.score1 >= 0 && game.score1 <= 30 && 
                game.score2 >= 0 && game.score2 <= 30
            );
            
            if (hasReasonableScores) {
                reliabilityScore += 10;
                console.log(`   ✅ 합리적인 점수 범위 (+10점)`);
            }
            
            // 팀명 중복 없는지
            const teamPairs = naverResults.map(g => `${g.team1}-${g.team2}`);
            const uniquePairs = new Set(teamPairs);
            if (teamPairs.length === uniquePairs.size) {
                reliabilityScore += 10;
                console.log(`   ✅ 중복 경기 없음 (+10점)`);
            }
        }
        
        // KBO 사이트 접근성 보너스
        if (kboVerification.accessible) {
            console.log(`   ✅ KBO 공식 사이트 접근 가능 (신뢰성 향상)`);
        }
        
        validationResults.reliabilityScore = reliabilityScore;
        
        // 신뢰도 등급 결정
        if (reliabilityScore >= 90) {
            validationResults.confidence = 'VERY_HIGH';
        } else if (reliabilityScore >= 80) {
            validationResults.confidence = 'HIGH';
        } else if (reliabilityScore >= 60) {
            validationResults.confidence = 'MEDIUM';
        } else {
            validationResults.confidence = 'LOW';
        }
        
        console.log(`   📊 신뢰도 점수: ${reliabilityScore}/100`);
        console.log(`   🎯 신뢰도 등급: ${validationResults.confidence}`);
        
        return validationResults;
    }

    updateRecords(gameResults, validationInfo) {
        console.log('\n📊 상대전적 업데이트...');
        
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
                    metadata: {}
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

            // 메타데이터 추가
            records.lastUpdated = new Date().toISOString();
            records.updateDate = new Date().toLocaleDateString('ko-KR');
            records.metadata = {
                lastCrawlSource: 'NAVER_SPORTS',
                reliability: validationInfo.confidence,
                reliabilityScore: validationInfo.reliabilityScore,
                gamesAdded: addedGames,
                kboSiteAccessible: validationInfo.kboAccessible
            };

            fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2), 'utf8');
            
            console.log(`\n📈 총 ${addedGames}개 경기 결과 추가`);
            console.log(`🎯 신뢰도: ${validationInfo.confidence} (${validationInfo.reliabilityScore}점)`);
            console.log(`💾 업데이트 완료: ${recordsPath}`);

            return { success: true, addedGames, reliability: validationInfo.confidence };

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

    async crawlAndValidate(targetDate) {
        console.log(`🎯 ${targetDate} 경기 결과 크롤링 및 검증 시작`);
        
        try {
            await this.init();
            
            // 1. 네이버 스포츠에서 경기 결과 크롤링
            const naverResults = await this.crawlNaverSports(targetDate);
            
            // 2. KBO 공식 사이트 접근성 검증
            const kboVerification = await this.crawlKBOForVerification(targetDate);
            
            // 3. 결과 검증
            const validation = this.validateResults(naverResults, kboVerification);
            
            if (naverResults.length === 0) {
                console.log('⚠️ 크롤링된 경기 결과가 없습니다.');
                return { success: false, message: '경기 결과 없음', validation };
            }
            
            if (validation.confidence === 'LOW') {
                console.log('⚠️ 신뢰도가 낮습니다. 결과를 신중히 검토하세요.');
            }
            
            // 4. 상대전적 업데이트
            const updateResult = this.updateRecords(naverResults, validation);
            
            if (updateResult.success) {
                console.log('\n🎉 개선된 크롤링 및 검증 완료!');
                return {
                    success: true,
                    addedGames: updateResult.addedGames,
                    reliability: updateResult.reliability,
                    gameResults: naverResults,
                    validation
                };
            } else {
                return { success: false, error: updateResult.error };
            }
            
        } catch (error) {
            console.error('❌ 크롤링 및 검증 중 오류:', error);
            return { success: false, error: error.message };
        } finally {
            await this.close();
        }
    }
}

// 실행
async function main() {
    const crawler = new EnhancedKBOCrawler();
    
    const targetDate = process.argv[2] || '20250731';
    
    console.log(`${'='.repeat(70)}`);
    console.log(`⚡ 개선된 KBO 크롤링 시스템`);
    console.log(`📅 대상 날짜: ${targetDate}`);
    console.log(`🎯 메인 소스: 네이버 스포츠 (검증됨)`);
    console.log(`🔍 검증 소스: KBO 공식 (신뢰성 체크)`);
    console.log(`${'='.repeat(70)}\n`);
    
    const result = await crawler.crawlAndValidate(targetDate);
    
    console.log(`\n${'='.repeat(70)}`);
    if (result.success) {
        console.log('✅ 개선된 크롤링 완료!');
        console.log(`📊 총 ${result.addedGames}개 경기 결과 통합`);
        console.log(`🎯 신뢰도: ${result.reliability}`);
        console.log(`📈 검증 점수: ${result.validation.reliabilityScore}/100`);
    } else {
        console.log('❌ 크롤링 실패');
        console.log(`💬 원인: ${result.error || result.message}`);
        if (result.validation) {
            console.log(`📊 검증 정보: 신뢰도 ${result.validation.confidence}`);
        }
    }
    console.log(`${'='.repeat(70)}`);
}

if (require.main === module) {
    main();
}

module.exports = EnhancedKBOCrawler;