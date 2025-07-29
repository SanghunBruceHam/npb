// 간단한 KBO 데이터 업데이트 스크립트
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function updateKBOData() {
    try {
        console.log('🚀 KBO 데이터 수집 시작...');
        
        // KBO 공식 사이트에서 데이터 가져오기
        const response = await axios.get('https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx');
        const $ = cheerio.load(response.data);
        
        const standings = [];
        
        // 순위표 데이터 추출 (실제 셀렉터는 사이트 구조에 따라 조정 필요)
        $('.tData tbody tr').each((index, element) => {
            if (index >= 10) return; // 상위 10팀만
            
            const row = $(element);
            const cells = row.find('td');
            
            if (cells.length >= 10) {
                const rank = parseInt(cells.eq(0).text().trim()) || (index + 1);
                const team = cells.eq(1).text().trim();
                const games = parseInt(cells.eq(2).text().trim()) || 0;
                const wins = parseInt(cells.eq(3).text().trim()) || 0;
                const losses = parseInt(cells.eq(4).text().trim()) || 0;
                const draws = parseInt(cells.eq(5).text().trim()) || 0;
                const winPct = parseFloat(cells.eq(6).text().trim()) || 0;
                const gamesBehind = cells.eq(7).text().trim();
                const recent10 = cells.eq(8).text().trim();
                const streak = cells.eq(9).text().trim();
                
                standings.push({
                    rank,
                    team: normalizeTeamName(team),
                    games,
                    wins,
                    losses,
                    draws,
                    winPct,
                    gamesBehind: gamesBehind === '-' ? 0 : parseFloat(gamesBehind) || 0,
                    recent10,
                    streak
                });
            }
        });
        
        if (standings.length > 0) {
            console.log(`✅ ${standings.length}개 팀 데이터 수집 완료`);
            
            // HTML 파일 업데이트
            await updateHTMLFile(standings);
            
            console.log('✅ HTML 파일 업데이트 완료');
        } else {
            console.log('⚠️ 데이터를 찾을 수 없습니다. 수동 업데이트가 필요합니다.');
        }
        
    } catch (error) {
        console.error('❌ 데이터 업데이트 실패:', error.message);
        process.exit(1);
    }
}

function normalizeTeamName(teamName) {
    const teamMap = {
        '한화 이글스': '한화',
        'LG 트윈스': 'LG', 
        '롯데 자이언츠': '롯데',
        'KT 위즈': 'KT',
        'KIA 타이거즈': 'KIA',
        '삼성 라이온즈': '삼성',
        'SSG 랜더스': 'SSG',
        'NC 다이노스': 'NC',
        '두산 베어스': '두산',
        '키움 히어로즈': '키움'
    };
    
    return teamMap[teamName] || teamName;
}

async function updateHTMLFile(standings) {
    const htmlPath = './magic-number/index.html';
    
    if (!fs.existsSync(htmlPath)) {
        throw new Error('HTML 파일을 찾을 수 없습니다.');
    }
    
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // currentStandings 배열 찾기 및 교체
    const standingsPattern = /let currentStandings = \[([\s\S]*?)\];/;
    const match = htmlContent.match(standingsPattern);
    
    if (match) {
        const newStandingsJS = standings.map(team => 
            `            { rank: ${team.rank}, team: "${team.team}", games: ${team.games}, wins: ${team.wins}, losses: ${team.losses}, draws: ${team.draws}, winPct: ${team.winPct}, gamesBehind: ${team.gamesBehind}, recent10: "${team.recent10}", streak: "${team.streak}" }`
        ).join(',\n');
        
        const newStandings = `let currentStandings = [\n${newStandingsJS}\n        ];`;
        
        htmlContent = htmlContent.replace(standingsPattern, newStandings);
        
        fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    } else {
        throw new Error('currentStandings 배열을 찾을 수 없습니다.');
    }
}

// 스크립트 실행
if (require.main === module) {
    updateKBOData();
}

module.exports = { updateKBOData };