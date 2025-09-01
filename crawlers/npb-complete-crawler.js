#!/usr/bin/env node
/**
 * NPB 2025 완전한 크롤러
 * 일본어 형식으로 날짜, 홈/원정, 경기 취소, 리그 구분 등 모든 정보 포함
 * KBO 형식과 유사한 구조로 데이터 저장
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class NPBCompleteCrawler {
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

    async init() {
        await fs.mkdir(this.dataDir, { recursive: true });
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
        
        return teamName; // 찾지 못하면 원본 반환
    }

    async crawlDateData(dateStr) {
        console.log(`📅 ${dateStr} NPB 경기 데이터 크롤링...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            // Yahoo Sports NPB 스케줄 페이지
            const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${dateStr}`;
            console.log(`🌐 ${url}`);
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // 페이지에서 경기 데이터 추출 (simple-yahoo-npb-crawler.js 방식 적용)
            const gameData = await page.evaluate(() => {
                const games = [];
                const allElements = [];
                
                // 다양한 선택자로 시도 (성공했던 방식 + 경기장 정보)
                const selectors = [
                    '.bb-scoreBoard',
                    '.game-score', 
                    '.sc-score',
                    '[class*="score"]',
                    '[class*="stadium"]',
                    '[class*="venue"]'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    
                    if (elements.length > 0) {
                        elements.forEach((element) => {
                            const text = element.textContent?.trim();
                            if (text && text.length > 0 && text.length < 200) {
                                allElements.push({
                                    selector: selector,
                                    text: text,
                                    html: element.innerHTML?.substring(0, 200)
                                });
                            }
                        });
                    }
                }
                
                // 경기장 정보도 별도로 수집
                const stadiumInfo = [];
                const stadiumSelectors = [
                    'a[href*="stadium"]',
                    '[class*="place"]',
                    '[class*="location"]'
                ];
                
                stadiumSelectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        const stadium = el.textContent?.trim();
                        if (stadium && stadium.length > 2 && stadium.length < 50) {
                            // 일본 야구장 이름 패턴
                            if (/ドーム|スタジアム|球場|甲子園|神宮|マリン|PayPay/.test(stadium)) {
                                stadiumInfo.push(stadium);
                            }
                        }
                    });
                });
                
                // 패턴 매칭으로 경기 정보 추출
                let teamBuffer = [];
                let scoreBuffer = null;
                let timeBuffer = null;
                let statusBuffer = null;
                let stadiumBuffer = null;
                
                // 경기장 이름 매핑
                const stadiumMapping = {
                    '東京ドーム': '東京ドーム',
                    '甲子園': '甲子園',
                    'バンテリンドーム': 'バンテリンドーム',
                    '神宮': '神宮',
                    '横浜': '横浜',
                    'マツダスタジアム': 'マツダスタジアム', 
                    'ベルーナドーム': 'ベルーナドーム',
                    'エスコンフィールド': 'エスコンF',
                    'エスコンF': 'エスコンF',
                    '楽天モバイル': '楽天モバイル',
                    'みずほPayPayドーム': 'みずほPayPay',
                    'みずほPayPay': 'みずほPayPay',
                    'ZOZOマリン': 'ZOZOマリン',
                    '京セラD大阪': '京セラD大阪',
                    '京セラドーム': '京セラD大阪'
                };
                
                allElements.forEach(element => {
                    const text = element.text;
                    
                    // 팀명 패턴
                    if (/^(巨人|阪神|DeNA|広島|中日|ヤクルト|オリックス|ロッテ|ソフトバンク|日本ハム|楽天|西武)$/.test(text)) {
                        teamBuffer.push(text);
                    }
                    
                    // 점수 패턴 (완료된 경기)
                    else if (/^\d+-\d+$/.test(text)) {
                        if (!scoreBuffer) {
                            scoreBuffer = text;
                        }
                    }
                    
                    // 시간 패턴 (미래 경기) - 17:45, 18:00 등
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
                        
                        // 완료된 경기 (점수 있음)
                        if (scoreBuffer) {
                            const scores = scoreBuffer.split('-');
                            if (scores.length === 2) {
                                gameInfo.awayScore = scores[0];
                                gameInfo.homeScore = scores[1];
                                gameInfo.gameType = 'completed';
                            }
                        }
                        // 예정된 경기 (시간 있음)  
                        else if (timeBuffer) {
                            gameInfo.gameTime = timeBuffer;
                            gameInfo.gameType = 'scheduled';
                            gameInfo.awayScore = '-';
                            gameInfo.homeScore = '-';
                        }
                        
                        // 중복 제거를 위한 체크
                        const gameKey = `${gameInfo.awayTeam}-${gameInfo.homeTeam}`;
                        if (!games.find(g => `${g.awayTeam}-${g.homeTeam}` === gameKey)) {
                            games.push(gameInfo);
                        }
                        
                        // 버퍼 리셋
                        teamBuffer = [];
                        scoreBuffer = null;
                        timeBuffer = null;
                        statusBuffer = null;
                    }
                });
                
                // 남은 팀과 점수/시간이 있는 경우 처리
                if (teamBuffer.length >= 2 && (scoreBuffer || timeBuffer)) {
                    let gameInfo = {
                        awayTeam: teamBuffer[0],
                        homeTeam: teamBuffer[1],
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
                    
                    games.push(gameInfo);
                }
                
                return { 
                    games, 
                    rawElements: allElements.length,
                    debugData: allElements.slice(0, 10) // 디버깅용
                };
            });

            return gameData;

        } catch (error) {
            console.error(`❌ ${dateStr} 크롤링 실패:`, error.message);
            return { games: [], stadiums: [], rawElements: 0 };
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
            
            // 완료된 경기 (점수 있음)
            if (game.gameType === 'completed' && game.awayScore !== '-' && game.homeScore !== '-') {
                formattedGame.awayScore = parseInt(game.awayScore);
                formattedGame.homeScore = parseInt(game.homeScore);
                gameResult = `${awayTeamShort} ${game.awayScore}:${game.homeScore} ${homeTeamShort}(H)`;
            }
            // 예정된 경기 (시간 있음)
            else if (game.gameType === 'scheduled' && game.gameTime) {
                formattedGame.gameTime = game.gameTime;
                formattedGame.awayScore = '-';
                formattedGame.homeScore = '-';
                gameResult = `${awayTeamShort} vs ${homeTeamShort}(H) ${game.gameTime}`;
            }
            // 기타 (취소, 연기 등)
            else {
                formattedGame.awayScore = '-';
                formattedGame.homeScore = '-';
                gameResult = `${awayTeamShort} vs ${homeTeamShort}(H) ${game.status || '未定'}`;
            }
            
            formattedGame.result = gameResult;
            formattedGames.push(formattedGame);
        });
        
        return formattedGames;
    }

    async processDateRange(startDate, endDate) {
        console.log(`🏟️ NPB 2025 ${startDate} ~ ${endDate} 크롤링 시작...`);
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const allGames = [];
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            
            const dayData = await this.crawlDateData(dateStr);
            if (dayData.games.length > 0) {
                const formattedGames = this.formatGameData(dayData.games, dateStr);
                allGames.push({
                    date: dateStr,
                    games: formattedGames,
                    centralGames: formattedGames.filter(g => g.league === 'Central'),
                    pacificGames: formattedGames.filter(g => g.league === 'Pacific')
                });
                
                console.log(`✅ ${dateStr}: ${formattedGames.length}경기 (세리그: ${formattedGames.filter(g => g.league === 'Central').length}, 파리그: ${formattedGames.filter(g => g.league === 'Pacific').length})`);
            } else {
                console.log(`📋 ${dateStr}: 경기 없음`);
            }
            
            // 요청 간격 (Rate limiting) - 전체 시즌 크롤링이므로 더 긴 간격
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        return allGames;
    }

    async loadExistingData() {
        const jsonPath = path.join(this.dataDir, 'npb-2025-season-data.json');
        
        try {
            const existingData = await fs.readFile(jsonPath, 'utf8');
            const parsedData = JSON.parse(existingData);
            console.log(`📖 기존 데이터 로드: ${parsedData.length}일`);
            return parsedData;
        } catch (error) {
            console.log(`📝 새로운 시즌 데이터 파일 생성`);
            return [];
        }
    }

    async mergeData(existingData, newData) {
        const mergedData = [...existingData];
        const existingDates = new Set(existingData.map(day => day.date));
        
        let addedDays = 0;
        let updatedDays = 0;
        
        newData.forEach(newDay => {
            if (existingDates.has(newDay.date)) {
                // 기존 날짜의 경기가 완료된 경우만 업데이트 (예: 경기 중 -> 경기 완료)
                const existingDayIndex = mergedData.findIndex(day => day.date === newDay.date);
                const existingDay = mergedData[existingDayIndex];
                
                // 새로운 완료된 경기가 있는지 확인
                const hasNewCompletedGames = newDay.games.some(game => 
                    game.gameType === 'completed' && 
                    !existingDay.games.some(existingGame => 
                        existingGame.awayTeam === game.awayTeam && 
                        existingGame.homeTeam === game.homeTeam && 
                        existingGame.gameType === 'completed'
                    )
                );
                
                if (hasNewCompletedGames) {
                    mergedData[existingDayIndex] = newDay;
                    updatedDays++;
                    console.log(`🔄 ${newDay.date}: 데이터 업데이트 (${newDay.games.length}경기)`);
                } else {
                    console.log(`⏭️  ${newDay.date}: 기존 데이터 유지`);
                }
            } else {
                // 새로운 날짜 추가
                mergedData.push(newDay);
                existingDates.add(newDay.date);
                addedDays++;
                console.log(`➕ ${newDay.date}: 새 데이터 추가 (${newDay.games.length}경기)`);
            }
        });
        
        // 날짜순으로 정렬
        mergedData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        console.log(`📊 병합 결과: 추가 ${addedDays}일, 업데이트 ${updatedDays}일`);
        return mergedData;
    }

    async saveData(allGames, period = 'season') {
        // 기존 데이터 로드
        const existingData = await this.loadExistingData();
        
        // 새 데이터와 병합
        const mergedData = await this.mergeData(existingData, allGames);
        
        // 고정된 파일명 사용
        const txtPath = path.join(this.dataDir, 'npb-2025-season-data.txt');
        const jsonPath = path.join(this.dataDir, 'npb-2025-season-data.json');
        
        // KBO 형식과 유사한 TXT 파일 생성
        const txtLines = [];
        txtLines.push(`# NPB 2025年 実際の試合結果`);
        txtLines.push(`# 最終更新: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        txtLines.push(`# データソース: Yahoo!スポーツ`);
        txtLines.push(`# 形式: 完了経기 - 原定チーム スコア:スコア ホームチーム(H)`);
        txtLines.push(`#       予定経기 - 原定チーム vs ホームチーム(H) 時間`);
        txtLines.push(`#       경기장 - ホームチーム(H) @경기장`);
        txtLines.push('');
        
        mergedData.forEach(dayData => {
            if (dayData.games.length > 0) {
                txtLines.push(dayData.date);
                
                // 세리그 경기
                if (dayData.centralGames && dayData.centralGames.length > 0) {
                    txtLines.push('# セントラルリーグ');
                    dayData.centralGames.forEach(game => {
                        txtLines.push(game.result);
                    });
                }
                
                // 파리그 경기
                if (dayData.pacificGames && dayData.pacificGames.length > 0) {
                    txtLines.push('# パシフィックリーグ');
                    dayData.pacificGames.forEach(game => {
                        txtLines.push(game.result);
                    });
                }
                
                txtLines.push('');
            }
        });
        
        // 병합된 데이터 저장
        await fs.writeFile(txtPath, txtLines.join('\n'), 'utf8');
        await fs.writeFile(jsonPath, JSON.stringify(mergedData, null, 2), 'utf8');
        
        // 통계 계산
        const totalGames = mergedData.reduce((sum, day) => sum + day.games.length, 0);
        const totalCentral = mergedData.reduce((sum, day) => sum + (day.centralGames?.length || 0), 0);
        const totalPacific = mergedData.reduce((sum, day) => sum + (day.pacificGames?.length || 0), 0);
        
        console.log(`\n✅ NPB 2025 데이터 저장 완료:`);
        console.log(`   TXT: ${txtPath}`);
        console.log(`   JSON: ${jsonPath}`);
        console.log(`   총 ${mergedData.length}일, ${totalGames}경기`);
        console.log(`   세리그: ${totalCentral}경기, 파리그: ${totalPacific}경기`);
        
        return { txtPath, jsonPath, totalGames, totalCentral, totalPacific };
    }

    async run() {
        try {
            await this.init();
            
            // NPB 2025 시즌 전체 크롤링 (개막일 ~ 시즌 종료일)
            const startDateStr = '2025-03-28'; // NPB 2025 개막일
            const endDateStr = '2025-10-31';   // NPB 2025 시즌 종료 예상일 (포스트시즌 포함)
            
            console.log(`🏟️ NPB 2025 전체 시즌 크롤링: ${startDateStr} ~ ${endDateStr}`);
            
            const allGames = await this.processDateRange(startDateStr, endDateStr);
            
            if (allGames.length > 0) {
                await this.saveData(allGames, 'season');
                console.log(`\n🎉 NPB 2025 크롤링 완료!`);
                return true;
            } else {
                console.log(`\n❌ 크롤링된 데이터가 없습니다.`);
                return false;
            }
            
        } catch (error) {
            console.error('💥 크롤링 에러:', error.message);
            return false;
        }
    }
}

async function main() {
    const crawler = new NPBCompleteCrawler();
    const success = await crawler.run();
    
    if (success) {
        console.log('\n🏆 NPB 완전한 크롤링 성공!');
    } else {
        console.log('\n❌ NPB 크롤링 실패');
    }
}

main();