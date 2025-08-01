#!/usr/bin/env node

/**
 * 새로운 형식의 2025-season-data.txt 분석기
 * 형식: "팀명 점수 : 점수 팀명 리뷰"
 */

const fs = require('fs');
const path = require('path');

class NewSeasonDataAnalyzer {
    constructor() {
        this.headToHead = {};
        this.teamStats = {};
        console.log('📊 새로운 형식 2025 시즌 데이터 분석 시작...\n');
    }

    initializeTeamStats() {
        const teams = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
        
        teams.forEach(team => {
            this.teamStats[team] = {
                games: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
            
            this.headToHead[team] = {};
            teams.forEach(opponent => {
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

    parseNewSeasonData() {
        const filePath = path.join(process.cwd(), '2025-season-data.txt');
        
        if (!fs.existsSync(filePath)) {
            console.log('❌ 2025-season-data.txt 파일을 찾을 수 없습니다.');
            return false;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').map(line => line.trim());
        
        console.log(`📄 총 ${lines.length}개 라인 발견`);
        
        let gameCount = 0;
        let currentDate = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 빈 줄 건너뛰기
            if (!line || line.length === 0) continue;
            
            // 날짜 라인 체크 (예: "3월 22일")
            const dateMatch = line.match(/(\d{1,2})월\s*(\d{1,2})일/);
            if (dateMatch) {
                currentDate = `2025-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
                console.log(`   📅 날짜: ${currentDate}`);
                continue;
            }
            
            // 경기 결과 파싱 (새 형식: "팀명 점수 : 점수 팀명 리뷰")
            const gameResult = this.parseGameLine(line, currentDate);
            if (gameResult) {
                this.updateStats(gameResult);
                gameCount++;
                
                if (gameCount % 50 === 0) {
                    console.log(`   처리된 경기: ${gameCount}개 (현재: ${currentDate})`);
                }
            }
        }
        
        console.log(`✅ 총 ${gameCount}개 경기 파싱 완료\n`);
        return true;
    }

    parseGameLine(line, date) {
        // 새 형식 패턴: "한화 4 : 3 KT 리뷰"
        const pattern = /^([가-힣]+)\s+(\d+)\s*:\s*(\d+)\s+([가-힣]+)\s*리뷰?$/;
        const match = line.match(pattern);
        
        if (match) {
            const team1 = this.normalizeTeamName(match[1]);
            const score1 = parseInt(match[2]);
            const score2 = parseInt(match[3]);
            const team2 = this.normalizeTeamName(match[4]);

            // 유효한 팀명인지 확인
            const validTeams = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
            if (validTeams.includes(team1) && validTeams.includes(team2) && team1 !== team2) {
                return {
                    date: date,
                    team1: team1,
                    team2: team2,
                    score1: score1,
                    score2: score2,
                    winner: score1 > score2 ? team1 : score2 > score1 ? team2 : null,
                    loser: score1 > score2 ? team2 : score2 > score1 ? team1 : null,
                    isDraw: score1 === score2
                };
            }
        }
        
        return null;
    }

    normalizeTeamName(teamName) {
        const mapping = {
            '랜더스': 'SSG',
            'SSG랜더스': 'SSG',
            'kt': 'KT',
            'lg': 'LG',
            'nc': 'NC',
            'kia': 'KIA',
            '기아': 'KIA',
            '키움히어로즈': '키움',
            '한화이글스': '한화',
            'LG트윈스': 'LG',
            '롯데자이언츠': '롯데',
            '삼성라이온즈': '삼성',
            'NC다이노스': 'NC',
            'KT위즈': 'KT',
            '두산베어스': '두산'
        };
        
        return mapping[teamName] || teamName;
    }

    updateStats(game) {
        const { team1, team2, score1, score2, winner, loser, isDraw } = game;
        
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

    generateHeadToHeadTable() {
        console.log('📊 팀간 상대전적 테이블 (새 형식 데이터)');
        console.log('='.repeat(120));
        
        const teams = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
        
        // 헤더 출력
        let header = '팀명'.padEnd(8);
        teams.forEach(team => {
            header += team.padEnd(10);
        });
        header += '합계'.padEnd(12);
        console.log(header);
        console.log('-'.repeat(120));
        
        // 각 팀별 상대전적 출력
        teams.forEach(team => {
            let row = team.padEnd(8);
            
            teams.forEach(opponent => {
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

    compareWithKBOOfficial() {
        console.log('🔍 KBO 공식 데이터와 비교 분석');
        console.log('='.repeat(80));
        
        // KBO 공식 데이터 (사용자 제공)
        const kboOfficial = {
            '한화': { 'LG': '4-5-1', '롯데': '4-6-0', 'SSG': '6-6-0', 'KT': '8-3-0', 'KIA': '8-3-0', '삼성': '7-4-0', 'NC': '7-4-1', '두산': '6-5-1', '키움': '9-1-0' },
            'LG': { '한화': '5-4-1', '롯데': '6-4-1', 'SSG': '8-4-0', 'KT': '6-4-0', 'KIA': '7-4-0', '삼성': '6-6-0', 'NC': '6-5-0', '두산': '6-5-0', '키움': '8-4-0' },
            'KT': { '한화': '3-8-0', 'LG': '4-6-0', '롯데': '4-6-2', 'SSG': '5-6-0', 'KIA': '5-7-0', '삼성': '7-3-0', 'NC': '6-5-0', '두산': '7-4-1', '키움': '9-3-0' }
        };
        
        console.log('주요 비교:');
        let perfectMatches = 0;
        let totalChecked = 0;
        
        const teams = ['한화', 'LG', 'KT'];
        
        teams.forEach(team => {
            if (kboOfficial[team]) {
                Object.keys(kboOfficial[team]).forEach(opponent => {
                    if (this.headToHead[team] && this.headToHead[team][opponent]) {
                        const ourRecord = this.headToHead[team][opponent];
                        const ourStr = `${ourRecord.wins}-${ourRecord.losses}-${ourRecord.draws}`;
                        const kboStr = kboOfficial[team][opponent];
                        
                        totalChecked++;
                        if (ourStr === kboStr) {
                            perfectMatches++;
                            console.log(`   ✅ ${team} vs ${opponent}: ${ourStr} (완벽 일치)`);
                        } else {
                            console.log(`   ❌ ${team} vs ${opponent}: 우리=${ourStr}, KBO=${kboStr}`);
                        }
                    }
                });
            }
        });
        
        const accuracy = Math.round((perfectMatches / totalChecked) * 100);
        console.log(`\n📈 정확도: ${perfectMatches}/${totalChecked} = ${accuracy}%`);
    }

    saveToJSON() {
        const outputPath = path.join(process.cwd(), 'new-season-analysis.json');
        
        const result = {
            lastUpdated: new Date().toISOString(),
            updateDate: new Date().toLocaleDateString('ko-KR'),
            note: '새 형식 2025-season-data.txt 기반 계산',
            source: 'NEW_FORMAT_SEASON_DATA',
            totalData: this.headToHead,
            teamStats: this.teamStats
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
        console.log(`💾 결과 저장: ${outputPath}`);
        
        return outputPath;
    }

    analyze() {
        console.log('🎯 새 형식 2025 시즌 데이터 분석 시작');
        console.log('📅 형식: "팀명 점수 : 점수 팀명 리뷰"');
        console.log('📄 소스: 업데이트된 2025-season-data.txt\n');
        
        this.initializeTeamStats();
        
        const success = this.parseNewSeasonData();
        if (!success) {
            return false;
        }
        
        this.generateHeadToHeadTable();
        this.compareWithKBOOfficial();
        
        const outputPath = this.saveToJSON();
        
        console.log('\n✅ 새 형식 데이터 분석 완료!');
        console.log(`📊 총 경기수: ${Object.values(this.teamStats).reduce((sum, stat) => sum + stat.games, 0) / 2}경기`);
        console.log(`💾 결과 파일: ${outputPath}`);
        
        return true;
    }
}

// 실행
async function main() {
    const analyzer = new NewSeasonDataAnalyzer();
    const success = analyzer.analyze();
    
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

module.exports = NewSeasonDataAnalyzer;