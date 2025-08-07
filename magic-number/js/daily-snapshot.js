#!/usr/bin/env node

/**
 * KBO 일일 순위 스냅샷 저장 시스템
 * 매일의 순위표, 매직넘버, 변화 상황을 기록하여 히스토리 구축
 */

const fs = require('fs');
const path = require('path');
const pathManager = require('../../config/paths');

class DailySnapshotManager {
    constructor() {
        this.historyDir = path.join(pathManager.magicNumberRoot, 'history');
        this.dailyDir = path.join(this.historyDir, 'daily');
        this.monthlyDir = path.join(this.historyDir, 'monthly');
        
        // 히스토리 디렉토리 생성
        pathManager.ensureDir(this.historyDir);
        pathManager.ensureDir(this.dailyDir);
        pathManager.ensureDir(this.monthlyDir);
        
        console.log('📊 KBO 일일 스냅샷 매니저 초기화 완료');
        console.log(`📁 히스토리 저장 경로: ${this.historyDir}`);
    }

    // 현재 서비스 데이터 로드 (상세 통계 포함)
    loadCurrentData() {
        try {
            const serviceDataPath = pathManager.getDataFile('service-data.json');
            if (!pathManager.exists(serviceDataPath)) {
                throw new Error('현재 서비스 데이터가 존재하지 않습니다. npm run process를 먼저 실행하세요.');
            }

            const serviceData = JSON.parse(fs.readFileSync(serviceDataPath, 'utf8'));
            console.log(`✅ 현재 데이터 로드: ${serviceData.dataDate} (${serviceData.totalGames}경기)`);
            
            // 상세 통계도 포함하여 출력
            this.printDetailedStats(serviceData);
            
            return serviceData;
        } catch (error) {
            console.error('❌ 현재 데이터 로드 실패:', error.message);
            throw error;
        }
    }

    // 상세 통계 출력 (process-season-data.js와 동일한 형식)
    printDetailedStats(serviceData) {
        console.log('📊 팀별 통계 계산 중...');
        console.log(`  🎮 처리할 경기 수: ${serviceData.totalGames}`);
        
        // 순위표 출력
        serviceData.standings.forEach(team => {
            const draws = team.draws || 0;
            const winRate = team.winRate.toFixed(3);
            console.log(`  📈 ${team.team}: ${team.games}경기 ${team.wins}승${team.losses}패${draws}무 (.${winRate})`);
        });

        console.log('⚔️ 상대전적 계산 중...');
        console.log('  ⚔️ 상대전적 매트릭스 완성');
        serviceData.standings.forEach(team => {
            console.log(`    ${team.team}: 총 ${team.games}경기`);
        });

        console.log('📅 잔여경기 계산 중...');
        serviceData.standings.forEach(team => {
            console.log(`  📅 ${team.team}: ${team.remainingGames}경기 남음`);
        });

        console.log('🏆 순위 계산 중...');
        console.log('  🏆 순위표 완성:');
        serviceData.standings.forEach(team => {
            const draws = team.draws || 0;
            const winRate = team.winRate.toFixed(3);
            console.log(`    ${team.rank}위 ${team.team} (${team.wins}-${team.losses}-${draws}, .${winRate})`);
        });

        console.log('🔮 매직넘버 계산 중...');
        Object.entries(serviceData.magicNumbers).forEach(([teamName, magicNumber]) => {
            const team = serviceData.standings.find(t => t.team === teamName);
            const playoffMN = magicNumber.playoff === 999 ? '999' : magicNumber.playoff;
            const championshipMN = magicNumber.championship === 0 ? '0' : magicNumber.championship;
            console.log(`  🎯 ${teamName} (${team?.rank}위): PO ${playoffMN}, 우승 ${championshipMN}`);
        });
    }

    // 어제 스냅샷 로드 (변화 계산용)
    loadPreviousSnapshot(targetDate) {
        const yesterday = this.getYesterday(targetDate);
        const yesterdayFile = path.join(this.dailyDir, `${yesterday}.json`);
        
        if (pathManager.exists(yesterdayFile)) {
            try {
                const previousData = JSON.parse(fs.readFileSync(yesterdayFile, 'utf8'));
                console.log(`📋 어제 데이터 로드: ${yesterday}`);
                return previousData;
            } catch (error) {
                console.warn(`⚠️ 어제 데이터 로드 실패: ${error.message}`);
                return null;
            }
        } else {
            console.log(`📋 어제 데이터 없음: ${yesterday}`);
            return null;
        }
    }

    // 어제 날짜 계산
    getYesterday(dateString) {
        const date = new Date(dateString);
        date.setDate(date.getDate() - 1);
        return date.toISOString().split('T')[0];
    }

    // 순위 변화 계산
    calculateRankChanges(currentStandings, previousSnapshot) {
        if (!previousSnapshot || !previousSnapshot.snapshot.standings) {
            console.log('📊 이전 데이터 없음 - 순위 변화 계산 생략');
            return [];
        }

        const changes = [];
        const previousRankings = {};
        
        // 이전 순위 맵핑
        previousSnapshot.snapshot.standings.forEach(team => {
            previousRankings[team.team] = team.rank;
        });

        // 현재 순위와 비교
        currentStandings.forEach(team => {
            const previousRank = previousRankings[team.team];
            if (previousRank && previousRank !== team.rank) {
                const change = previousRank - team.rank; // 양수면 상승, 음수면 하락
                changes.push({
                    team: team.team,
                    from: previousRank,
                    to: team.rank,
                    change: change > 0 ? `+${change}` : change.toString(),
                    direction: change > 0 ? 'up' : 'down'
                });
            }
        });

        console.log(`📈 순위 변화: ${changes.length}개 팀 변동`);
        return changes;
    }

    // 매직넘버 변화 계산
    calculateMagicNumberChanges(currentMagicNumbers, previousSnapshot) {
        if (!previousSnapshot || !previousSnapshot.snapshot.magicNumbers) {
            return [];
        }

        const changes = [];
        const previousMagicNumbers = previousSnapshot.snapshot.magicNumbers;

        Object.keys(currentMagicNumbers).forEach(team => {
            const current = currentMagicNumbers[team];
            const previous = previousMagicNumbers[team];

            if (previous) {
                // 플레이오프 매직넘버 변화
                if (current.playoff !== previous.playoff) {
                    changes.push({
                        team: team,
                        type: 'playoff',
                        from: previous.playoff,
                        to: current.playoff,
                        change: current.playoff - previous.playoff
                    });
                }

                // 우승 매직넘버 변화
                if (current.championship !== previous.championship) {
                    changes.push({
                        team: team,
                        type: 'championship',
                        from: previous.championship,
                        to: current.championship,
                        change: current.championship - previous.championship
                    });
                }
            }
        });

        return changes;
    }

    // 경기 요약 정보 계산
    calculateGamesSummary(currentData, previousSnapshot) {
        const summary = {
            totalGames: currentData.totalGames,
            dataDate: currentData.dataDate,
            gamesPlayedSinceYesterday: 0
        };

        if (previousSnapshot) {
            summary.gamesPlayedSinceYesterday = currentData.totalGames - (previousSnapshot.snapshot.gamesSummary?.totalGames || 0);
        }

        return summary;
    }

    // 일일 스냅샷 생성
    createDailySnapshot(targetDate = null) {
        try {
            console.log('📸 일일 스냅샷 생성 시작...');
            
            // 현재 데이터 로드
            const currentData = this.loadCurrentData();
            const snapshotDate = targetDate || currentData.dataDate || new Date().toISOString().split('T')[0];
            
            // 이전 스냅샷 로드
            const previousSnapshot = this.loadPreviousSnapshot(snapshotDate);
            
            // 변화 계산
            const rankChanges = this.calculateRankChanges(currentData.standings, previousSnapshot);
            const magicNumberChanges = this.calculateMagicNumberChanges(currentData.magicNumbers, previousSnapshot);
            const gamesSummary = this.calculateGamesSummary(currentData, previousSnapshot);
            
            // 스냅샷 구조 생성
            const snapshot = {
                date: snapshotDate,
                createdAt: new Date().toISOString(),
                snapshot: {
                    standings: currentData.standings,
                    magicNumbers: currentData.magicNumbers,
                    gamesSummary: gamesSummary,
                    changes: {
                        rankChanges: rankChanges,
                        magicNumberChanges: magicNumberChanges
                    },
                    metadata: {
                        source: currentData.source,
                        lastUpdated: currentData.lastUpdated,
                        totalTeams: currentData.standings.length
                    }
                }
            };

            // 파일 저장
            const snapshotFile = path.join(this.dailyDir, `${snapshotDate}.json`);
            fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2));
            
            console.log(`✅ 스냅샷 저장 완료: ${snapshotFile}`);
            console.log(`📊 변화 요약:`);
            console.log(`   - 순위 변동: ${rankChanges.length}개 팀`);
            console.log(`   - 매직넘버 변화: ${magicNumberChanges.length}개 변화`);
            console.log(`   - 새로운 경기: ${gamesSummary.gamesPlayedSinceYesterday}경기`);
            
            // 상세한 변화 정보 출력
            if (rankChanges.length > 0) {
                console.log(`📈 순위 변화 상세:`);
                rankChanges.forEach(change => {
                    const arrow = change.direction === 'up' ? '⬆️' : '⬇️';
                    console.log(`   ${arrow} ${change.team}: ${change.from}위 → ${change.to}위 (${change.change})`);
                });
            }
            
            if (magicNumberChanges.length > 0) {
                console.log(`🔮 매직넘버 변화 상세:`);
                magicNumberChanges.forEach(change => {
                    const changeText = change.change > 0 ? `+${change.change}` : change.change;
                    console.log(`   🎯 ${change.team} ${change.type}: ${change.from} → ${change.to} (${changeText})`);
                });
            }
            
            // 월별 요약도 업데이트
            this.updateMonthlySummary(snapshotDate, snapshot);
            
            return snapshot;
            
        } catch (error) {
            console.error('❌ 스냅샷 생성 실패:', error.message);
            throw error;
        }
    }

    // 월별 요약 업데이트
    updateMonthlySummary(date, snapshot) {
        try {
            const [year, month] = date.split('-');
            const monthKey = `${year}-${month}`;
            const monthlyFile = path.join(this.monthlyDir, `${monthKey}.json`);
            
            // 기존 월별 데이터 로드 또는 초기화
            let monthlyData = {
                month: monthKey,
                year: parseInt(year),
                monthNumber: parseInt(month),
                dailySnapshots: {},
                summary: {
                    totalDays: 0,
                    rankingChanges: {},
                    playoffRace: {}
                }
            };

            if (pathManager.exists(monthlyFile)) {
                monthlyData = JSON.parse(fs.readFileSync(monthlyFile, 'utf8'));
            }

            // 일일 데이터 추가
            monthlyData.dailySnapshots[date] = {
                dataDate: snapshot.snapshot.gamesSummary.dataDate,
                totalGames: snapshot.snapshot.gamesSummary.totalGames,
                rankChanges: snapshot.snapshot.changes.rankChanges.length,
                standings: snapshot.snapshot.standings.map(team => ({
                    team: team.team,
                    rank: team.rank,
                    wins: team.wins,
                    losses: team.losses
                }))
            };

            // 요약 정보 업데이트
            monthlyData.summary.totalDays = Object.keys(monthlyData.dailySnapshots).length;
            monthlyData.lastUpdated = new Date().toISOString();

            // 월별 파일 저장
            fs.writeFileSync(monthlyFile, JSON.stringify(monthlyData, null, 2));
            console.log(`📅 월별 요약 업데이트: ${monthKey}`);
            
        } catch (error) {
            console.warn(`⚠️ 월별 요약 업데이트 실패: ${error.message}`);
        }
    }

    // 최근 N일간 히스토리 조회
    getRecentHistory(days = 7) {
        try {
            const files = fs.readdirSync(this.dailyDir)
                .filter(file => file.endsWith('.json'))
                .sort()
                .slice(-days);

            const history = files.map(file => {
                const filePath = path.join(this.dailyDir, file);
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            });

            console.log(`📋 최근 ${days}일 히스토리 로드: ${history.length}개`);
            return history;
            
        } catch (error) {
            console.error('❌ 히스토리 로드 실패:', error.message);
            return [];
        }
    }

    // 특정 팀의 순위 변동 추이
    getTeamRankingTrend(teamName, days = 30) {
        const history = this.getRecentHistory(days);
        
        return history.map(snapshot => ({
            date: snapshot.date,
            rank: snapshot.snapshot.standings.find(team => team.team === teamName)?.rank || null,
            wins: snapshot.snapshot.standings.find(team => team.team === teamName)?.wins || null,
            winRate: snapshot.snapshot.standings.find(team => team.team === teamName)?.winRate || null
        })).filter(entry => entry.rank !== null);
    }

    // 히스토리 통계 출력
    printHistoryStats() {
        try {
            const dailyFiles = fs.readdirSync(this.dailyDir).filter(f => f.endsWith('.json'));
            const monthlyFiles = fs.readdirSync(this.monthlyDir).filter(f => f.endsWith('.json'));

            console.log('\n📊 히스토리 통계');
            console.log('='.repeat(30));
            console.log(`📅 일일 스냅샷: ${dailyFiles.length}개`);
            console.log(`📆 월별 요약: ${monthlyFiles.length}개`);
            
            if (dailyFiles.length > 0) {
                const oldestFile = dailyFiles[0].replace('.json', '');
                const newestFile = dailyFiles[dailyFiles.length - 1].replace('.json', '');
                console.log(`📋 기간: ${oldestFile} ~ ${newestFile}`);
            }
            
        } catch (error) {
            console.error('❌ 통계 출력 실패:', error.message);
        }
    }

    // 메인 실행 함수
    async run(command = 'snapshot', options = {}) {
        try {
            switch (command) {
                case 'snapshot':
                    return this.createDailySnapshot(options.date);
                
                case 'history':
                    const days = options.days || 7;
                    return this.getRecentHistory(days);
                
                case 'trend':
                    if (!options.team) {
                        throw new Error('팀 이름이 필요합니다: --team 한화');
                    }
                    return this.getTeamRankingTrend(options.team, options.days);
                
                case 'stats':
                    this.printHistoryStats();
                    return;
                
                default:
                    console.log('사용법: node daily-snapshot.js [snapshot|history|trend|stats] [options]');
                    console.log('예시:');
                    console.log('  node daily-snapshot.js snapshot');
                    console.log('  node daily-snapshot.js history --days 10');
                    console.log('  node daily-snapshot.js trend --team 한화 --days 30');
                    console.log('  node daily-snapshot.js stats');
            }
            
        } catch (error) {
            console.error('❌ 실행 실패:', error.message);
            process.exit(1);
        }
    }
}

// CLI 실행
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'snapshot';
    
    // 옵션 파싱
    const options = {};
    for (let i = 1; i < args.length; i += 2) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1];
            options[key] = isNaN(value) ? value : parseInt(value);
        }
    }
    
    const manager = new DailySnapshotManager();
    manager.run(command, options);
}

module.exports = DailySnapshotManager;