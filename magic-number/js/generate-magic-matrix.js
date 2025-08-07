#!/usr/bin/env node

/**
 * KBO 매직넘버 매트릭스 데이터 생성기 (나무위키 스타일)
 * service-data.json을 기반으로 각 팀이 각 순위에 도달하기 위한 매직넘버/트래직넘버 매트릭스 생성
 */

const fs = require('fs');
const path = require('path');
const pathManager = require('../../config/paths');

class MagicMatrixGenerator {
    constructor() {
        this.serviceData = null;
        this.outputPath = pathManager.getDataFile('magic-matrix-data.json');
    }

    // 서비스 데이터 로드
    loadServiceData() {
        try {
            const dataPath = pathManager.getDataFile('service-data.json');
            if (!pathManager.exists(dataPath)) {
                throw new Error(`서비스 데이터 파일이 존재하지 않습니다: ${dataPath}`);
            }
            this.serviceData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            console.log(`✅ 서비스 데이터 로드 완료: ${dataPath}`);
        } catch (error) {
            console.error('❌ 서비스 데이터 로드 실패:', error);
            throw error;
        }
    }

    /**
     * 특정 팀이 특정 순위에 도달하기 위한 매직넘버/트래직넘버 계산 (개선된 로직)
     * @param {Object} team - 대상 팀 데이터
     * @param {number} targetRank - 목표 순위 (1~10)
     * @param {Array} allTeams - 전체 팀 데이터
     * @returns {Object} - {value: number, type: string}
     */
    calculateRankMagicNumber(team, targetRank, allTeams) {
        // 이미 목표 순위에 도달한 경우
        if (team.rank <= targetRank) {
            return { value: 0, type: 'clinched' };
        }

        // 더 정확한 계산을 위해 목표 순위 팀의 현재 승수 기준으로 계산
        const targetRankTeam = allTeams.find(t => t.rank === targetRank);
        if (!targetRankTeam) {
            return { value: '-', type: 'competitive' };
        }

        // 목표 순위 팀의 최대 가능 승수
        const targetTeamMaxWins = targetRankTeam.wins + targetRankTeam.remainingGames;
        
        // 해당 팀이 목표 순위에 도달하기 위해 필요한 최소 승수
        const requiredWins = targetTeamMaxWins + 1;
        const teamMaxWins = team.wins + team.remainingGames;
        
        // 불가능한 경우 (전승해도 목표 순위 팀을 따라잡을 수 없음)
        if (requiredWins > teamMaxWins) {
            return { value: 999, type: 'eliminated' };
        }
        
        // 매직넘버 계산 (현재 승수에서 필요한 추가 승수)
        const magicNumber = Math.max(0, requiredWins - team.wins);
        
        // 타입 결정 (더 세밀한 구분)
        let type;
        if (magicNumber === 0) {
            type = 'clinched';
        } else if (magicNumber <= 3) {
            type = 'magic';
        } else if (magicNumber <= Math.floor(team.remainingGames * 0.5)) {
            type = 'competitive';
        } else {
            type = 'tragic';
        }
        
        return { value: magicNumber, type: type };
    }


    // 나무위키 스타일 매트릭스 데이터 계산 (순위별)
    calculateMatrixData() {
        const standings = this.serviceData.standings;
        const teams = [];

        standings.forEach(team => {
            const teamData = {
                name: team.team,
                logo: `images/${this.getTeamLogoFileName(team.team)}`,
                rank: team.rank,
                magicNumbers: {}
            };

            // 1위부터 9위까지 각 순위에 대한 매직넘버 계산
            for (let targetRank = 1; targetRank <= 9; targetRank++) {
                const result = this.calculateRankMagicNumber(team, targetRank, standings);
                teamData.magicNumbers[targetRank.toString()] = {
                    value: result.value,
                    type: result.type
                };
            }

            teams.push(teamData);
        });

        return teams;
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
            note: "나무위키 스타일 순위별 매직넘버/트래직넘버",
            type: "rank_based",
            teams: teams,
            teamOrder: this.serviceData.standings.map(t => t.team), // 순위순 팀 목록
            legend: {
                magic: { color: "#7dd87d", label: "매직넘버" },
                competitive: { color: "#ffff7d", label: "경합상황" },
                tragic: { color: "#ff7d7d", label: "트래직넘버" },
                clinched: { color: "#4169e1", label: "이미달성" },
                eliminated: { color: "#808080", label: "불가능" },
                self: { color: "#f0f0f0", label: "자기자신" }
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
            console.log('🚀 나무위키 스타일 매직넘버 매트릭스 데이터 생성 시작...');
            
            this.loadServiceData();
            const matrixData = this.generateMatrixData();
            this.saveMatrixData(matrixData);
            
            console.log('🎉 매트릭스 데이터 생성 완료!');
            console.log(`📊 생성된 팀 수: ${matrixData.teams.length}`);
            console.log(`📅 데이터 기준일: ${matrixData.title}`);
            console.log(`🎯 매트릭스 타입: 팀간 대결 매직넘버 (나무위키 스타일)`);
            
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