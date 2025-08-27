#!/usr/bin/env node
/**
 * NPB 2025 실제 데이터 추출기
 * Yahoo Sports에서 크롤링한 데이터를 NPB 형식으로 정리
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class NPBRealDataExtractor {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
    }

    async extractGameData(dateStr) {
        console.log(`📊 ${dateStr} NPB 경기 데이터 추출...`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });

            const url = `https://baseball.yahoo.co.jp/npb/schedule/?date=${dateStr}`;
            console.log(`🌐 ${url}`);
            
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            await new Promise(resolve => setTimeout(resolve, 3000));

            // 구조화된 경기 데이터 추출
            const gameData = await page.evaluate(() => {
                const games = [];
                
                // 경기 컨테이너 찾기
                const gameContainers = document.querySelectorAll('.bb-score');
                
                gameContainers.forEach(container => {
                    try {
                        // 팀명 추출
                        const teams = container.querySelectorAll('.bb-score__team');
                        if (teams.length >= 2) {
                            const awayTeam = teams[0].textContent.trim();
                            const homeTeam = teams[1].textContent.trim();
                            
                            // 점수 추출
                            const scores = container.querySelectorAll('.bb-score__score');
                            if (scores.length >= 2) {
                                const awayScore = scores[0].textContent.trim();
                                const homeScore = scores[1].textContent.trim();
                                
                                // 경기 상태 확인
                                const statusEl = container.querySelector('.bb-score__status');
                                const status = statusEl ? statusEl.textContent.trim() : '';
                                
                                games.push({
                                    awayTeam,
                                    homeTeam,
                                    awayScore,
                                    homeScore,
                                    status,
                                    result: `${awayTeam} ${awayScore}:${homeScore} ${homeTeam}(H)`
                                });
                            }
                        }
                    } catch (error) {
                        console.log('경기 데이터 추출 오류:', error);
                    }
                });

                // 대안 방법: 텍스트 패턴으로 추출
                if (games.length === 0) {
                    const pageText = document.body.innerText;
                    const lines = pageText.split('\n');
                    
                    let currentTeams = [];
                    let currentScore = null;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        
                        // 팀명 패턴 확인
                        if (/(広島|阪神|巨人|ヤクルト|DeNA|中日|西武|日本ハム|オリックス|楽天|ソフトバンク|ロッテ)/.test(line)) {
                            currentTeams.push(line);
                            
                            // 두 팀이 모이면 다음 줄에서 점수 찾기
                            if (currentTeams.length === 2) {
                                for (let j = i + 1; j <= i + 5 && j < lines.length; j++) {
                                    const scoreLine = lines[j].trim();
                                    if (/^\d+-\d+$/.test(scoreLine)) {
                                        const [awayScore, homeScore] = scoreLine.split('-');
                                        games.push({
                                            awayTeam: currentTeams[0],
                                            homeTeam: currentTeams[1],
                                            awayScore,
                                            homeScore,
                                            status: '試合終了',
                                            result: `${currentTeams[0]} ${awayScore}:${homeScore} ${currentTeams[1]}(H)`
                                        });
                                        break;
                                    }
                                }
                                currentTeams = [];
                            }
                        }
                    }
                }

                return games;
            });

            return gameData;

        } catch (error) {
            console.error(`❌ 데이터 추출 실패: ${error.message}`);
            return [];
        } finally {
            await browser.close();
        }
    }

    async processOpeningWeek() {
        console.log('🏟️ NPB 2025 개막주 데이터 수집...');
        
        const dates = [
            '2025-03-28',  // 개막일
            '2025-03-29',
            '2025-03-30',
            '2025-03-31',
            '2025-04-01',
            '2025-04-02',
            '2025-04-03'
        ];

        const allGameData = [];

        for (const date of dates) {
            console.log(`\n📅 ${date} 처리 중...`);
            const gameData = await this.extractGameData(date);
            
            if (gameData.length > 0) {
                allGameData.push({
                    date,
                    games: gameData
                });
                console.log(`✅ ${date}: ${gameData.length}경기 추출됨`);
                
                gameData.forEach(game => {
                    console.log(`   ${game.result}`);
                });
            } else {
                console.log(`📋 ${date}: 경기 없음`);
            }

            // 요청 간격 조정
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return allGameData;
    }

    async saveNPBData(allGameData) {
        // NPB 형식으로 TXT 파일 생성
        const txtLines = [];
        txtLines.push('# NPB 2025年 実際の試合結果');
        txtLines.push(`# 取得日時: ${new Date().toLocaleString('ja-JP')}`);
        txtLines.push('# データソース: Yahoo!スポーツ');
        txtLines.push('');

        allGameData.forEach(dayData => {
            txtLines.push(dayData.date);
            dayData.games.forEach(game => {
                txtLines.push(game.result);
            });
            txtLines.push('');
        });

        const txtPath = path.join(this.dataDir, 'npb-2025-opening-week.txt');
        await fs.writeFile(txtPath, txtLines.join('\n'), 'utf8');

        // JSON으로도 저장
        const jsonPath = path.join(this.dataDir, 'npb-2025-opening-week.json');
        await fs.writeFile(jsonPath, JSON.stringify(allGameData, null, 2), 'utf8');

        console.log(`\n✅ NPB 2025 데이터 저장:`);
        console.log(`   TXT: ${txtPath}`);
        console.log(`   JSON: ${jsonPath}`);

        return { txtPath, jsonPath };
    }

    async run() {
        const allGameData = await this.processOpeningWeek();
        
        if (allGameData.length > 0) {
            await this.saveNPBData(allGameData);
            
            const totalGames = allGameData.reduce((sum, day) => sum + day.games.length, 0);
            console.log(`\n🎉 NPB 2025 개막주 데이터 수집 완료!`);
            console.log(`   총 ${allGameData.length}일, ${totalGames}경기`);
            
            return true;
        } else {
            console.log('\n❌ 데이터 수집 실패');
            return false;
        }
    }
}

async function main() {
    try {
        await fs.mkdir(path.join(__dirname, '..', 'data'), { recursive: true });
        
        const extractor = new NPBRealDataExtractor();
        const success = await extractor.run();
        
        if (success) {
            console.log('\n🏆 NPB 2025 실제 데이터 추출 완료!');
        } else {
            console.log('\n💥 데이터 추출 실패');
        }
        
    } catch (error) {
        console.error('💥 에러:', error.message);
    }
}

main();