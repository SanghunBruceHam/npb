#!/usr/bin/env node
/**
 * NPB 2025 누락된 날짜들 재수집 크롤러
 * 기존 데이터에서 누락된 날짜들만 대상으로 크롤링
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// 누락된 날짜들 (61개)
const MISSING_DATES = [
    '2025-03-31', '2025-04-07', '2025-04-14', '2025-04-21', '2025-04-24', '2025-04-28',
    '2025-05-08', '2025-05-10', '2025-05-12', '2025-05-19', '2025-05-26',
    '2025-06-02', '2025-06-09', '2025-06-16', '2025-06-19', '2025-06-23', '2025-06-25', '2025-06-26', '2025-06-30',
    '2025-07-01', '2025-07-02', '2025-07-03', '2025-07-07', '2025-07-22', '2025-07-23', '2025-07-24', '2025-07-25', '2025-07-28',
    '2025-08-04', '2025-08-18', '2025-08-20', '2025-08-21', '2025-08-25',
    '2025-09-01', '2025-09-08',
    '2025-10-06', '2025-10-07', '2025-10-08', '2025-10-09', '2025-10-10', '2025-10-11', '2025-10-12', '2025-10-13',
    '2025-10-14', '2025-10-15', '2025-10-16', '2025-10-17', '2025-10-18', '2025-10-19', '2025-10-20', '2025-10-21',
    '2025-10-22', '2025-10-23', '2025-10-24', '2025-10-25', '2025-10-26', '2025-10-27', '2025-10-28', '2025-10-29',
    '2025-10-30', '2025-10-31'
];

class NPBMissingDatesCrawler {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        
        // NPB 팀 정보 (일본어 형식)
        this.teams = {
            // セントラルリーグ (Central League)
            central: {
                '読売ジャイアンツ': { short: '巨人', stadium: '東京ドーム' },
                '巨人': { short: '巨人', stadium: '東京ドーム' },
                '阪神タイガース': { short: '阪神', stadium: '甲子園' },
                '阪神': { short: '阪神', stadium: '甲子園' },
                '横浜DeNAベイスターズ': { short: 'DeNA', stadium: '横浜' },
                'DeNA': { short: 'DeNA', stadium: '横浜' },
                '広島東洋カープ': { short: '広島', stadium: 'マツダスタジアム' },
                '広島': { short: '広島', stadium: 'マツダスタジアム' },
                '中日ドラゴンズ': { short: '中日', stadium: 'バンテリンドーム' },
                '中日': { short: '中日', stadium: 'バンテリンドーム' },
                'ヤクルトスワローズ': { short: 'ヤクルト', stadium: '神宮' },
                'ヤクルト': { short: 'ヤクルト', stadium: '神宮' }
            },
            // パシフィックリーグ (Pacific League)
            pacific: {
                'オリックス・バファローズ': { short: 'オリックス', stadium: '京セラD大阪' },
                'オリックス': { short: 'オリックス', stadium: '京セラD大阪' },
                '千葉ロッテマリーンズ': { short: 'ロッテ', stadium: 'ZOZOマリン' },
                'ロッテ': { short: 'ロッテ', stadium: 'ZOZOマリン' },
                '福岡ソフトバンクホークス': { short: 'ソフトバンク', stadium: 'みずほPayPay' },
                'ソフトバンク': { short: 'ソフトバンク', stadium: 'みずほPayPay' },
                '北海道日本ハムファイターズ': { short: '日本ハム', stadium: 'エスコンフィールド' },
                '日本ハム': { short: '日本ハム', stadium: 'エスコンフィールド' },
                '東北楽天ゴールデンイーグルス': { short: '楽天', stadium: '楽天モバイル' },
                '楽天': { short: '楽天', stadium: '楽天モバイル' },
                '埼玉西武ライオンズ': { short: '西武', stadium: 'ベルーナドーム' },
                '西武': { short: '西武', stadium: 'ベルーナドーム' }
            }
        };
    }

    getTeamLeague(teamName) {
        // 센트럴리그 확인
        for (const team of Object.keys(this.teams.central)) {
            if (teamName.includes(team) || team.includes(teamName)) {
                return 'Central';
            }
        }
        
        // 파시픽리그 확인
        for (const team of Object.keys(this.teams.pacific)) {
            if (teamName.includes(team) || team.includes(teamName)) {
                return 'Pacific';
            }
        }
        
        return 'Unknown';
    }

    getTeamShort(teamName) {
        // 센트럴리그에서 찾기
        for (const [fullName, info] of Object.entries(this.teams.central)) {
            if (teamName.includes(fullName) || fullName.includes(teamName)) {
                return info.short;
            }
        }
        
        // 파시픽리그에서 찾기
        for (const [fullName, info] of Object.entries(this.teams.pacific)) {
            if (teamName.includes(fullName) || fullName.includes(teamName)) {
                return info.short;
            }
        }
        
        return teamName;
    }

    async crawlDateData(dateStr) {
        console.log(`🔄 ${dateStr} 재수집 중...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${dateStr}`;
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 20000  // 타임아웃을 줄여서 빠르게 처리
            });

            await new Promise(resolve => setTimeout(resolve, 2000));

            // 경기 데이터 추출
            const gameData = await page.evaluate(() => {
                const games = [];
                const allElements = [];
                
                const selectors = [
                    '.bb-scoreBoard',
                    '.game-score', 
                    '.sc-score',
                    '[class*="score"]'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    
                    if (elements.length > 0) {
                        elements.forEach((element) => {
                            const text = element.textContent?.trim();
                            if (text && text.length > 0 && text.length < 200) {
                                allElements.push({
                                    selector: selector,
                                    text: text
                                });
                            }
                        });
                    }
                }
                
                // 패턴 매칭으로 경기 정보 추출
                let teamBuffer = [];
                let scoreBuffer = null;
                let timeBuffer = null;
                let statusBuffer = null;
                
                allElements.forEach(element => {
                    const text = element.text;
                    
                    // 팀명 패턴
                    if (/^(巨人|阪神|DeNA|広島|中日|ヤクルト|オリックス|ロッテ|ソフトバンク|日本ハム|楽天|西武)$/.test(text)) {
                        teamBuffer.push(text);
                    }
                    // 점수 패턴 
                    else if (/^\d+-\d+$/.test(text)) {
                        if (!scoreBuffer) {
                            scoreBuffer = text;
                        }
                    }
                    // 시간 패턴
                    else if (/^\d{1,2}:\d{2}$/.test(text)) {
                        if (!timeBuffer) {
                            timeBuffer = text;
                        }
                    }
                    // 경기 상태 패턴
                    else if (/(試合終了|試合中|中止|延期|開始前|試合前|予告先発)/.test(text)) {
                        statusBuffer = text;
                    }
                    
                    // 경기 완료시 저장
                    if (teamBuffer.length >= 2 && (scoreBuffer || timeBuffer)) {
                        let gameInfo = {
                            awayTeam: teamBuffer[teamBuffer.length - 2] || teamBuffer[0],
                            homeTeam: teamBuffer[teamBuffer.length - 1] || teamBuffer[1],
                            status: statusBuffer || (scoreBuffer ? '試合終了' : '開始前')
                        };
                        
                        if (scoreBuffer) {
                            const scores = scoreBuffer.split('-');
                            if (scores.length === 2) {
                                gameInfo.awayScore = scores[0];
                                gameInfo.homeScore = scores[1];
                                gameInfo.gameType = 'completed';
                            }
                        } else if (timeBuffer) {
                            gameInfo.gameTime = timeBuffer;
                            gameInfo.gameType = 'scheduled';
                            gameInfo.awayScore = '-';
                            gameInfo.homeScore = '-';
                        }
                        
                        const gameKey = `${gameInfo.awayTeam}-${gameInfo.homeTeam}`;
                        if (!games.find(g => `${g.awayTeam}-${g.homeTeam}` === gameKey)) {
                            games.push(gameInfo);
                        }
                        
                        teamBuffer = [];
                        scoreBuffer = null;
                        timeBuffer = null;
                        statusBuffer = null;
                    }
                });
                
                return { games };
            });

            return gameData;

        } catch (error) {
            console.error(`❌ ${dateStr} 재수집 실패:`, error.message);
            return { games: [] };
        } finally {
            await browser.close();
        }
    }

    formatGameData(games, date) {
        const formattedGames = [];
        
        games.forEach(game => {
            const awayTeamShort = this.getTeamShort(game.awayTeam);
            const homeTeamShort = this.getTeamShort(game.homeTeam);
            const league = this.getTeamLeague(game.homeTeam);
            
            let gameResult;
            let formattedGame = {
                date: date,
                awayTeam: awayTeamShort,
                homeTeam: homeTeamShort,
                status: game.status || '試合終了',
                league: league,
                gameType: game.gameType || 'completed'
            };
            
            if (game.gameType === 'completed' && game.awayScore !== '-' && game.homeScore !== '-') {
                formattedGame.awayScore = parseInt(game.awayScore);
                formattedGame.homeScore = parseInt(game.homeScore);
                gameResult = `${awayTeamShort} ${game.awayScore}:${game.homeScore} ${homeTeamShort}(H)`;
            } else if (game.gameType === 'scheduled' && game.gameTime) {
                formattedGame.gameTime = game.gameTime;
                formattedGame.awayScore = '-';
                formattedGame.homeScore = '-';
                gameResult = `${awayTeamShort} vs ${homeTeamShort}(H) ${game.gameTime}`;
            } else {
                formattedGame.awayScore = '-';
                formattedGame.homeScore = '-';
                gameResult = `${awayTeamShort} vs ${homeTeamShort}(H) ${game.status || '未定'}`;
            }
            
            formattedGame.result = gameResult;
            formattedGames.push(formattedGame);
        });
        
        return formattedGames;
    }

    async run() {
        console.log(`🏟️ NPB 2025 누락된 날짜들 재수집 시작 (${MISSING_DATES.length}개 날짜)`);
        
        const foundGames = [];
        let processedCount = 0;
        let gamesFound = 0;
        
        for (const dateStr of MISSING_DATES) {
            const dayData = await this.crawlDateData(dateStr);
            processedCount++;
            
            if (dayData.games.length > 0) {
                const formattedGames = this.formatGameData(dayData.games, dateStr);
                foundGames.push({
                    date: dateStr,
                    games: formattedGames,
                    centralGames: formattedGames.filter(g => g.league === 'Central'),
                    pacificGames: formattedGames.filter(g => g.league === 'Pacific')
                });
                
                gamesFound += formattedGames.length;
                console.log(`✅ ${dateStr}: ${formattedGames.length}경기 발견! (세리그: ${formattedGames.filter(g => g.league === 'Central').length}, 파리그: ${formattedGames.filter(g => g.league === 'Pacific').length})`);
            } else {
                console.log(`📋 ${dateStr}: 경기 없음 (${processedCount}/${MISSING_DATES.length})`);
            }
            
            // 요청 간격
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        console.log(`\n🎯 재수집 완료:`);
        console.log(`   처리한 날짜: ${processedCount}개`);
        console.log(`   경기 발견: ${gamesFound}경기 (${foundGames.length}일)`);
        
        if (foundGames.length > 0) {
            // JSON으로 저장
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const jsonPath = path.join(this.dataDir, `npb-2025-missing-games-${timestamp}.json`);
            await fs.writeFile(jsonPath, JSON.stringify(foundGames, null, 2), 'utf8');
            
            console.log(`💾 발견된 경기들 저장: ${jsonPath}`);
            
            foundGames.forEach(dayData => {
                console.log(`📅 ${dayData.date}: ${dayData.games.length}경기`);
                dayData.games.forEach(game => {
                    console.log(`   ${game.result}`);
                });
            });
        }
        
        return foundGames;
    }
}

async function main() {
    const crawler = new NPBMissingDatesCrawler();
    const foundGames = await crawler.run();
    
    if (foundGames.length > 0) {
        console.log(`\n🎉 ${foundGames.length}일에서 경기 발견!`);
        console.log('이제 메인 크롤러를 다시 실행해서 데이터를 병합해주세요.');
    } else {
        console.log(`\n📝 누락된 날짜들은 모두 휴식일입니다.`);
    }
}

main();