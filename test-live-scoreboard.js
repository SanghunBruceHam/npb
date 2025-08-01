#!/usr/bin/env node

/**
 * 실시간 KBO 스코어보드 스크래핑 테스트
 * 실제 HTML 구조 기반으로 업데이트
 */

const https = require('https');

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

class LiveScoreboardTester {
    constructor() {
        console.log('🔴 실시간 KBO 스코어보드 테스트 시작...\n');
    }

    async fetchScoreboardPage(date) {
        return new Promise((resolve, reject) => {
            // 날짜 파라미터가 있으면 사용, 없으면 오늘 날짜
            const targetDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
            const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?GameDate=${targetDate}`;
            console.log(`📡 요청 URL: ${url}`);
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive',
                    'Referer': 'https://www.koreabaseball.com/'
                }
            };
            
            const req = https.get(url, options, (res) => {
                console.log(`📊 응답 상태: ${res.statusCode}`);
                
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
                reject(new Error(`요청 타임아웃`));
            });
        });
    }

    parseScoreboardGames(html) {
        const games = [];
        
        try {
            console.log(`\n🔍 스코어보드 분석 시작`);
            console.log(`📄 HTML 길이: ${html.length}자`);
            
            // 게임 상태 패턴들
            const gameStates = ['경기전', '경기중', '경기종료', '우천취소', '연기'];
            
            console.log('\n📋 게임 상태 확인:');
            gameStates.forEach(state => {
                const count = (html.match(new RegExp(state, 'g')) || []).length;
                console.log(`   ${state}: ${count}개`);
            });

            // 각 게임을 개별적으로 파싱
            let gameIndex = 0;
            
            // smsScore 클래스 영역들을 찾기
            const smsScoreRegex = /<div class=['"]smsScore['"]>([\s\S]*?)<\/div>\s*<\/div>/g;
            let match;
            
            while ((match = smsScoreRegex.exec(html)) !== null) {
                const gameSection = match[1];
                gameIndex++;
                
                console.log(`\n🎯 게임 ${gameIndex} 분석:`);
                
                // 팀명 추출
                const teamMatches = [...gameSection.matchAll(/<strong class=['"]teamT['"]>([^<]+)<\/strong>/g)];
                const teams = teamMatches.map(m => m[1].trim());
                
                console.log(`   팀명: ${teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : '추출 실패'}`);
                
                // 게임 상태 추출
                const stateMatch = gameSection.match(/<span[^>]*lblGameState[^>]*>([^<]+)<\/span>/);
                const gameState = stateMatch ? stateMatch[1].trim() : null;
                
                console.log(`   상태: ${gameState || '추출 실패'}`);
                
                // 점수 추출
                const awayScoreMatch = gameSection.match(/<span[^>]*lblAwayTeamScore[^>]*>([^<]*)<\/span>/);
                const homeScoreMatch = gameSection.match(/<span[^>]*lblHomeTeamScore[^>]*>([^<]*)<\/span>/);
                
                const awayScore = awayScoreMatch ? awayScoreMatch[1].trim() : '';
                const homeScore = homeScoreMatch ? homeScoreMatch[1].trim() : '';
                
                console.log(`   점수: ${awayScore || '-'} - ${homeScore || '-'}`);
                
                // 경기장과 시간 추출
                const placeMatch = gameSection.match(/<p class=['"]place['"]>([^<]+)<span>([^<]+)<\/span>/);
                const stadium = placeMatch ? placeMatch[1].trim() : '';
                const gameTime = placeMatch ? placeMatch[2].trim() : '';
                
                console.log(`   장소: ${stadium} ${gameTime}`);
                
                // 유효한 게임 데이터인지 확인
                if (teams.length >= 2 && gameState) {
                    const awayTeam = teams[0];
                    const homeTeam = teams[1];
                    
                    // 팀명이 유효한지 확인
                    if (Object.keys(TEAM_MAPPING).includes(awayTeam) && 
                        Object.keys(TEAM_MAPPING).includes(homeTeam)) {
                        
                        const game = {
                            gameIndex,
                            date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                            awayTeam,
                            homeTeam,
                            gameState,
                            stadium,
                            gameTime,
                            awayScore: awayScore || null,
                            homeScore: homeScore || null,
                            isFinished: gameState === '경기종료',
                            result: null
                        };
                        
                        // 경기 종료된 경우 결과 계산
                        if (game.isFinished && game.awayScore !== null && game.homeScore !== null) {
                            const away = parseInt(game.awayScore) || 0;
                            const home = parseInt(game.homeScore) || 0;
                            
                            if (away > home) {
                                game.result = 'away_win';
                            } else if (home > away) {
                                game.result = 'home_win';
                            } else {
                                game.result = 'draw';
                            }
                        }
                        
                        games.push(game);
                        console.log(`      ✅ 게임 데이터 추가됨`);
                    } else {
                        console.log(`      ❌ 유효하지 않은 팀명: ${awayTeam}, ${homeTeam}`);
                    }
                } else {
                    console.log(`      ❌ 데이터 추출 실패`);
                }
            }
            
            if (games.length === 0) {
                console.log('\n⚠️ smsScore 패턴으로 찾지 못함, 대안 패턴 시도...');
                
                // 대안: teamT 패턴으로 직접 찾기
                const teamTMatches = [...html.matchAll(/<strong class=['"]teamT['"]>([^<]+)<\/strong>/g)];
                console.log(`   teamT 패턴: ${teamTMatches.length}개 발견`);
                
                for (let i = 0; i < teamTMatches.length; i += 2) {
                    if (i + 1 < teamTMatches.length) {
                        const awayTeam = teamTMatches[i][1].trim();
                        const homeTeam = teamTMatches[i + 1][1].trim();
                        
                        console.log(`   대안 게임 ${(i/2) + 1}: ${awayTeam} vs ${homeTeam}`);
                        
                        if (Object.keys(TEAM_MAPPING).includes(awayTeam) && 
                            Object.keys(TEAM_MAPPING).includes(homeTeam)) {
                            
                            games.push({
                                gameIndex: (i / 2) + 1,
                                date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                                awayTeam,
                                homeTeam,
                                gameState: '상태미확인',
                                stadium: '미확인',
                                gameTime: '미확인',
                                awayScore: null,
                                homeScore: null,
                                isFinished: false,
                                result: null
                            });
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log(`❌ 파싱 오류: ${error.message}`);
        }
        
        return games;
    }

    async testLiveScoreboard(testDate = null) {
        const dateStr = testDate || new Date().toISOString().split('T')[0].replace(/-/g, '');
        console.log(`📅 ${testDate ? `지정 날짜(${testDate})` : '오늘 날짜'}로 스코어보드 테스트`);
        
        try {
            const html = await this.fetchScoreboardPage(testDate);
            const games = this.parseScoreboardGames(html);
            
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🎉 총 ${games.length}개 게임 발견:`);
            console.log(`${'='.repeat(60)}`);
            
            if (games.length > 0) {
                games.forEach((game, i) => {
                    console.log(`\n게임 ${i + 1}:`);
                    console.log(`   ${game.awayTeam} vs ${game.homeTeam}`);
                    console.log(`   상태: ${game.gameState}`);
                    console.log(`   장소: ${game.stadium} ${game.gameTime}`);
                    
                    if (game.isFinished && game.result) {
                        console.log(`   결과: ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam} (${game.result})`);
                    } else if (game.awayScore !== null && game.homeScore !== null) {
                        console.log(`   현재: ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam}`);
                    }
                });
                
                // 완료된 게임만 필터링
                const finishedGames = games.filter(game => game.isFinished && game.result);
                
                if (finishedGames.length > 0) {
                    console.log(`\n🏆 완료된 게임 ${finishedGames.length}개:`);
                    finishedGames.forEach(game => {
                        console.log(`   ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam} (${game.result})`);
                    });
                } else {
                    console.log(`\n⏳ 아직 완료된 게임이 없습니다. (경기 시작 전이거나 진행 중)`);
                }
            } else {
                console.log(`\n📭 오늘 게임이 없거나 파싱에 실패했습니다.`);
            }
            
        } catch (error) {
            console.log(`❌ 테스트 실패: ${error.message}`);
        }
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🎯 실시간 스코어보드 테스트 완료!`);
        console.log(`${'='.repeat(60)}`);
    }
}

// 실행
async function main() {
    const tester = new LiveScoreboardTester();
    
    // 명령행에서 날짜 파라미터 받기 (예: node test-live-scoreboard.js 20250731)
    const testDate = process.argv[2];
    
    try {
        await tester.testLiveScoreboard(testDate);
    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = LiveScoreboardTester;