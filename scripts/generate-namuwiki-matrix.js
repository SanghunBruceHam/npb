#!/usr/bin/env node

/**
 * 나무위키 스타일 매직넘버 매트릭스 데이터 생성기
 * service-data.json을 기반으로 매트릭스 데이터 생성
 */

const fs = require('fs');
const path = require('path');

class NamuwikiMatrixGenerator {
    constructor() {
        this.serviceData = null;
        this.outputPath = path.join(__dirname, '../magic-number/namuwiki-data.json');
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
                logo: `../images/${this.getTeamLogoFileName(team.team)}`,
                rank: team.rank,
                magicNumbers: magicNumbers
            };
        });

        return teams;
    }

    // 개별 매직넘버 계산
    calculateMagicNumber(team, targetRank) {
        const currentRank = team.rank;
        const magicData = this.serviceData.magicNumbers[team.team];
        
        if (!magicData) return null;

        let value, type;

        if (targetRank === 1) {
            // 1위 매직넘버
            value = magicData.championship;
            type = value === 999 ? 'eliminated' : 
                   value === 0 ? 'clinched' : 
                   value <= 5 ? 'magic' : 'competitive';
        } else if (targetRank <= 5) {
            // 플레이오프 매직넘버 (2-5위)
            value = magicData.playoff;
            type = value === 999 ? 'eliminated' : 
                   value === 0 ? 'clinched' : 
                   value <= 10 ? 'magic' : 'competitive';
        } else {
            // 하위권 매직넘버 (6-9위)
            const remainingGames = magicData.remainingGames;
            const maxPossibleWins = magicData.maxPossibleWins;
            
            // 순위별 예상 필요 승수 (대략적 계산)
            const rankThresholds = {
                6: 85,  // 6위 예상 승수
                7: 80,  // 7위 예상 승수
                8: 75,  // 8위 예상 승수
                9: 70   // 9위 예상 승수
            };
            
            const targetWins = rankThresholds[targetRank] || 70;
            value = Math.max(0, targetWins - team.wins);
            
            type = value === 0 ? 'clinched' : 
                   value <= remainingGames * 0.3 ? 'magic' : 
                   value <= remainingGames * 0.7 ? 'competitive' : 'tragic';
        }

        return { value, type };
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
    const generator = new NamuwikiMatrixGenerator();
    generator.generate();
}

module.exports = NamuwikiMatrixGenerator;