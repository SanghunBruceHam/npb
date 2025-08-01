#!/usr/bin/env node

/**
 * 원본 복잡한 형식의 2025-season-data.txt 파싱
 * 완전히 새로운 접근 방식으로 모든 경기 데이터 추출
 */

const fs = require('fs');
const path = require('path');

class RawDataParser {
    constructor() {
        this.headToHead = {};
        this.teamStats = {};
        this.games = [];
        this.validTeams = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
        console.log('🔍 원본 복잡 데이터 파싱 시작...\n');
    }

    initializeTeamStats() {
        this.validTeams.forEach(team => {
            this.teamStats[team] = {
                games: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            
            this.headToHead[team] = {};
            this.validTeams.forEach(opponent => {
                if (team !== opponent) {
                    this.headToHead[team][opponent] = {
                        wins: 0,
                        losses: 0,
                        draws: 0
                    };
                }
            });
        });
    }

    parseRawData() {
        const filePath = path.join(process.cwd(), '2025-season-data.txt');
        
        if (!fs.existsSync(filePath)) {
            console.log('❌ 2025-season-data.txt 파일을 찾을 수 없습니다.');
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        console.log(`📄 총 ${lines.length}개 라인 발견`);
        
        let currentDate = null;
        let gameCount = 0;
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // 날짜 패턴 찾기 (예: "3월 22일 (토)")
            const dateMatch = line.match(/^(\d{1,2})월\s*(\d{1,2})일\s*\([^)]+\)$/);
            if (dateMatch) {
                const month = parseInt(dateMatch[1]);
                const day = parseInt(dateMatch[2]);
                
                // 정규시즌만 처리 (3월 22일부터)
                const isRegularSeason = (month > 3) || (month === 3 && day >= 22);
                if (isRegularSeason) {
                    currentDate = `2025-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                    console.log(`📅 정규시즌 날짜: ${currentDate}`);
                } else {
                    console.log(`🏃 시범경기 제외: ${month}월 ${day}일`);
                    currentDate = null;
                }
                i++;
                continue;
            }

            // 정규시즌 날짜에서만 경기 파싱
            if (currentDate && line === '종료') {
                const gameData = this.parseGameFromBlock(lines, i, currentDate);
                if (gameData) {
                    this.games.push(gameData);
                    this.updateStats(gameData);
                    gameCount++;
                    
                    if (gameCount % 50 === 0) {
                        console.log(`   ⚾ 파싱된 경기: ${gameCount}개`);
                    }
                }
            }

            i++;
        }

        console.log(`✅ 총 ${gameCount}개 정규시즌 경기 파싱 완료\n`);
        return true;
    }

    parseGameFromBlock(lines, startIndex, date) {
        // "종료" 이후 블록에서 경기 정보 추출
        let team1 = null, team2 = null;
        let score1 = null, score2 = null;
        let result1 = null, result2 = null;
        
        // "종료" 이후 최대 50줄 검색
        const maxSearch = Math.min(startIndex + 50, lines.length);
        
        for (let i = startIndex + 1; i < maxSearch; i++) {
            const line = lines[i].trim();
            
            // 다음 경기나 날짜에 도달하면 중단
            if (line.match(/^\d{1,2}월\s*\d{1,2}일/) || line === '종료') {
                break;
            }
            
            // 팀명 찾기
            if (this.validTeams.includes(line)) {
                if (!team1) {
                    team1 = line;
                    // 다음 몇 줄에서 승/패/무 찾기
                    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                        const resultLine = lines[j].trim();
                        if (['승', '패', '무'].includes(resultLine)) {
                            result1 = resultLine;
                            break;
                        }
                    }
                } else if (!team2 && line !== team1) {
                    team2 = line;
                    // 다음 몇 줄에서 승/패/무 찾기
                    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                        const resultLine = lines[j].trim();
                        if (['승', '패', '무'].includes(resultLine)) {
                            result2 = resultLine;
                            break;
                        }
                    }
                }
            }
            
            // 스코어 찾기
            if (line === '스코어') {
                const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
                const scoreValue = parseInt(nextLine);
                if (!isNaN(scoreValue)) {
                    if (score1 === null) {
                        score1 = scoreValue;
                    } else if (score2 === null) {
                        score2 = scoreValue;
                    }
                }
            }
        }

        // 유효한 경기 데이터인지 확인
        if (team1 && team2 && score1 !== null && score2 !== null && team1 !== team2) {
            
            // 스코어를 기준으로 승부 결정 (승/패 결과는 참고용)
            let winner = null, loser = null, isDraw = false;
            
            if (score1 === score2) {
                isDraw = true;
                console.log(`   🤝 무승부 발견: ${team1} ${score1}:${score2} ${team2} (${date})`);
            } else if (score1 > score2) {
                winner = team1;
                loser = team2;
            } else {
                winner = team2;
                loser = team1;
            }

            return {
                date: date,
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                result1: result1,
                result2: result2,
                winner: winner,
                loser: loser,
                isDraw: isDraw
            };
        }

        return null;
    }

    updateStats(game) {
        const { team1, team2, winner, loser, isDraw } = game;
        
        // 전체 팀 통계 업데이트
        this.teamStats[team1].games++;
        this.teamStats[team2].games++;
        
        if (isDraw) {
            this.teamStats[team1].draws++;
            this.teamStats[team2].draws++;
            this.headToHead[team1][team2].draws++;
            this.headToHead[team2][team1].draws++;
        } else {
            this.teamStats[winner].wins++;
            this.teamStats[loser].losses++;
            this.headToHead[winner][loser].wins++;
            this.headToHead[loser][winner].losses++;
        }
    }

    generateReport() {
        console.log('📊 팀간 상대전적 테이블 (2025 정규시즌)');
        console.log('='.repeat(120));
        
        // 헤더 출력
        let header = '팀명'.padEnd(8);
        this.validTeams.forEach(team => {
            header += team.padEnd(10);
        });
        header += '합계'.padEnd(12);
        console.log(header);
        console.log('-'.repeat(120));
        
        // 각 팀별 상대전적 출력
        this.validTeams.forEach(team => {
            let row = team.padEnd(8);
            
            this.validTeams.forEach(opponent => {
                if (team === opponent) {
                    row += '■'.padEnd(10);
                } else {
                    const record = this.headToHead[team][opponent];
                    const recordStr = `${record.wins}-${record.losses}-${record.draws}`;
                    row += recordStr.padEnd(10);
                }
            });
            
            // 합계 (전체 승-패-무)
            const totalStats = this.teamStats[team];
            const totalStr = `${totalStats.wins}-${totalStats.losses}-${totalStats.draws}`;
            row += totalStr.padEnd(12);
            
            console.log(row);
        });
        
        console.log('\n');
    }

    saveResults() {
        const outputPath = path.join(process.cwd(), 'raw-data-analysis.json');
        
        const result = {
            lastUpdated: new Date().toISOString(),
            updateDate: new Date().toLocaleDateString('ko-KR'),
            note: '원본 복잡 형식 2025-season-data.txt 완전 파싱 (7/31까지)',
            source: 'RAW_DATA_COMPLETE',
            totalGames: this.games.length,
            totalData: this.headToHead,
            teamStats: this.teamStats,
            sampleGames: this.games.slice(0, 5) // 처음 5경기 샘플
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
        console.log(`💾 결과 저장: ${outputPath}`);
        
        return outputPath;
    }

    analyze() {
        console.log('🎯 원본 복잡 데이터 완전 분석 시작');
        console.log('📅 기간: 2025년 3월 22일 ~ 7월 31일 (정규시즌만)');
        console.log('📄 소스: 2025-season-data.txt 원본 형식\n');
        
        this.initializeTeamStats();
        
        const success = this.parseRawData();
        if (!success) {
            return false;
        }
        
        this.generateReport();
        
        const outputPath = this.saveResults();
        
        const totalGames = Object.values(this.teamStats).reduce((sum, stat) => sum + stat.games, 0) / 2;
        console.log(`✅ 원본 데이터 분석 완료!`);
        console.log(`📊 총 경기수: ${totalGames}경기`);
        console.log(`💾 결과 파일: ${outputPath}`);
        
        return true;
    }
}

// 실행
async function main() {
    const parser = new RawDataParser();
    const success = parser.analyze();
    
    if (success) {
        console.log('\n🎉 분석 성공!');
        process.exit(0);
    } else {
        console.log('\n❌분석 실패!');
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RawDataParser;