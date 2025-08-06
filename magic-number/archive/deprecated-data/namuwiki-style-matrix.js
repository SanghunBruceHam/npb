// 나무위키 스타일 매직넘버 매트릭스 생성기
// 팀 A가 팀 B를 제치기 위한 매직넘버 계산

const fs = require('fs');
const path = require('path');

// KBO 팀별 성적 데이터 (8월 5일 기준)
const kboTeamsData = {
    "LG": { wins: 62, losses: 40, draws: 2, remaining: 40, rank: 1 },
    "한화": { wins: 59, losses: 39, draws: 3, remaining: 43, rank: 2 },
    "롯데": { wins: 57, losses: 45, draws: 3, remaining: 39, rank: 3 },
    "KIA": { wins: 49, losses: 47, draws: 4, remaining: 44, rank: 4 },
    "SSG": { wins: 50, losses: 48, draws: 4, remaining: 42, rank: 5 },
    "KT": { wins: 51, losses: 50, draws: 4, remaining: 39, rank: 6 },
    "NC": { wins: 46, losses: 47, draws: 6, remaining: 45, rank: 7 },
    "삼성": { wins: 49, losses: 52, draws: 1, remaining: 42, rank: 8 },
    "두산": { wins: 42, losses: 56, draws: 5, remaining: 41, rank: 9 },
    "키움": { wins: 30, losses: 71, draws: 4, remaining: 39, rank: 10 }
};

// 팀 순서 (현재 순위대로)
const teams = Object.keys(kboTeamsData).sort((a, b) => 
    kboTeamsData[a].rank - kboTeamsData[b].rank
);

console.log("📊 현재 KBO 순위:");
teams.forEach(team => {
    const data = kboTeamsData[team];
    console.log(`${data.rank}위 ${team}: ${data.wins}-${data.losses}-${data.draws} (${data.remaining}경기 남음)`);
});

/**
 * 팀 A가 팀 B를 제치기 위한 매직넘버 계산
 * @param {string} teamA - 추격하는 팀
 * @param {string} teamB - 앞서는 팀 
 * @returns {number|string} - 매직넘버 (999 = 불가능, 0 = 이미 앞섬)
 */
function calculateTeamVsTeamMagic(teamA, teamB) {
    const dataA = kboTeamsData[teamA];
    const dataB = kboTeamsData[teamB];
    
    // 이미 A가 B보다 앞서있는 경우
    if (dataA.rank < dataB.rank) {
        return 0; // 이미 앞섬
    }
    
    // 같은 순위인 경우 (승률로 판단)
    if (dataA.rank === dataB.rank) {
        const winRateA = dataA.wins / (dataA.wins + dataA.losses);
        const winRateB = dataB.wins / (dataB.wins + dataB.losses);
        if (winRateA >= winRateB) return 0;
    }
    
    // A의 최대 가능 승수
    const maxWinsA = dataA.wins + dataA.remaining;
    
    // B의 현재 승수 (B가 모든 경기를 져도 이 승수는 유지)
    const currentWinsB = dataB.wins;
    
    // A가 B를 제치려면 B의 현재 승수보다 1승 더 많이 필요
    const winsNeeded = currentWinsB + 1;
    
    // 불가능한 경우
    if (winsNeeded > maxWinsA) {
        return 999; // 불가능
    }
    
    // 이미 조건을 만족하는 경우
    if (dataA.wins >= winsNeeded) {
        return 0; // 이미 조건 달성
    }
    
    // 필요한 추가 승수
    return winsNeeded - dataA.wins;
}

/**
 * 색상 타입 결정
 * @param {number|string} magicNumber 
 * @param {number} remainingGames 
 * @returns {string} 
 */
function getMagicType(magicNumber, remainingGames) {
    if (magicNumber === 0) return 'clinched';        // 이미 달성
    if (magicNumber === 999) return 'eliminated';    // 불가능
    if (magicNumber <= 3) return 'magic';           // 매직넘버
    if (magicNumber <= remainingGames * 0.3) return 'magic';
    if (magicNumber <= remainingGames * 0.6) return 'competitive'; // 경합
    return 'tragic';                                 // 트래직
}

// 나무위키 스타일 매트릭스 생성
console.log("\n🎯 나무위키 스타일 매직넘버 매트릭스");
console.log("(가로: 추격하는 팀, 세로: 제치려는 팀)");
console.log("=".repeat(100));

// 헤더 생성
let header = "팀명    ";
teams.forEach(team => {
    header += `${team.padEnd(6)}`;
});
console.log(header);
console.log("-".repeat(100));

// 매트릭스 테이블 생성
const matrixData = [];

teams.forEach(teamA => {
    let row = `${teamA.padEnd(6)} `;
    const teamAData = { 
        name: teamA, 
        rank: kboTeamsData[teamA].rank,
        magicNumbers: {}
    };
    
    teams.forEach(teamB => {
        if (teamA === teamB) {
            row += " -    ";
            teamAData.magicNumbers[teamB] = { value: "-", type: "self" };
        } else {
            const magic = calculateTeamVsTeamMagic(teamA, teamB);
            const type = getMagicType(magic, kboTeamsData[teamA].remaining);
            
            let display;
            if (magic === 0) {
                display = " 0   ";
            } else if (magic === 999) {
                display = " X   ";
            } else {
                display = ` ${magic}   `.substring(0, 5);
            }
            
            row += display;
            teamAData.magicNumbers[teamB] = { value: magic, type: type };
        }
    });
    
    console.log(row);
    matrixData.push(teamAData);
});

console.log("\n📋 범례:");
console.log("0 = 이미 앞서고 있음");
console.log("숫자 = 해당 팀을 제치기 위해 필요한 승수");  
console.log("X = 수학적으로 불가능");
console.log("- = 자기 자신");

// JSON 형태로 데이터 생성
const finalData = {
    lastUpdated: new Date().toISOString(),
    updateDate: new Date().toLocaleDateString('ko-KR'),
    title: "2025년 8월 5일 기준",
    note: "나무위키 스타일 팀간 대결 매직넘버",
    type: "team_vs_team",
    teams: matrixData,
    legend: {
        magic: { color: "#7dd87d", label: "매직넘버" },
        competitive: { color: "#ffff7d", label: "경합상황" },
        tragic: { color: "#ff7d7d", label: "트래직넘버" },
        clinched: { color: "#4169e1", label: "이미달성" },
        eliminated: { color: "#808080", label: "불가능" },
        self: { color: "#f0f0f0", label: "자기자신" }
    }
};

console.log("\n💡 해석 예시:");
console.log("- 한화가 LG를 제치려면: 매직넘버만큼 더 이기면 됨");
console.log("- 롯데가 한화를 제치려면: 매직넘버만큼 더 이기면 됨");
console.log("- X 표시: 전승해도 해당 팀을 제칠 수 없음");

// 파일로 저장
const outputPath = '../assets/data/namuwiki-style-magic-matrix.json';
fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
console.log(`\n✅ 나무위키 스타일 매트릭스 저장: ${outputPath}`);

module.exports = finalData;