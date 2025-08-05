#!/usr/bin/env node

/**
 * KBO 매직넘버 매트릭스 데이터 생성기
 * service-data.json을 기반으로 나무위키 스타일 매트릭스 데이터 생성
 */

const fs = require('fs');
const path = require('path');

class MagicMatrixGenerator {
    constructor() {
        this.serviceData = null;
        this.outputPath = path.join(__dirname, '../magic-number/magic-matrix-data.json');
    }

    // 서비스 데이터 로드
    loadServiceData() {
        try {
            const dataPath = path.join(__dirname, '../magic-number/service-data.json');
            this.serviceData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            console.log('✅ 서비스 데이터 로드 완료');
        } catch (error) {
            console.error('❌ 서비스 데이터 로드 실패:', error);
            throw error;
        }
    }

    // 매트릭스 데이터 계산
    calculateMatrixData() {
        const teams = this.serviceData.standings.map(team => {
            const magicNumbers = {};
            
            // 각 순위별 매직넘버 계산 (9위 → 1위)
            for (let rank = 9; rank >= 1; rank--) {
                const magic = this.calculateMagicNumber(team, rank);
                if (magic !== null) {
                    magicNumbers[rank.toString()] = magic;
                }
            }
            
            return {
                name: team.team,
                logo: `images/${this.getTeamLogoFileName(team.team)}`,
                rank: team.rank,
                magicNumbers: magicNumbers
            };
        });

        return teams;
    }

    // 개별 매직넘버 계산
    calculateMagicNumber(team, targetRank) {
        const allTeams = this.serviceData.standings;
        const currentTeam = allTeams.find(t => t.team === team.team);
        
        if (!currentTeam) return null;

        // targetRank 순위 확정을 위한 매직넘버 계산
        const result = this.calculateRankMagicNumber(currentTeam, targetRank, allTeams);
        
        return result;
    }

    // 특정 순위 확정을 위한 매직넘버 계산
    calculateRankMagicNumber(team, targetRank, allTeams) {
        const currentWins = team.wins;
        const remainingGames = team.remainingGames;
        const maxPossibleWins = currentWins + remainingGames;

        // 다른 모든 팀들의 최대 가능 승수 계산 (자신 제외)
        const otherTeamsMaxWins = allTeams
            .filter(t => t.team !== team.team)
            .map(t => t.wins + t.remainingGames)
            .sort((a, b) => b - a);

        // targetRank 순위를 확정하기 위해 필요한 승수 계산
        let requiredWins;
        
        if (targetRank === 1) {
            // 1위 확정: 다른 팀 중 최고 승수와 같거나 더 많이 이기면 됨
            // 동점시 승부차로 결정되므로, 최고 승수와 같아도 1위 가능
            requiredWins = otherTeamsMaxWins[0];
        } else {
            // N위 확정: 자신보다 아래 순위가 될 팀들(10-N개)의 최대 승수보다 많이 이겨야 함
            const teamsToOutrank = 10 - targetRank; // 자신보다 아래 순위가 될 팀 수
            
            if (teamsToOutrank >= otherTeamsMaxWins.length) {
                // 모든 팀을 이길 필요 없음 (N위가 최하위)
                requiredWins = currentWins; // 이미 확정
            } else {
                // 상위 (teamsToOutrank)개 팀의 최대 승수보다 많아야 함
                requiredWins = otherTeamsMaxWins[teamsToOutrank - 1];
            }
        }

        // 매직넘버 = 필요 승수 - 현재 승수 + 1 (같으면 승부차, 1승 더 이기면 확정)
        let magicNumber;
        if (currentWins > requiredWins) {
            magicNumber = 0; // 이미 확정
        } else if (currentWins === requiredWins) {
            magicNumber = 1; // 1승만 더 이기면 확정
        } else {
            magicNumber = requiredWins - currentWins + 1;
        }
        
        // 불가능한 경우 체크 (최대 가능 승수로도 달성 불가)
        if (requiredWins + 1 > maxPossibleWins) {
            magicNumber = 999; // 불가능
        }

        // 매직넘버가 0이거나 음수인 경우 이미 확정
        if (magicNumber <= 0) {
            magicNumber = 0;
        }

        // 타입 결정
        let type;
        if (magicNumber === 999) {
            type = 'eliminated';
        } else if (magicNumber === 0) {
            type = 'clinched';
        } else if (magicNumber <= 5) {
            type = 'magic';
        } else if (magicNumber <= remainingGames * 0.5) {
            type = 'competitive';
        } else {
            type = 'tragic';
        }

        return { value: magicNumber, type: type };
    }

    // 특정 순위가 이미 확정되었는지 확인
    isRankAlreadySecured(team, targetRank, allTeams) {
        const currentWins = team.wins;
        const otherTeams = allTeams.filter(t => t.team !== team.team);
        
        // targetRank보다 아래 순위가 될 수 있는 팀들의 최대 가능 승수 확인
        const lowerRankTeamsMaxWins = otherTeams
            .map(t => t.wins + t.remainingGames)
            .sort((a, b) => b - a);

        const teamsToDefeat = 10 - targetRank;
        if (teamsToDefeat <= 0) return true;
        
        const thresholdWins = lowerRankTeamsMaxWins[teamsToDefeat - 1] || 0;
        return currentWins > thresholdWins;
    }

    // 팀 로고 파일명 반환
    getTeamLogoFileName(teamName) {
        const logoMap = {
            '한화': 'hanwha.png',
            'LG': 'lg.png',
            '롯데': 'lotte.png',
            'SSG': 'ssg.png',
            'KT': 'kt.png',
            'KIA': 'kia.png',
            '삼성': 'samsung.png',
            'NC': 'nc.png',
            '두산': 'doosan.png',
            '키움': 'kiwoom.png'
        };
        return logoMap[teamName] || 'default.png';
    }

    // 매트릭스 데이터 생성
    generateMatrixData() {
        const teams = this.calculateMatrixData();
        
        // 현재 날짜 및 시간 정보
        const now = new Date();
        const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        
        const matrixData = {
            lastUpdated: koreaTime.toISOString(),
            updateDate: this.serviceData.updateDate,
            title: `${this.serviceData.dataDate.replace(/-/g, '월 ').replace('월 0', '월 ')}일 기준`,
            teams: teams,
            legend: {
                magic: { color: '#7dd87d', label: '매직넘버' },
                competitive: { color: '#ffff7d', label: '경합상황' },
                tragic: { color: '#ff7d7d', label: '트래직넘버' },
                clinched: { color: '#4169e1', label: '확정상황' },
                eliminated: { color: '#808080', label: '탈락확정' }
            }
        };

        return matrixData;
    }

    // 파일 저장
    saveMatrixData(data) {
        try {
            fs.writeFileSync(this.outputPath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`✅ 매트릭스 데이터 저장 완료: ${this.outputPath}`);
        } catch (error) {
            console.error('❌ 매트릭스 데이터 저장 실패:', error);
            throw error;
        }
    }

    // 메인 실행 함수
    async generate() {
        try {
            console.log('🚀 나무위키 매직넘버 매트릭스 데이터 생성 시작...');
            
            this.loadServiceData();
            const matrixData = this.generateMatrixData();
            this.saveMatrixData(matrixData);
            
            console.log('🎉 매트릭스 데이터 생성 완료!');
            console.log(`📊 생성된 팀 수: ${matrixData.teams.length}`);
            console.log(`📅 데이터 기준일: ${matrixData.title}`);
            
        } catch (error) {
            console.error('❌ 매트릭스 데이터 생성 실패:', error);
            process.exit(1);
        }
    }
}

// 직접 실행시 매트릭스 생성
if (require.main === module) {
    const generator = new MagicMatrixGenerator();
    generator.generate();
}

module.exports = MagicMatrixGenerator;