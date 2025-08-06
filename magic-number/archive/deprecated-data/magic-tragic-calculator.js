// KBO 매직넘버 & 트래직넘버 계산기
// 2025년 8월 6일 기준 데이터

const kboTeamsData = {
    "LG": { wins: 62, losses: 40, draws: 2, games: 104, remaining: 40, maxWins: 102 },
    "한화": { wins: 59, losses: 39, draws: 3, games: 101, remaining: 43, maxWins: 102 },
    "롯데": { wins: 57, losses: 45, draws: 3, games: 105, remaining: 39, maxWins: 96 },
    "KIA": { wins: 49, losses: 47, draws: 4, games: 100, remaining: 44, maxWins: 93 },
    "SSG": { wins: 50, losses: 48, draws: 4, games: 102, remaining: 42, maxWins: 92 },
    "KT": { wins: 50, losses: 50, draws: 2, games: 102, remaining: 42, maxWins: 92 },
    "NC": { wins: 48, losses: 51, draws: 4, games: 103, remaining: 41, maxWins: 89 },
    "삼성": { wins: 48, losses: 53, draws: 1, games: 102, remaining: 42, maxWins: 90 },
    "두산": { wins: 44, losses: 57, draws: 1, games: 102, remaining: 42, maxWins: 86 },
    "키움": { wins: 40, losses: 59, draws: 5, games: 104, remaining: 40, maxWins: 80 }
};

// 팀 순위별 정렬
const teamsByRank = Object.entries(kboTeamsData)
    .sort(([,a], [,b]) => {
        const aWinRate = a.wins / (a.wins + a.losses);
        const bWinRate = b.wins / (b.wins + b.losses);
        if (bWinRate !== aWinRate) return bWinRate - aWinRate;
        return b.wins - a.wins;
    })
    .map(([name, data], index) => ({ name, ...data, rank: index + 1 }));

console.log("📊 현재 KBO 순위:");
teamsByRank.forEach(team => {
    console.log(`${team.rank}위 ${team.name}: ${team.wins}-${team.losses}-${team.draws} (최대 ${team.maxWins}승 가능)`);
});

/**
 * 매직넘버 계산
 * @param {Object} team - 계산할 팀
 * @param {number} targetRank - 목표 순위 (1-10)
 * @returns {number} - 매직넘버 (999 = 불가능, 0 = 확정)
 */
function calculateMagicNumber(team, targetRank) {
    const currentWins = team.wins;
    const remainingGames = team.remaining;
    const maxPossibleWins = team.maxWins;
    
    if (targetRank === 1) {
        // 1위 달성: 2위팀의 최대 승수와 동점이면 승부차로 1위 가능
        const otherTeamsMaxWins = teamsByRank
            .filter(t => t.name !== team.name)
            .map(t => t.maxWins);
        const highestOtherMax = Math.max(...otherTeamsMaxWins);
        
        const winsNeeded = highestOtherMax; // 동점으로도 1위 가능 (승부차)
        
        if (winsNeeded > maxPossibleWins) return 999; // 불가능
        if (currentWins >= winsNeeded) return 0; // 이미 확정
        return winsNeeded - currentWins;
    }
    
    if (targetRank === 10) {
        // 10위는 항상 달성 가능 (최하위)
        return 0;
    }
    
    // N위 달성: 상위 (N-1)개 팀은 놔두고, 나머지 하위팀들보다 앞서기
    const otherTeams = teamsByRank.filter(t => t.name !== team.name);
    
    // 다른 팀들을 최대 승수 기준으로 내림차순 정렬
    const sortedByMaxWins = otherTeams.sort((a, b) => b.maxWins - a.maxWins);
    
    // N위가 되려면 (targetRank-1)번째로 강한 팀의 승수를 넘어야 함
    // 즉, N-1개 팀을 제외하고 가장 강한 팀보다 많이 이기기
    const indexTobeat = targetRank - 1; // 0-based index
    
    if (indexTobeat < sortedByMaxWins.length) {
        const competitorMaxWins = sortedByMaxWins[indexTobeat].maxWins;
        const winsNeeded = competitorMaxWins + 1;
        
        if (winsNeeded > maxPossibleWins) return 999; // 불가능
        if (currentWins >= winsNeeded) return 0; // 이미 확정
        return winsNeeded - currentWins;
    }
    
    return 0; // 충분한 경쟁팀이 없음
}

/**
 * 트래직넘버 계산
 * @param {Object} team - 계산할 팀
 * @param {number} targetRank - 목표 순위 (1-10)
 * @returns {number} - 트래직넘버 (999 = 이미 탈락, 0 = 탈락 불가능)
 */
function calculateTragicNumber(team, targetRank) {
    const currentWins = team.wins;
    const currentLosses = team.losses;
    const remainingGames = team.remaining;
    const maxPossibleWins = team.maxWins;
    
    if (targetRank === 10) {
        // 10위 탈락은 없음 (전체 10팀이므로 최소 10위는 보장)
        return 0;
    }
    
    // N위에서 탈락: (N+1)위 이하로 떨어질 위험
    // 즉, 하위팀이 우리를 추월할 수 있는 상황
    
    const otherTeams = teamsByRank.filter(t => t.name !== team.name);
    
    // 우리보다 아래 있으면서 우리를 추월할 수 있는 팀들 찾기
    const potentialThreatTeams = otherTeams.filter(t => {
        // 현재 우리보다 승수가 적거나 같으면서, 최대 승수로 우리를 추월 가능한 팀
        return t.maxWins > currentWins;
    }).sort((a, b) => b.maxWins - a.maxWins); // 최대 승수 내림차순
    
    if (potentialThreatTeams.length === 0) {
        return 0; // 추월할 팀이 없음
    }
    
    // N위에서 탈락하려면, (10-N+1)개 이상의 팀이 우리를 추월해야 함
    const teamsNeededToPass = Math.max(1, 10 - targetRank + 1);
    
    if (potentialThreatTeams.length < teamsNeededToPass) {
        return 0; // 추월할 팀이 부족함
    }
    
    // 가장 위험한 추격팀 (최대 승수가 가장 높은 팀)
    const mostDangerousTeam = potentialThreatTeams[0];
    const threatMaxWins = mostDangerousTeam.maxWins;
    
    // 추격팀이 최대 승수에 도달했을 때, 우리가 동점이상 유지하기 위해 필요한 승수
    const winsNeededToStaySafe = threatMaxWins + 1;
    
    // 현재 승수에서 안전 승수까지 필요한 승수
    const additionalWinsNeeded = Math.max(0, winsNeededToStaySafe - currentWins);
    
    // 남은 경기에서 져도 되는 한계 = 남은경기 - 추가로 이겨야할 경기
    const maxAllowableLosses = remainingGames - additionalWinsNeeded;
    
    if (maxAllowableLosses <= 0) {
        return 999; // 이미 탈락 확정
    }
    
    if (maxAllowableLosses >= remainingGames) {
        return 0; // 모든 경기를 져도 안전
    }
    
    return maxAllowableLosses;
}

// 매트릭스 생성
console.log("\n🎯 KBO 매직넘버 & 트래직넘버 매트릭스");
console.log("=".repeat(80));

// 헤더 출력
let header = "팀명     ";
for (let rank = 1; rank <= 9; rank++) {
    header += `${rank}위    `;
}
console.log(header);
console.log("-".repeat(80));

// 각 팀별 매직넘버/트래직넘버 계산
teamsByRank.forEach(team => {
    let row = `${team.name.padEnd(8)} `;
    
    for (let targetRank = 1; targetRank <= 9; targetRank++) {
        const magic = calculateMagicNumber(team, targetRank);
        const tragic = calculateTragicNumber(team, targetRank);
        
        let display;
        if (team.rank === targetRank) {
            // 현재 순위
            display = `[${team.rank}위]`;
        } else if (magic === 0) {
            display = "확정 ";
        } else if (magic === 999) {
            display = "불가 ";
        } else if (magic <= 3) {
            display = `M${magic}   `;
        } else if (tragic !== 0 && tragic !== 999 && tragic <= 10) {
            display = `T${tragic}   `;
        } else {
            display = `${magic}    `.substring(0, 5);
        }
        
        row += display.padEnd(6);
    }
    
    console.log(row);
});

console.log("\n📋 범례:");
console.log("[N위] = 현재 순위");
console.log("확정   = 이미 확정된 순위");
console.log("불가   = 수학적으로 불가능");
console.log("M숫자  = 매직넘버 (3 이하만 표시)");
console.log("T숫자  = 트래직넘버 (10 이하만 표시)");
console.log("숫자   = 일반 매직넘버");

console.log("\n💡 해석:");
console.log("- 매직넘버: 해당 순위 달성을 위해 추가로 이겨야 할 경기 수");
console.log("- 트래직넘버: 해당 순위에서 탈락하게 되는 패배 수");
console.log("- LG 1위 매직넘버 40: 1위 확정을 위해 40승 더 필요");
console.log("- 한화 1위 매직넘버 43: 1위 달성을 위해 43승 더 필요");