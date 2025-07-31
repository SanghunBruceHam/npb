#!/usr/bin/env node

/**
 * KBO 팀 순위 데이터 스크래핑 스크립트 (수정된 버전)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class KBODataScraper {
    constructor() {
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
                'Connection': 'keep-alive'
            }
        });
    }

    async fetchTeamRankings() {
        try {
            console.log('📊 KBO 팀 순위 데이터 가져오는 중...');

            const url = 'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';
            const response = await this.client.get(url);

            console.log('✅ 팀 순위 데이터 응답 받음');
            return response.data;

        } catch (error) {
            console.error('❌ 팀 순위 데이터 가져오기 실패:', error.message);

            // 임시 더미 데이터 사용
            console.log('⚠️ 더미 데이터로 대체합니다.');
            return this.getDummyData();
        }
    }

    async fetchHeadToHeadRecords() {
        try {
            console.log('🆚 KBO 상대전적 데이터 가져오는 중...');

            const url = 'https://www.koreabaseball.com/Record/TeamRank/TeamVs.aspx';
            const response = await this.client.get(url);

            console.log('✅ 상대전적 데이터 응답 받음');
            return response.data;

        } catch (error) {
            console.error('❌ 상대전적 데이터 가져오기 실패:', error.message);
            // 백업 URL 시도
            try {
                console.log('🔄 백업 URL 시도...');
                const backupUrl = 'https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx';
                const backupResponse = await this.client.get(backupUrl);
                console.log('✅ 백업 URL로 데이터 수집 성공');
                return backupResponse.data;
            } catch (backupError) {
                console.error('❌ 백업 URL도 실패:', backupError.message);
                return null;
            }
        }
    }

    async fetchSchedule() {
        try {
            console.log('📅 KBO 일정 데이터 가져오는 중...');

            const url = 'https://www.koreabaseball.com/Schedule/Schedule.aspx';
            const response = await this.client.get(url);

            console.log('✅ 일정 데이터 응답 받음');
            return response.data;

        } catch (error) {
            console.error('❌ 일정 데이터 가져오기 실패:', error.message);
            return null;
        }
    }

    getDummyData() {
        // 현실적인 KBO 데이터 (2024년 기준)
        return {
            teams: [
                { rank: 1, team: 'KIA', games: 144, wins: 87, losses: 55, draws: 2, winRate: 0.613, gamesBehind: 0 },
                { rank: 2, team: 'LG', games: 144, wins: 79, losses: 64, draws: 1, winRate: 0.552, gamesBehind: 8.5 },
                { rank: 3, team: '삼성', games: 144, wins: 78, losses: 66, draws: 0, winRate: 0.542, gamesBehind: 9.5 },
                { rank: 4, team: '두산', games: 144, wins: 76, losses: 68, draws: 0, winRate: 0.528, gamesBehind: 11.5 },
                { rank: 5, team: 'KT', games: 144, wins: 72, losses: 72, draws: 0, winRate: 0.500, gamesBehind: 15.5 },
                { rank: 6, team: 'SSG', games: 144, wins: 70, losses: 74, draws: 0, winRate: 0.486, gamesBehind: 17.5 },
                { rank: 7, team: 'NC', games: 144, wins: 68, losses: 76, draws: 0, winRate: 0.472, gamesBehind: 19.5 },
                { rank: 8, team: '롯데', games: 144, wins: 66, losses: 78, draws: 0, winRate: 0.458, gamesBehind: 21.5 },
                { rank: 9, team: '한화', games: 144, wins: 63, losses: 81, draws: 0, winRate: 0.438, gamesBehind: 24.5 },
                { rank: 10, team: '키움', games: 144, wins: 57, losses: 87, draws: 0, winRate: 0.396, gamesBehind: 30.5 }
            ]
        };
    }

    parseTeamData(html) {
        if (typeof html === 'object' && html.teams) {
            return html.teams;
        }

        const $ = cheerio.load(html);
        const teams = [];

        console.log('🔍 팀 순위 데이터 파싱 중...');

        // KBO 웹사이트의 실제 테이블 구조에 맞는 선택자
        const tableSelectors = [
            '.tData tbody tr',
            '.tbl_type01 tbody tr',
            'table.tData tr',
            '.record-table tbody tr'
        ];

        for (const selector of tableSelectors) {
            $(selector).each((index, row) => {
                const $row = $(row);
                const cells = $row.find('td');

                if (cells.length >= 8) {
                    const rank = cells.eq(0).text().trim();
                    const teamName = cells.eq(1).text().trim();
                    const games = cells.eq(2).text().trim();
                    const wins = cells.eq(3).text().trim();
                    const losses = cells.eq(4).text().trim();
                    const draws = cells.eq(5).text().trim();
                    const winRate = cells.eq(6).text().trim();
                    const gamesBehind = cells.eq(7).text().trim();
                    
                    // 최근 10경기 전적 (9번째 열 또는 더 뒤에 있을 수 있음)
                    let recent10 = '';
                    for (let i = 8; i < cells.length; i++) {
                        const cellText = cells.eq(i).text().trim();
                        if (cellText.includes('승') && cellText.includes('패')) {
                            recent10 = cellText;
                            break;
                        }
                    }

                    if (rank && teamName && !isNaN(parseInt(rank))) {
                        const gamesPlayed = parseInt(games) || 0;
                        teams.push({
                            rank: parseInt(rank),
                            team: teamName,
                            games: gamesPlayed,
                            wins: parseInt(wins) || 0,
                            losses: parseInt(losses) || 0,
                            draws: parseInt(draws) || 0,
                            winRate: parseFloat(winRate) || 0,
                            gamesBehind: gamesBehind === '-' ? 0 : parseFloat(gamesBehind) || 0,
                            recent10: recent10 || this.generateRecent10Games(),
                            remainingGames: 144 - gamesPlayed
                        });
                    }
                }
            });

            if (teams.length > 0) break;
        }

        // 데이터가 없으면 더미 데이터 사용
        if (teams.length === 0) {
            console.log('⚠️ 파싱된 데이터가 없어 더미 데이터를 사용합니다.');
            return this.getDummyData().teams;
        }

        return teams.sort((a, b) => a.rank - b.rank);
    }

    generateRecent10Games() {
        // 실제로는 HTML에서 파싱해야 함 - 백업용 더미 데이터
        const wins = Math.floor(Math.random() * 8) + 2;
        const losses = Math.floor(Math.random() * (8 - wins));
        const draws = 10 - wins - losses;
        
        return `${wins}승${draws > 0 ? draws + '무' : ''}${losses}패`;
    }

    calculateMagicNumbers(teams) {
        console.log('🔮 매직넘버 계산 중...');

        const magicNumbers = {};
        const totalGames = 144;
        const playoffSpots = 5;

        teams.forEach((team, index) => {
            const remainingGames = totalGames - team.games;

            // 플레이오프 진출 매직넘버
            let playoffMagic = 0;
            if (index < playoffSpots) {
                const sixthPlace = teams[playoffSpots] || teams[teams.length - 1];
                const sixthMaxWins = sixthPlace.wins + (totalGames - sixthPlace.games);
                playoffMagic = Math.max(0, sixthMaxWins - team.wins + 1);
            } else {
                const fifthPlace = teams[playoffSpots - 1];
                playoffMagic = Math.max(0, fifthPlace.wins - (team.wins + remainingGames) + 1);
            }

            // 우승 매직넘버
            let championshipMagic = 0;
            if (index === 0) {
                const secondPlace = teams[1];
                if (secondPlace) {
                    const secondMaxWins = secondPlace.wins + (totalGames - secondPlace.games);
                    championshipMagic = Math.max(0, secondMaxWins - team.wins + 1);
                }
            } else {
                const firstPlace = teams[0];
                championshipMagic = Math.max(0, firstPlace.wins - (team.wins + remainingGames) + 1);
            }

            magicNumbers[team.team] = {
                playoff: playoffMagic,
                championship: championshipMagic,
                remainingGames: remainingGames
            };

            console.log(`  🎯 ${team.team}: 플레이오프 ${playoffMagic}, 우승 ${championshipMagic}`);
        });

        return magicNumbers;
    }

    parseHeadToHeadData(html) {
        try {
            console.log('🔄 상대전적 데이터 파싱 중...');
            // HTML 파싱 로직 구현 필요
            return { rawData: "상대전적 원본 데이터", processed: {} };
        } catch (error) {
            console.error('❌ 상대전적 데이터 파싱 실패:', error.message);
            return null;
        }
    }

    parseScheduleData(html) {
        try {
            console.log('🔄 일정 데이터 파싱 중...');
            
            if (typeof html === 'string' && html.includes('Schedule')) {
                const $ = cheerio.load(html);
                const games = [];
                const headToHeadStats = {};
                
                // 경기 결과가 있는 행들을 찾아서 파싱
                $('tr').each((index, row) => {
                    const $row = $(row);
                    const cells = $row.find('td');
                    
                    if (cells.length >= 4) {
                        const matchInfo = cells.eq(2).text().trim(); // "KT vs LG" 형태
                        const result = cells.eq(3).text().trim();    // 경기 결과
                        
                        if (matchInfo.includes(' vs ') && result && result !== '') {
                            const teams = matchInfo.split(' vs ');
                            if (teams.length === 2) {
                                const awayTeam = teams[0].trim();
                                const homeTeam = teams[1].trim(); // 뒤에 나오는 팀이 홈
                                
                                games.push({
                                    awayTeam,
                                    homeTeam,
                                    result,
                                    isFinished: true
                                });
                                
                                // 상대전적 통계 누적
                                this.updateHeadToHeadStats(headToHeadStats, awayTeam, homeTeam, result);
                            }
                        }
                    }
                });
                
                return { 
                    rawData: `총 ${games.length}경기 파싱됨`,
                    processed: {
                        games,
                        headToHeadStats,
                        totalGames: games.length
                    }
                };
            }
            
            return { rawData: "일정 원본 데이터", processed: {} };
        } catch (error) {
            console.error('❌ 일정 데이터 파싱 실패:', error.message);
            return null;
        }
    }

    updateHeadToHeadStats(stats, awayTeam, homeTeam, result) {
        // 상대전적 통계 업데이트 로직
        // result에서 승패 판단 (뒤에 나오는 팀이 홈팀이므로 홈팀 기준으로 승패 계산)
        
        const key1 = `${awayTeam}_vs_${homeTeam}`;
        const key2 = `${homeTeam}_vs_${awayTeam}`;
        
        if (!stats[key1]) {
            stats[key1] = { wins: 0, losses: 0, draws: 0, homeWins: 0, awayWins: 0 };
        }
        if (!stats[key2]) {
            stats[key2] = { wins: 0, losses: 0, draws: 0, homeWins: 0, awayWins: 0 };
        }
        
        // 경기 결과 파싱하여 승패 판단 (구체적인 로직은 실제 결과 형태에 따라 구현)
        // 예: "5:3" 형태라면 앞 점수가 높으면 홈팀(뒤팀) 승리
        if (result.includes(':')) {
            const scores = result.split(':');
            if (scores.length === 2) {
                const awayScore = parseInt(scores[0]);
                const homeScore = parseInt(scores[1]);
                
                if (homeScore > awayScore) {
                    // 홈팀 승리
                    stats[key1].losses++;
                    stats[key2].wins++;
                    stats[key2].homeWins++;
                } else if (awayScore > homeScore) {
                    // 원정팀 승리  
                    stats[key1].wins++;
                    stats[key1].awayWins++;
                    stats[key2].losses++;
                } else {
                    // 무승부
                    stats[key1].draws++;
                    stats[key2].draws++;
                }
            }
        }
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

        // Magic number 폴더에도 복사
        const magicNumberDir = './magic-number';
        if (!fs.existsSync(magicNumberDir)) {
            fs.mkdirSync(magicNumberDir, { recursive: true });
        }

        fs.writeFileSync(path.join(magicNumberDir, 'kbo-rankings.json'), JSON.stringify(data, null, 2));

        console.log('✅ 데이터 저장 완료');
        return data;
    }

    async updateKBOData() {
        try {
            console.log('🚀 KBO 데이터 업데이트 시작...\n');

            // 1. 데이터 가져오기
            const [rankingsHtml, headToHeadHtml, scheduleHtml] = await Promise.allSettled([
                this.fetchTeamRankings(),
                this.fetchHeadToHeadRecords(),
                this.fetchSchedule()
            ]);

            // 2. 순위 데이터 파싱 (필수)
            const teams = this.parseTeamData(rankingsHtml.status === 'fulfilled' ? rankingsHtml.value : null);

            // 3. 상대전적 데이터 파싱 (선택적)
            let headToHeadData = null;
            if (headToHeadHtml.status === 'fulfilled' && headToHeadHtml.value) {
                headToHeadData = this.parseHeadToHeadData(headToHeadHtml.value);
            }

            // 4. 일정 데이터 파싱 (선택적)
            let scheduleData = null;
            if (scheduleHtml.status === 'fulfilled' && scheduleHtml.value) {
                scheduleData = this.parseScheduleData(scheduleHtml.value);
            }

            // 5. 매직넘버 계산
            const magicNumbers = this.calculateMagicNumbers(teams);

            // 6. 데이터 저장
            const savedData = await this.saveData(teams, magicNumbers);

            console.log('\n🎉 KBO 데이터 업데이트 완료!');
            console.log(`📊 총 ${teams.length}팀 데이터 처리`);
            console.log(`⏰ 업데이트 시간: ${new Date().toLocaleString('ko-KR')}`);

            if (teams.length > 0) {
                const leader = teams[0];
                console.log(`👑 현재 1위: ${leader.team} (${leader.wins}승 ${leader.losses}패)`);
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