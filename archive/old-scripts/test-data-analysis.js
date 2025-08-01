const fs = require('fs');

const data = fs.readFileSync('2025-season-data.txt', 'utf8');
const lines = data.split('\n');

console.log('📊 데이터 분석:');
console.log('총 라인수:', lines.length);

let games = 0;
let currentDate = '';
const teams = ['한화','LG','롯데','SSG','KT','KIA','삼성','NC','두산','키움'];

// 실제 경기 결과를 찾기 위한 개선된 로직
for (let i = 0; i < lines.length - 20; i++) {
    const line = lines[i].trim();
    
    // 날짜 체크
    const dateMatch = line.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        currentDate = `${month}월 ${day}일`;
        
        // 정규시즌만 (3월 22일부터)
        const isRegularSeason = (month > 3) || (month === 3 && day >= 22);
        if (isRegularSeason) {
            console.log(`🏁 정규시즌 날짜: ${currentDate}`);
        }
        continue;
    }
    
    // 경기 종료 블록 찾기
    if (line === '종료' && currentDate) {
        // 종료 후 20줄 내에서 경기 데이터 찾기
        let team1 = null, team2 = null, score1 = null, score2 = null;
        
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
            const checkLine = lines[j].trim();
            
            // 팀명 찾기
            if (teams.includes(checkLine)) {
                if (!team1) {
                    team1 = checkLine;
                } else if (!team2 && checkLine !== team1) {
                    team2 = checkLine;
                }
            }
            
            // 스코어 찾기
            if (checkLine === '스코어' && j + 1 < lines.length) {
                const scoreValue = parseInt(lines[j + 1].trim());
                if (!isNaN(scoreValue)) {
                    if (score1 === null) {
                        score1 = scoreValue;
                    } else if (score2 === null) {
                        score2 = scoreValue;
                        break; // 두 스코어 다 찾았으면 종료
                    }
                }
            }
        }
        
        // 유효한 경기인지 확인
        if (team1 && team2 && score1 !== null && score2 !== null) {
            games++;
            const month = parseInt(currentDate.split('월')[0]);
            const day = parseInt(currentDate.split('월')[1].split('일')[0]);
            const isRegularSeason = (month > 3) || (month === 3 && day >= 22);
            
            if (games <= 10 || games % 50 === 0) {
                console.log(`경기 ${games}: ${currentDate} - ${team1} ${score1}:${score2} ${team2} ${isRegularSeason ? '(정규시즌)' : '(시범경기)'}`);
            }
        }
    }
}

console.log(`\n✅ 총 감지된 경기수: ${games}개`);

// 정규시즌만 카운트
let regularSeasonGames = 0;
for (let i = 0; i < lines.length - 20; i++) {
    const line = lines[i].trim();
    
    const dateMatch = line.match(/(\d{1,2})월\s*(\d{1,2})일/);
    if (dateMatch) {
        const month = parseInt(dateMatch[1]);
        const day = parseInt(dateMatch[2]);
        currentDate = `${month}월 ${day}일`;
        continue;
    }
    
    if (line === '종료' && currentDate) {
        const month = parseInt(currentDate.split('월')[0]);
        const day = parseInt(currentDate.split('월')[1].split('일')[0]);
        const isRegularSeason = (month > 3) || (month === 3 && day >= 22);
        
        if (isRegularSeason) {
            let team1 = null, team2 = null, score1 = null, score2 = null;
            
            for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
                const checkLine = lines[j].trim();
                
                if (teams.includes(checkLine)) {
                    if (!team1) {
                        team1 = checkLine;
                    } else if (!team2 && checkLine !== team1) {
                        team2 = checkLine;
                    }
                }
                
                if (checkLine === '스코어' && j + 1 < lines.length) {
                    const scoreValue = parseInt(lines[j + 1].trim());
                    if (!isNaN(scoreValue)) {
                        if (score1 === null) {
                            score1 = scoreValue;
                        } else if (score2 === null) {
                            score2 = scoreValue;
                            break;
                        }
                    }
                }
            }
            
            if (team1 && team2 && score1 !== null && score2 !== null) {
                regularSeasonGames++;
            }
        }
    }
}

console.log(`📊 정규시즌 경기수: ${regularSeasonGames}개`);