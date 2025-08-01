#!/usr/bin/env node

/**
 * 오늘 KBO 경기 결과 스크래핑 테스트
 */

const https = require('https');

// KBO 팀 매핑
const TEAM_MAPPING = {
    'KT': 'KT',
    'LG': 'LG', 
    '키움': '키움',
    'SSG': 'SSG',
    'NC': 'NC',
    '롯데': '롯데',
    '두산': '두산',
    'KIA': 'KIA',
    '삼성': '삼성',
    '한화': '한화'
};

class TodayGamesTester {
    constructor() {
        console.log('🔍 오늘 KBO 경기 결과 스크래핑 테스트 시작...\n');
    }

    async fetchScoreboardData(date) {
        return new Promise((resolve, reject) => {
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?seriesId=1&gameDate=${date}`;
            console.log(`📡 요청 URL: ${url}`);
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive'
                }
            };
            
            const req = https.get(url, options, (res) => {
                console.log(`📊 응답 상태: ${res.statusCode}`);
                console.log(`📝 Content-Type: ${res.headers['content-type']}`);
                
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log(`📄 응답 크기: ${data.length}자`);
                    resolve(data);
                });
            }).on('error', (error) => {
                console.log(`❌ 요청 실패: ${error.message}`);
                reject(error);
            });
            
            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error(`요청 타임아웃: ${date}`));
            });
        });
    }

    parseGameResults(html, gameDate) {
        const games = [];
        
        try {
            console.log(`\n🔍 HTML 분석 시작 (${gameDate})`);
            console.log(`📄 HTML 길이: ${html.length}자`);
            
            // 기본적인 HTML 구조 확인
            if (html.length < 1000) {
                console.log(`⚠️ ${gameDate}: HTML이 너무 짧음`);
                return games;
            }
            
            // 다양한 경기 상태 패턴 확인
            const patterns = [
                /경기종료/g,
                /경기중/g,
                /경기예정/g,
                /우천취소/g,
                /연기/g
            ];
            
            console.log('\n📋 경기 상태 확인:');
            patterns.forEach((pattern, index) => {
                const patternNames = ['경기종료', '경기중', '경기예정', '우천취소', '연기'];
                const matches = (html.match(pattern) || []).length;
                console.log(`   ${patternNames[index]}: ${matches}개`);
            });
            
            // 경기종료된 경기만 처리
            const gameFinishedRegex = /경기종료/g;
            const gameFinishedCount = (html.match(gameFinishedRegex) || []).length;
            
            if (gameFinishedCount === 0) {
                console.log(`\n📅 ${gameDate}: 완료된 경기 없음`);
                
                // 디버깅을 위해 HTML 일부 출력
                console.log('\n🔍 HTML 샘플 (첫 500자):');
                console.log(html.substring(0, 500));
                console.log('\n🔍 HTML 샘플 (마지막 500자):');
                console.log(html.substring(Math.max(0, html.length - 500)));
                
                return games;
            }
            
            console.log(`\n🎯 ${gameDate}: ${gameFinishedCount}개 경기종료 발견`);
            
            // 각 경기종료 위치를 찾아서 주변의 팀명과 점수 추출
            let match;
            gameFinishedRegex.lastIndex = 0;
            let gameIndex = 0;
            
            while ((match = gameFinishedRegex.exec(html)) !== null) {
                gameIndex++;
                const finishedIndex = match.index;
                console.log(`\n🔍 경기 ${gameIndex} 분석 중... (위치: ${finishedIndex})`);
                
                const startPos = Math.max(0, finishedIndex - 2000);
                const endPos = Math.min(html.length, finishedIndex + 1000);
                const gameSection = html.substring(startPos, endPos);
                
                console.log(`📄 분석 구간 길이: ${gameSection.length}자`);
                
                // 팀명 추출 시도
                const teamPatterns = [
                    /<strong class='teamT'>([^<]+)<\/strong>/g,
                    /<span[^>]*class="[^"]*teamT[^"]*"[^>]*>([^<]+)<\/span>/g,
                    /<td[^>]*class="[^"]*team[^"]*"[^>]*>([^<]+)<\/td>/g
                ];
                
                let teams = [];
                console.log('🔍 팀명 추출 시도:');
                
                teamPatterns.forEach((pattern, i) => {
                    const matches = [...gameSection.matchAll(pattern)];
                    console.log(`   패턴 ${i+1}: ${matches.length}개 발견`);
                    if (matches.length > 0) {
                        const foundTeams = matches.map(m => m[1].trim());
                        console.log(`     팀명: ${foundTeams.join(', ')}`);
                        if (teams.length === 0 && foundTeams.length >= 2) {
                            teams = foundTeams;
                        }
                    }
                });
                
                // 점수 추출 시도
                const scorePatterns = [
                    /lblAwayTeamScore_\d+">(\d+)<\/span>/g,
                    /lblHomeTeamScore_\d+">(\d+)<\/span>/g,
                    /<span[^>]*score[^>]*>(\d+)<\/span>/g,
                    /<td[^>]*score[^>]*>(\d+)<\/td>/g
                ];
                
                let awayScore = null, homeScore = null;
                console.log('🔍 점수 추출 시도:');
                
                const awayScoreMatch = gameSection.match(/lblAwayTeamScore_\d+">(\d+)<\/span>/);
                const homeScoreMatch = gameSection.match(/lblHomeTeamScore_\d+">(\d+)<\/span>/);
                
                if (awayScoreMatch) {
                    awayScore = parseInt(awayScoreMatch[1]);
                    console.log(`   원정팀 점수: ${awayScore}`);
                }
                if (homeScoreMatch) {
                    homeScore = parseInt(homeScoreMatch[1]);
                    console.log(`   홈팀 점수: ${homeScore}`);
                }
                
                // 결과 확인
                console.log(`📊 경기 ${gameIndex} 결과:`);
                console.log(`   팀명: ${teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : '추출 실패'}`);
                console.log(`   점수: ${awayScore !== null && homeScore !== null ? `${awayScore} - ${homeScore}` : '추출 실패'}`);
                
                // 팀명과 점수가 모두 올바르게 추출된 경우만 처리
                if (teams.length >= 2 && awayScore !== null && homeScore !== null) {
                    const awayTeam = teams[0];
                    const homeTeam = teams[1];
                    
                    console.log(`✅ 유효한 경기 데이터 발견: ${awayTeam} ${awayScore} - ${homeScore} ${homeTeam}`);
                    
                    // 유효한 팀명인지 확인
                    if (Object.keys(TEAM_MAPPING).includes(awayTeam) && 
                        Object.keys(TEAM_MAPPING).includes(homeTeam)) {
                        
                        games.push({
                            date: gameDate,
                            awayTeam,
                            homeTeam,
                            awayScore,
                            homeScore,
                            result: awayScore > homeScore ? 'away_win' : 
                                   homeScore > awayScore ? 'home_win' : 'draw'
                        });
                        console.log(`      ✅ 게임 리스트에 추가됨`);
                    } else {
                        console.log(`      ❌ 유효하지 않은 팀명: ${awayTeam}, ${homeTeam}`);
                    }
                } else {
                    console.log(`      ❌ 데이터 추출 실패`);
                    
                    // 디버깅을 위해 섹션 일부 출력
                    console.log(`🔍 경기섹션 샘플 (첫 300자):`);
                    console.log(gameSection.substring(0, 300));
                }
            }
            
        } catch (error) {
            console.log(`❌ ${gameDate} 파싱 오류: ${error.message}`);
        }
        
        return games;
    }

    async testMultipleDates() {
        const today = new Date();
        const testDates = [];
        
        // 오늘부터 지난 7일간 테스트
        for (let i = 0; i < 7; i++) {
            const testDate = new Date(today);
            testDate.setDate(today.getDate() - i);
            const dateString = testDate.toISOString().split('T')[0].replace(/-/g, '');
            testDates.push({
                date: dateString,
                display: testDate.toLocaleDateString('ko-KR')
            });
        }
        
        console.log(`📅 테스트 날짜: ${testDates.length}일`);
        testDates.forEach(d => console.log(`   ${d.display} (${d.date})`));
        
        let totalGames = 0;
        
        for (const testDate of testDates) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📅 ${testDate.display} (${testDate.date}) 테스트`);
            console.log(`${'='.repeat(60)}`);
            
            try {
                const html = await this.fetchScoreboardData(testDate.date);
                const games = this.parseGameResults(html, testDate.date);
                
                if (games.length > 0) {
                    console.log(`\n🎉 ${games.length}경기 발견:`);
                    games.forEach((game, i) => {
                        console.log(`   ${i+1}. ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam} (${game.result})`);
                    });
                    totalGames += games.length;
                } else {
                    console.log(`\n📭 경기 없음`);
                }
                
                // API 부하 방지
                if (testDate !== testDates[testDates.length - 1]) {
                    console.log('\n⏳ 2초 대기...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                console.log(`❌ ${testDate.display} 테스트 실패: ${error.message}`);
            }
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 테스트 완료: 총 ${totalGames}경기 발견`);
        console.log(`${'='.repeat(60)}`);
    }
}

// 실행
async function main() {
    const tester = new TodayGamesTester();
    
    try {
        await tester.testMultipleDates();
    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = TodayGamesTester;