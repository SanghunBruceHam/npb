
#!/usr/bin/env node

/**
 * KBO 팀 순위 데이터 스크래핑 스크립트
 * https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class KBODataScraper {
    constructor() {
        this.client = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        this.teamData = [];
        this.rankings = {};
        this.magicNumbers = {};
    }

    async fetchTeamRankings() {
        try {
            console.log('📊 KBO 팀 순위 데이터 가져오는 중...');
            
            const url = 'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';
            const response = await this.client.get(url);
            
            console.log('✅ 데이터 응답 받음');
            return response.data;
            
        } catch (error) {
            console.error('❌ 데이터 가져오기 실패:', error.message);
            throw error;
        }
    }

    parseTeamData(html) {
        const $ = cheerio.load(html);
        const teams = [];
        
        console.log('🔍 팀 순위 데이터 파싱 중...');
        
        // KBO 순위표 테이블 찾기
        $('.tData tbody tr, .tbl_type01 tbody tr, table tbody tr').each((index, row) => {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length >= 10) { // 순위표 행인지 확인
                const rank = cells.eq(0).text().trim();
                const teamName = cells.eq(1).text().trim();
                const games = cells.eq(2).text().trim();
                const wins = cells.eq(3).text().trim();
                const losses = cells.eq(4).text().trim();
                const draws = cells.eq(5).text().trim();
                const winRate = cells.eq(6).text().trim();
                const gamesBehind = cells.eq(7).text().trim();
                
                // 유효한 팀 데이터인지 확인
                if (rank && teamName && !isNaN(parseInt(rank))) {
                    const team = {
                        rank: parseInt(rank),
                        team: teamName,
                        games: parseInt(games) || 0,
                        wins: parseInt(wins) || 0,
                        losses: parseInt(losses) || 0,
                        draws: parseInt(draws) || 0,
                        winRate: parseFloat(winRate) || 0,
                        gamesBehind: gamesBehind === '-' ? 0 : parseFloat(gamesBehind) || 0
                    };
                    
                    teams.push(team);
                    console.log(`  📍 ${team.rank}위: ${team.team} (${team.wins}승 ${team.losses}패, 승률 ${team.winRate})`);
                }
            }
        });
        
        if (teams.length === 0) {
            // 다른 테이블 구조 시도
            $('table tr').each((index, row) => {
                const $row = $(row);
                const text = $row.text();
                
                // 팀명이 포함된 행 찾기
                const teamNames = ['한화', 'LG', '롯데', 'KT', 'KIA', '삼성', 'SSG', 'NC', '두산', '키움'];
                teamNames.forEach(teamName => {
                    if (text.includes(teamName) && !teams.find(t => t.team === teamName)) {
                        const cells = $row.find('td, th');
                        if (cells.length >= 6) {
                            // 간단한 파싱
                            teams.push({
                                rank: teams.length + 1,
                                team: teamName,
                                games: 0,
                                wins: 0,
                                losses: 0,
                                draws: 0,
                                winRate: 0,
                                gamesBehind: 0
                            });
                        }
                    }
                });
            });
        }
        
        return teams.sort((a, b) => a.rank - b.rank);
    }

    calculateMagicNumbers(teams) {
        console.log('🔮 매직넘버 계산 중...');
        
        if (teams.length === 0) {
            console.log('⚠️ 팀 데이터가 없어 매직넘버 계산 불가');
            return {};
        }
        
        const magicNumbers = {};
        const totalGames = 144; // KBO 정규시즌 총 경기 수
        const playoffSpots = 5; // 플레이오프 진출 팀 수
        
        teams.forEach((team, index) => {
            const remainingGames = totalGames - team.games;
            const maxPossibleWins = team.wins + remainingGames;
            
            // 플레이오프 진출 매직넘버
            let playoffMagic = 0;
            if (index < playoffSpots) {
                // 현재 플레이오프 권 내
                const sixthPlace = teams[playoffSpots] || teams[teams.length - 1];
                const sixthMaxWins = sixthPlace.wins + (totalGames - sixthPlace.games);
                playoffMagic = Math.max(0, sixthMaxWins - team.wins + 1);
            } else {
                // 플레이오프 권 밖
                const fifthPlace = teams[playoffSpots - 1];
                playoffMagic = Math.max(0, fifthPlace.wins - maxPossibleWins + 1);
                if (playoffMagic === 0) playoffMagic = remainingGames + 1;
            }
            
            // 우승 매직넘버
            let championshipMagic = 0;
            if (index === 0) {
                const secondPlace = teams[1];
                const secondMaxWins = secondPlace.wins + (totalGames - secondPlace.games);
                championshipMagic = Math.max(0, secondMaxWins - team.wins + 1);
            } else {
                const firstPlace = teams[0];
                championshipMagic = Math.max(0, firstPlace.wins - maxPossibleWins + 1);
                if (championshipMagic === 0) championshipMagic = remainingGames + 1;
            }
            
            magicNumbers[team.team] = {
                playoff: playoffMagic,
                championship: championshipMagic,
                elimination: remainingGames === 0 ? 0 : Math.max(0, remainingGames)
            };
            
            console.log(`  🎯 ${team.team}: 플레이오프 ${playoffMagic}, 우승 ${championshipMagic}`);
        });
        
        return magicNumbers;
    }

    async saveData(teams, magicNumbers) {
        console.log('💾 데이터 저장 중...');
        
        const timestamp = new Date().toISOString();
        const data = {
            lastUpdated: timestamp,
            updateDate: new Date().toLocaleDateString('ko-KR'),
            rankings: teams,
            magicNumbers: magicNumbers,
            totalTeams: teams.length
        };
        
        // JSON 파일로 저장
        const jsonPath = './kbo-rankings.json';
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        
        // JavaScript 파일로 저장
        const jsContent = `// KBO 2025 시즌 순위 및 매직넘버 데이터
// 마지막 업데이트: ${timestamp}

const kboRankings = ${JSON.stringify(teams, null, 2)};

const magicNumbers = ${JSON.stringify(magicNumbers, null, 2)};

const lastUpdated = "${timestamp}";

// 팀 순위 조회 함수
function getTeamRank(teamName) {
    return kboRankings.find(team => team.team === teamName)?.rank || null;
}

// 매직넘버 조회 함수
function getMagicNumber(teamName, type = 'playoff') {
    return magicNumbers[teamName]?.[type] || null;
}

// 순위표 출력 함수
function printRankings() {
    console.log('📊 KBO 2025 시즌 순위:');
    kboRankings.forEach(team => {
        console.log(\`\${team.rank}위: \${team.team} (\${team.wins}승 \${team.losses}패, 승률 \${team.winRate})\`);
    });
}

console.log('📊 KBO 순위 데이터 로드 완료 (' + kboRankings.length + '팀)');
`;
        
        const jsPath = './kbo-rankings.js';
        fs.writeFileSync(jsPath, jsContent);
        
        // Magic number 폴더에도 복사
        const magicNumberDir = './magic-number';
        if (fs.existsSync(magicNumberDir)) {
            fs.writeFileSync(path.join(magicNumberDir, 'kbo-rankings.json'), JSON.stringify(data, null, 2));
            fs.writeFileSync(path.join(magicNumberDir, 'kbo-rankings.js'), jsContent);
            console.log('📁 magic-number 폴더에도 저장 완료');
        }
        
        console.log('✅ 데이터 저장 완료:');
        console.log(`  📄 ${jsonPath}`);
        console.log(`  📄 ${jsPath}`);
        
        return data;
    }

    async updateKBOData() {
        try {
            console.log('🚀 KBO 데이터 업데이트 시작...\n');
            
            // 1. 데이터 가져오기
            const html = await this.fetchTeamRankings();
            
            // 2. 데이터 파싱
            const teams = this.parseTeamData(html);
            
            if (teams.length === 0) {
                throw new Error('팀 데이터를 찾을 수 없습니다. 웹사이트 구조가 변경되었을 수 있습니다.');
            }
            
            // 3. 매직넘버 계산
            const magicNumbers = this.calculateMagicNumbers(teams);
            
            // 4. 데이터 저장
            const savedData = await this.saveData(teams, magicNumbers);
            
            console.log('\n🎉 KBO 데이터 업데이트 완료!');
            console.log(`📊 총 ${teams.length}팀 데이터 처리`);
            console.log(`⏰ 업데이트 시간: ${new Date().toLocaleString('ko-KR')}`);
            
            // 현재 1위팀 정보 출력
            if (teams.length > 0) {
                const leader = teams[0];
                console.log(`👑 현재 1위: ${leader.team} (${leader.wins}승 ${leader.losses}패, 승률 ${leader.winRate})`);
            }
            
            return savedData;
            
        } catch (error) {
            console.error('❌ KBO 데이터 업데이트 실패:', error.message);
            throw error;
        }
    }
}

// 실행 함수
async function main() {
    const scraper = new KBODataScraper();
    await scraper.updateKBOData();
}

// 직접 실행시
if (require.main === module) {
    main().catch(console.error);
}

module.exports = KBODataScraper;
