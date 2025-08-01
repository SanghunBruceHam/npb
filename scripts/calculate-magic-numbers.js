#!/usr/bin/env node

/**
 * KBO 매직넘버 계산 스크립트
 */

const fs = require('fs');

class MagicNumberCalculator {
    constructor() {
        this.totalGames = 144; // KBO 정규시즌 총 경기 수
        this.playoffSpots = 5; // 플레이오프 진출 팀 수
    }

    loadRankingsData() {
        try {
            const data = fs.readFileSync('./kbo-rankings.json', 'utf8');
            const parsed = JSON.parse(data);
            return parsed.rankings || [];
        } catch (error) {
            console.error('❌ 순위 데이터 로드 실패:', error.message);
            return [];
        }
    }

    calculateAdvancedMagicNumbers(teams) {
        console.log('🔮 고급 매직넘버 계산 중...');
        
        const magicNumbers = {};
        
        teams.forEach((team, index) => {
            const remainingGames = this.totalGames - team.games;
            const maxPossibleWins = team.wins + remainingGames;
            
            // 플레이오프 진출 매직넘버
            let playoffMagic = this.calculatePlayoffMagic(team, teams, index);
            
            // 우승 매직넘버
            let championshipMagic = this.calculateChampionshipMagic(team, teams, index);
            
            // 탈락 매직넘버
            let eliminationMagic = this.calculateEliminationMagic(team, teams, index);
            
            // 홈 어드밴티지 매직넘버 (2위 확정)
            let homeAdvantage = this.calculateHomeAdvantageMagic(team, teams, index);
            
            magicNumbers[team.team] = {
                playoff: playoffMagic,
                championship: championshipMagic,
                elimination: eliminationMagic,
                homeAdvantage: homeAdvantage,
                remainingGames: remainingGames,
                maxPossibleWins: maxPossibleWins,
                currentRank: team.rank
            };
            
            console.log(`  🎯 ${team.team} (${team.rank}위):`);
            console.log(`     플레이오프: ${playoffMagic}, 우승: ${championshipMagic}`);
            console.log(`     홈어드밴티지: ${homeAdvantage}, 탈락: ${eliminationMagic}`);
        });
        
        return magicNumbers;
    }

    calculatePlayoffMagic(team, teams, index) {
        if (index < this.playoffSpots) {
            // 현재 플레이오프 권 내 - 플레이오프 확정까지
            const sixthPlace = teams[this.playoffSpots];
            if (!sixthPlace) return 0;
            
            const sixthMaxWins = sixthPlace.wins + (this.totalGames - sixthPlace.games);
            return Math.max(0, sixthMaxWins - team.wins + 1);
        } else {
            // 플레이오프 권 밖 - 플레이오프 진출까지
            const fifthPlace = teams[this.playoffSpots - 1];
            const maxPossibleWins = team.wins + (this.totalGames - team.games);
            
            if (maxPossibleWins <= fifthPlace.wins) {
                return 999; // 수학적으로 불가능
            }
            
            return Math.max(0, fifthPlace.wins - team.wins + 1);
        }
    }

    calculateChampionshipMagic(team, teams, index) {
        if (index === 0) {
            // 현재 1위 - 우승 확정까지
            const secondPlace = teams[1];
            if (!secondPlace) return 0;
            
            const secondMaxWins = secondPlace.wins + (this.totalGames - secondPlace.games);
            return Math.max(0, secondMaxWins - team.wins + 1);
        } else {
            // 1위가 아님 - 1위 추월까지
            const firstPlace = teams[0];
            const maxPossibleWins = team.wins + (this.totalGames - team.games);
            
            if (maxPossibleWins <= firstPlace.wins) {
                return 999; // 수학적으로 불가능
            }
            
            return Math.max(0, firstPlace.wins - team.wins + 1);
        }
    }

    calculateEliminationMagic(team, teams, index) {
        if (index < this.playoffSpots) {
            // 플레이오프 권 내 - 플레이오프 탈락까지
            const sixthPlace = teams[this.playoffSpots];
            if (!sixthPlace) return 999;
            
            const remainingGames = this.totalGames - team.games;
            const minPossibleWins = team.wins; // 남은 경기를 모두 진다고 가정
            const sixthMinWins = sixthPlace.wins; // 6위팀이 남은 경기를 모두 진다고 가정
            
            if (minPossibleWins > sixthMinWins) {
                return 999; // 플레이오프는 확정
            }
            
            return Math.max(0, remainingGames - (team.wins - sixthPlace.wins) + 1);
        } else {
            // 플레이오프 권 밖 - 플레이오프 진출 불가까지
            const fifthPlace = teams[this.playoffSpots - 1];
            const remainingGames = this.totalGames - team.games;
            const maxPossibleWins = team.wins + remainingGames;
            
            if (maxPossibleWins > fifthPlace.wins) {
                return Math.max(0, fifthPlace.wins - team.wins + 1);
            }
            
            return 0; // 이미 탈락
        }
    }

    calculateHomeAdvantageMagic(team, teams, index) {
        if (index <= 1) {
            // 현재 1-2위 - 홈 어드밴티지 확정까지
            const thirdPlace = teams[2];
            if (!thirdPlace) return 0;
            
            const thirdMaxWins = thirdPlace.wins + (this.totalGames - thirdPlace.games);
            return Math.max(0, thirdMaxWins - team.wins + 1);
        } else {
            // 3위 이하 - 2위 진입까지
            const secondPlace = teams[1];
            const maxPossibleWins = team.wins + (this.totalGames - team.games);
            
            if (maxPossibleWins <= secondPlace.wins) {
                return 999; // 수학적으로 불가능
            }
            
            return Math.max(0, secondPlace.wins - team.wins + 1);
        }
    }

    saveUpdatedData(magicNumbers) {
        try {
            // 기존 데이터 로드
            const data = JSON.parse(fs.readFileSync('./kbo-rankings.json', 'utf8'));
            
            // 매직넘버 업데이트
            data.magicNumbers = magicNumbers;
            data.lastMagicUpdate = new Date().toISOString();
            
            // 저장
            fs.writeFileSync('./kbo-rankings.json', JSON.stringify(data, null, 2));
            
            // magic-number 폴더에도 저장
            if (fs.existsSync('./magic-number')) {
                fs.writeFileSync('./magic-number/kbo-rankings.json', JSON.stringify(data, null, 2));
            }
            
            console.log('✅ 매직넘버 데이터 업데이트 완료');
            
        } catch (error) {
            console.error('❌ 데이터 저장 실패:', error.message);
        }
    }

    async calculate() {
        console.log('🚀 매직넘버 계산 시작...\n');
        
        const teams = this.loadRankingsData();
        
        if (teams.length === 0) {
            console.log('⚠️ 순위 데이터가 없습니다.');
            return;
        }
        
        const magicNumbers = this.calculateAdvancedMagicNumbers(teams);
        this.saveUpdatedData(magicNumbers);
        
        console.log('\n🎉 매직넘버 계산 완료!');
    }
}

// 실행
async function main() {
    const calculator = new MagicNumberCalculator();
    await calculator.calculate();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MagicNumberCalculator;