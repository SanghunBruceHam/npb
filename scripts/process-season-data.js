#!/usr/bin/env node

/**
 * KBO 시즌 데이터 완전 자동화 처리 스크립트
 * 2025-season-data-clean.txt를 기반으로 모든 서비스 지표 계산
 */

const fs = require('fs');
const path = require('path');

class KBODataProcessor {
    constructor() {
        this.teams = ['한화', 'LG', '롯데', 'SSG', 'KT', 'KIA', '삼성', 'NC', '두산', '키움'];
        this.totalGamesPerSeason = 144;
        this.gamesPerOpponent = 16; // 각 팀당 16경기씩
        this.playoffSpots = 5;
        
        // 데이터 저장소
        this.games = [];
        this.teamStats = {};
        this.headToHead = {};
        this.standings = [];
        this.magicNumbers = {};
        this.remainingGames = {};
    }

    // 1. 경기 데이터 파싱
    parseGameData() {
        console.log('📖 경기 데이터 파싱 시작...');
        
        try {
            const data = fs.readFileSync('./data/2025-season-data-clean.txt', 'utf8');
            const lines = data.trim().split('\n');
            
            let currentDate = '';
            let gameCount = 0;
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                // 날짜 라인 체크 (YYYY-MM-DD 형식)
                if (trimmedLine.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    currentDate = trimmedLine;
                    continue;
                }
                
                // 경기 결과 파싱 (팀1 점수:점수 팀2(H) 또는 팀1 점수:점수 팀2)
                const gameMatch = trimmedLine.match(/^(.+?)\s+(\d+):(\d+)\s+(.+?)(\(H\))?$/);
                if (gameMatch) {
                    const [, team1, score1, score2, team2Raw, homeMarker] = gameMatch;
                    
                    // 홈팀 식별: (H) 표시가 있으면 해당 팀이 홈팀, 없으면 기존 규칙 적용
                    let homeTeam, awayTeam, team2;
                    if (homeMarker === '(H)') {
                        // (H) 표시가 있는 경우 - 명시적 홈팀 표시
                        team2 = team2Raw;
                        homeTeam = team2;
                        awayTeam = team1;
                    } else {
                        // (H) 표시가 없는 경우 - 기존 규칙 (뒤에 나온 팀이 홈팀)
                        team2 = team2Raw;
                        homeTeam = team2;
                        awayTeam = team1;
                    }
                    
                    // 결과 판정
                    let result;
                    if (parseInt(score1) > parseInt(score2)) {
                        result = { winner: team1, loser: team2, isDraw: false };
                    } else if (parseInt(score1) < parseInt(score2)) {
                        result = { winner: team2, loser: team1, isDraw: false };
                    } else {
                        result = { winner: null, loser: null, isDraw: true };
                    }
                    
                    this.games.push({
                        date: currentDate,
                        team1: team1,
                        team2: team2,
                        score1: parseInt(score1),
                        score2: parseInt(score2),
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        homeMarkerPresent: !!homeMarker, // 레퍼런스용
                        ...result
                    });
                    
                    gameCount++;
                }
            }
            
            console.log(`✅ 파싱 완료: ${gameCount}경기, 최신 날짜: ${currentDate}`);
            return { gameCount, lastDate: currentDate };
            
        } catch (error) {
            console.error('❌ 파싱 실패:', error.message);
            throw error;
        }
    }

    // 2. 팀별 기본 통계 계산
    calculateTeamStats() {
        console.log('📊 팀별 통계 계산 중...');
        
        // 초기화
        this.teams.forEach(team => {
            this.teamStats[team] = {
                games: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                homeWins: 0,
                homeLosses: 0,
                homeDraws: 0,
                awayWins: 0,
                awayLosses: 0,
                awayDraws: 0,
                recent10: [],
                currentStreak: { type: '', count: 0 }
            };
        });
        
        // 경기별 통계 누적
        for (const game of this.games) {
            const { team1, team2, homeTeam, awayTeam, winner, loser, isDraw } = game;
            
            // 두 팀 모두 경기수 증가
            this.teamStats[team1].games++;
            this.teamStats[team2].games++;
            
            if (isDraw) {
                // 무승부
                this.teamStats[team1].draws++;
                this.teamStats[team2].draws++;
                
                // 홈/원정 무승부
                this.teamStats[homeTeam].homeDraws++;
                this.teamStats[awayTeam].awayDraws++;
                
                // 최근 10경기 기록
                this.teamStats[team1].recent10.push('무');
                this.teamStats[team2].recent10.push('무');
                
            } else {
                // 승부 결정
                this.teamStats[winner].wins++;
                this.teamStats[loser].losses++;
                
                // 홈/원정 승패
                if (winner === homeTeam) {
                    this.teamStats[winner].homeWins++;
                    this.teamStats[loser].awayLosses++;
                } else {
                    this.teamStats[winner].awayWins++;
                    this.teamStats[loser].homeLosses++;
                }
                
                // 최근 10경기 기록
                this.teamStats[winner].recent10.push('승');
                this.teamStats[loser].recent10.push('패');
            }
        }
        
        // 후처리: 승률, 최근 10경기, 연속 기록 계산
        this.teams.forEach(team => {
            const stats = this.teamStats[team];
            
            // 승률 계산
            stats.winRate = stats.wins / (stats.wins + stats.losses) || 0;
            
            // 최근 10경기 정리 (최신 10개만)
            stats.recent10 = stats.recent10.slice(-10);
            const recent10Summary = this.formatRecent10(stats.recent10);
            stats.recent10Display = recent10Summary;
            
            // 현재 연속 기록 계산
            stats.currentStreak = this.calculateStreak(stats.recent10);
            
            // 홈/원정 기록 문자열
            stats.homeRecord = `${stats.homeWins}-${stats.homeLosses}-${stats.homeDraws}`;
            stats.awayRecord = `${stats.awayWins}-${stats.awayLosses}-${stats.awayDraws}`;
            
            console.log(`  📈 ${team}: ${stats.games}경기 ${stats.wins}승${stats.losses}패${stats.draws}무 (.${(stats.winRate * 1000).toFixed(0)})`);
        });
    }

    // 3. 상대전적 계산
    calculateHeadToHead() {
        console.log('⚔️ 상대전적 계산 중...');
        
        // 초기화
        this.teams.forEach(team1 => {
            this.headToHead[team1] = {};
            this.teams.forEach(team2 => {
                if (team1 !== team2) {
                    this.headToHead[team1][team2] = { wins: 0, losses: 0, draws: 0 };
                }
            });
        });
        
        // 경기별 상대전적 계산
        for (const game of this.games) {
            const { team1, team2, winner, loser, isDraw } = game;
            
            if (isDraw) {
                this.headToHead[team1][team2].draws++;
                this.headToHead[team2][team1].draws++;
            } else {
                this.headToHead[winner][loser].wins++;
                this.headToHead[loser][winner].losses++;
            }
        }
        
        // 상대전적 요약 출력
        console.log('  ⚔️ 상대전적 매트릭스 완성');
        this.teams.forEach(team => {
            const totalGames = Object.values(this.headToHead[team])
                .reduce((sum, record) => sum + record.wins + record.losses + record.draws, 0);
            console.log(`    ${team}: 총 ${totalGames}경기`);
        });
    }

    // 4. 잔여경기 계산
    calculateRemainingGames() {
        console.log('📅 잔여경기 계산 중...');
        
        this.teams.forEach(team1 => {
            this.remainingGames[team1] = {};
            let totalRemaining = 0;
            
            this.teams.forEach(team2 => {
                if (team1 !== team2) {
                    const played = this.headToHead[team1][team2].wins + 
                                  this.headToHead[team1][team2].losses + 
                                  this.headToHead[team1][team2].draws;
                    
                    const remaining = this.gamesPerOpponent - played;
                    this.remainingGames[team1][team2] = Math.max(0, remaining);
                    totalRemaining += this.remainingGames[team1][team2];
                }
            });
            
            this.remainingGames[team1].total = totalRemaining;
            console.log(`  📅 ${team1}: ${totalRemaining}경기 남음`);
        });
    }

    // 5. 순위 계산
    calculateStandings() {
        console.log('🏆 순위 계산 중...');
        
        this.standings = this.teams.map(team => {
            const stats = this.teamStats[team];
            return {
                team: team,
                games: stats.games,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                winRate: stats.winRate,
                homeRecord: stats.homeRecord,
                awayRecord: stats.awayRecord,
                homeWins: stats.homeWins,
                homeLosses: stats.homeLosses,
                homeDraws: stats.homeDraws,
                awayWins: stats.awayWins,
                awayLosses: stats.awayLosses,
                awayDraws: stats.awayDraws,
                recent10: stats.recent10Display,
                streak: this.formatStreak(stats.currentStreak),
                remainingGames: this.remainingGames[team].total
            };
        });
        
        // 순위 정렬 (승률 기준)
        this.standings.sort((a, b) => {
            if (b.winRate !== a.winRate) return b.winRate - a.winRate;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return a.losses - b.losses;
        });
        
        // 순위 및 게임차 계산
        this.standings.forEach((team, index) => {
            team.rank = index + 1;
            
            if (index === 0) {
                team.gamesBehind = 0;
            } else {
                const firstPlace = this.standings[0];
                team.gamesBehind = (firstPlace.wins - team.wins + team.losses - firstPlace.losses) / 2;
            }
        });
        
        console.log('  🏆 순위표 완성:');
        this.standings.forEach(team => {
            console.log(`    ${team.rank}위 ${team.team} (${team.wins}-${team.losses}-${team.draws}, .${(team.winRate * 1000).toFixed(0)})`);
        });
    }

    // 6. 매직넘버 계산
    calculateMagicNumbers() {
        console.log('🔮 매직넘버 계산 중...');
        
        this.magicNumbers = {};
        
        this.standings.forEach((team, index) => {
            const remainingGames = team.remainingGames;
            const maxPossibleWins = team.wins + remainingGames;
            
            // 플레이오프 진출 매직넘버
            let playoffMagic = this.calculatePlayoffMagic(team, index);
            
            // 우승 매직넘버  
            let championshipMagic = this.calculateChampionshipMagic(team, index);
            
            // 탈락 매직넘버
            let eliminationMagic = this.calculateEliminationMagic(team, index);
            
            // 홈 어드밴티지 매직넘버 (2위 확정)
            let homeAdvantage = this.calculateHomeAdvantageMagic(team, index);
            
            this.magicNumbers[team.team] = {
                playoff: playoffMagic,
                championship: championshipMagic,
                elimination: eliminationMagic,
                homeAdvantage: homeAdvantage,
                remainingGames: remainingGames,
                maxPossibleWins: maxPossibleWins,
                currentRank: team.rank
            };
            
            console.log(`  🎯 ${team.team} (${team.rank}위): PO ${playoffMagic}, 우승 ${championshipMagic}`);
        });
    }

    // 매직넘버 계산 헬퍼 함수들
    calculatePlayoffMagic(team, index) {
        if (index < this.playoffSpots) {
            // 현재 플레이오프 권 내
            const sixthPlace = this.standings[this.playoffSpots];
            if (!sixthPlace) return 0;
            
            const sixthMaxWins = sixthPlace.wins + sixthPlace.remainingGames;
            return Math.max(0, sixthMaxWins - team.wins + 1);
        } else {
            // 플레이오프 권 밖
            const fifthPlace = this.standings[this.playoffSpots - 1];
            const maxPossibleWins = team.wins + team.remainingGames;
            
            if (maxPossibleWins <= fifthPlace.wins) {
                return 999; // 수학적으로 불가능
            }
            
            return Math.max(0, fifthPlace.wins - team.wins + 1);
        }
    }

    calculateChampionshipMagic(team, index) {
        if (index === 0) {
            // 현재 1위
            const secondPlace = this.standings[1];
            if (!secondPlace) return 0;
            
            const secondMaxWins = secondPlace.wins + secondPlace.remainingGames;
            return Math.max(0, secondMaxWins - team.wins + 1);
        } else {
            // 1위가 아님
            const firstPlace = this.standings[0];
            const maxPossibleWins = team.wins + team.remainingGames;
            
            if (maxPossibleWins <= firstPlace.wins) {
                return 999; // 수학적으로 불가능
            }
            
            return Math.max(0, firstPlace.wins - team.wins + 1);
        }
    }

    calculateEliminationMagic(team, index) {
        if (index < this.playoffSpots) {
            // 플레이오프 권 내
            const sixthPlace = this.standings[this.playoffSpots];
            if (!sixthPlace) return 999;
            
            const remainingGames = team.remainingGames;
            const minPossibleWins = team.wins;
            const sixthMinWins = sixthPlace.wins;
            
            if (minPossibleWins > sixthMinWins) {
                return 999; // 플레이오프는 확정
            }
            
            return Math.max(0, remainingGames - (team.wins - sixthPlace.wins) + 1);
        } else {
            // 플레이오프 권 밖
            const fifthPlace = this.standings[this.playoffSpots - 1];
            const remainingGames = team.remainingGames;
            const maxPossibleWins = team.wins + remainingGames;
            
            if (maxPossibleWins > fifthPlace.wins) {
                return Math.max(0, fifthPlace.wins - team.wins + 1);
            }
            
            return 0; // 이미 탈락
        }
    }

    calculateHomeAdvantageMagic(team, index) {
        if (index <= 1) {
            // 현재 1-2위
            const thirdPlace = this.standings[2];
            if (!thirdPlace) return 0;
            
            const thirdMaxWins = thirdPlace.wins + thirdPlace.remainingGames;
            return Math.max(0, thirdMaxWins - team.wins + 1);
        } else {
            // 3위 이하
            const secondPlace = this.standings[1];
            const maxPossibleWins = team.wins + team.remainingGames;
            
            if (maxPossibleWins <= secondPlace.wins) {
                return 999; // 수학적으로 불가능
            }
            
            return Math.max(0, secondPlace.wins - team.wins + 1);
        }
    }

    // 7. 통합 서비스 데이터 생성
    generateServiceData() {
        console.log('📦 통합 서비스 데이터 생성 중...');
        
        const serviceData = {
            lastUpdated: new Date().toISOString(),
            updateDate: new Date().toLocaleDateString('ko-KR'),
            note: '2025-season-data-clean.txt 기반 완전 자동화 처리',
            source: 'CLEAN_TXT_AUTOMATION',
            dataDate: this.games.length > 0 ? this.games[this.games.length - 1].date : null,
            totalGames: this.games.length,
            
            // 순위표
            standings: this.standings,
            
            // 매직넘버
            magicNumbers: this.magicNumbers,
            
            // 상대전적
            headToHead: this.headToHead,
            
            // 잔여경기
            remainingGames: this.remainingGames,
            
            // 1위 탈환 가능성 데이터
            chaseData: this.generateChaseData(),
            
            // 플레이오프 진출 데이터
            playoffData: this.generatePlayoffData()
        };
        
        return serviceData;
    }

    // 1위 탈환 가능성 데이터 생성
    generateChaseData() {
        const firstPlace = this.standings[0];
        
        return this.standings.slice(1).map(team => {
            const maxPossibleWins = team.wins + team.remainingGames;
            const canChase = maxPossibleWins > firstPlace.wins;
            const firstTeamNeedToLose = Math.max(0, maxPossibleWins - firstPlace.wins);
            const requiredWinRate = team.remainingGames > 0 ? 
                Math.min(1, (84 - team.wins) / team.remainingGames) : 0;
            
            return {
                team: team.team,
                rank: team.rank,
                wins: team.wins,
                gamesBehind: team.gamesBehind,
                remainingGames: team.remainingGames,
                maxPossibleWins: maxPossibleWins,
                firstTeamNeedToLose: firstTeamNeedToLose,
                canChase: canChase,
                requiredWinRate: requiredWinRate,
                canReach84Wins: maxPossibleWins >= 84
            };
        });
    }

    // 플레이오프 진출 데이터 생성
    generatePlayoffData() {
        return this.standings.map(team => {
            const magic = this.magicNumbers[team.team];
            const requiredWinRate = team.remainingGames > 0 ? 
                Math.min(1, magic.playoff / team.remainingGames) : 0;
            
            let status = '불가능';
            if (magic.playoff <= 0) status = '확정';
            else if (magic.playoff <= 10) status = '진출 유력';
            else if (magic.playoff <= 20) status = '경합';
            else if (magic.playoff < 999) status = '어려움';
            
            return {
                team: team.team,
                rank: team.rank,
                wins: team.wins,
                remainingGames: team.remainingGames,
                maxPossibleWins: magic.maxPossibleWins,
                playoffMagic: magic.playoff === 999 ? '-' : magic.playoff,
                requiredWinRate: requiredWinRate,
                status: status
            };
        });
    }

    // 8. 파일 저장
    async saveAllData(serviceData) {
        console.log('💾 데이터 파일 저장 중...');
        
        try {
            // 1. 통합 서비스 데이터
            fs.writeFileSync('./output/service-data.json', JSON.stringify(serviceData, null, 2));
            console.log('  ✅ output/service-data.json 저장 완료');
            
            // 2. magic-number 폴더에 웹서비스용 파일들 생성
            const rankingsData = {
                lastUpdated: serviceData.lastUpdated,
                updateDate: serviceData.updateDate,
                note: serviceData.note,
                rankings: serviceData.standings.map(team => ({
                    rank: team.rank,
                    team: team.team,
                    games: team.games,
                    wins: team.wins,
                    losses: team.losses,
                    draws: team.draws,
                    winRate: parseFloat(team.winRate.toFixed(3)),
                    gamesBehind: team.gamesBehind,
                    recent10: team.recent10,
                    streak: team.streak,
                    homeRecord: team.homeRecord,
                    awayRecord: team.awayRecord
                })),
                magicNumbers: serviceData.magicNumbers,
                lastMagicUpdate: serviceData.lastUpdated,
                totalTeams: 10,
                source: serviceData.source,
                dataDate: serviceData.dataDate
            };
            
            // 3. magic-number 폴더에 웹서비스 파일들 생성
            if (fs.existsSync('./magic-number')) {
                fs.writeFileSync('./magic-number/kbo-rankings.json', JSON.stringify(rankingsData, null, 2));
                
                // 상대전적 데이터도 업데이트
                const recordsData = {
                    lastUpdated: serviceData.lastUpdated,
                    updateDate: serviceData.updateDate,
                    note: serviceData.note,
                    totalData: serviceData.headToHead,
                    source: serviceData.source,
                    dataDate: serviceData.dataDate
                };
                
                fs.writeFileSync('./magic-number/kbo-records.json', JSON.stringify(recordsData, null, 2));
                console.log('  ✅ magic-number 폴더 파일들 업데이트 완료');
            }
            
        } catch (error) {
            console.error('❌ 파일 저장 실패:', error.message);
            throw error;
        }
    }

    // 유틸리티 함수들
    formatRecent10(games) {
        const wins = games.filter(g => g === '승').length;
        const losses = games.filter(g => g === '패').length;
        const draws = games.filter(g => g === '무').length;
        
        return `${wins}승${draws > 0 ? draws + '무' : ''}${losses}패`;
    }

    calculateStreak(recent) {
        if (recent.length === 0) return { type: '', count: 0 };
        
        const lastResult = recent[recent.length - 1];
        let count = 1;
        
        for (let i = recent.length - 2; i >= 0; i--) {
            if (recent[i] === lastResult) {
                count++;
            } else {
                break;
            }
        }
        
        return { type: lastResult, count: count };
    }

    formatStreak(streak) {
        if (streak.count === 0) return '-';
        return `${streak.count}${streak.type}`;
    }

    // 메인 실행 함수
    async run() {
        try {
            console.log('🚀 KBO 데이터 완전 자동화 처리 시작...\n');
            
            // 1단계: 데이터 파싱
            const parseResult = this.parseGameData();
            
            // 2단계: 통계 계산
            this.calculateTeamStats();
            
            // 3단계: 상대전적 계산
            this.calculateHeadToHead();
            
            // 4단계: 잔여경기 계산
            this.calculateRemainingGames();
            
            // 5단계: 순위 계산
            this.calculateStandings();
            
            // 6단계: 매직넘버 계산
            this.calculateMagicNumbers();
            
            // 7단계: 서비스 데이터 생성
            const serviceData = this.generateServiceData();
            
            // 8단계: 파일 저장
            await this.saveAllData(serviceData);
            
            console.log('\n🎉 KBO 데이터 완전 자동화 처리 완료!');
            console.log(`📊 총 ${parseResult.gameCount}경기 처리`);
            console.log(`📅 최신 데이터: ${parseResult.lastDate}`);
            console.log('📁 생성된 파일:');
            console.log('   - output/service-data.json (통합 데이터)');
            console.log('   - magic-number/kbo-rankings.json (웹서비스용 순위)');
            console.log('   - magic-number/kbo-records.json (웹서비스용 상대전적)');
            
        } catch (error) {
            console.error('\n❌ 처리 중 오류 발생:', error.message);
            process.exit(1);
        }
    }
}

// 실행
if (require.main === module) {
    const processor = new KBODataProcessor();
    processor.run();
}

module.exports = KBODataProcessor;