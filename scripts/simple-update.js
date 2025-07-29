// 간단한 KBO 데이터 업데이트 스크립트
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function updateKBOData() {
    try {
        console.log('🚀 KBO 데이터 수집 시작...');
        
        // KBO 공식 사이트에서 데이터 가져오기 (오류 시 재시도)
        let response;
        let retries = 3;
        
        for (let i = 0; i < retries; i++) {
            try {
                response = await axios.get('https://www.koreabaseball.com/Record/TeamRank/TeamRankDaily.aspx', {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                break;
            } catch (error) {
                console.log(`재시도 ${i + 1}/${retries}...`);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        const $ = cheerio.load(response.data);
        
        // KBO 순위표 데이터 추출 (TeamRankDaily.aspx 기준)
        const standings = [];
        
        // 순위표 테이블에서 데이터 추출
        $('table.tData tbody tr').each((index, element) => {
            if (index >= 10) return; // 상위 10팀만
            
            const row = $(element);
            const cells = row.find('td');
            
            if (cells.length >= 10) {
                const rank = parseInt(cells.eq(0).text().trim()) || (index + 1);
                const teamText = cells.eq(1).text().trim();
                const team = normalizeTeamName(teamText);
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
            console.log(`✅ ${standings.length}개 팀 순위 데이터 수집 완료`);
            
            // 팀간 상대전적 데이터 수집
            const headToHeadData = await crawlHeadToHead($);
            
            // HTML 파일 업데이트
            await updateHTMLFile(standings, headToHeadData);
            
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

async function crawlHeadToHead($) {
    try {
        console.log('📊 팀간 상대전적 데이터 추출 중...');
        
        const headToHeadData = {};
        const teams = ['한화', 'LG', '롯데', 'KT', 'KIA', '삼성', 'SSG', 'NC', '두산', '키움'];
        
        // TeamRankDaily.aspx 페이지에서 상대전적 테이블 추출
        // 실제 셀렉터는 사이트 구조 확인 후 조정 필요
        $('table').each((tableIndex, table) => {
            const $table = $(table);
            const headerText = $table.find('thead, th').text();
            
            // 상대전적 테이블인지 확인
            if (headerText.includes('상대') || headerText.includes('전적') || headerText.includes('vs')) {
                $table.find('tbody tr').each((rowIndex, row) => {
                    if (rowIndex >= teams.length) return;
                    
                    const $row = $(row);
                    const homeTeam = teams[rowIndex];
                    
                    if (!headToHeadData[homeTeam]) {
                        headToHeadData[homeTeam] = {};
                    }
                    
                    $row.find('td').each((cellIndex, cell) => {
                        if (cellIndex > 0 && cellIndex <= teams.length) {
                            const awayTeam = teams[cellIndex - 1];
                            const record = $(cell).text().trim();
                            
                            if (record && record !== '-' && record.includes('-')) {
                                headToHeadData[homeTeam][awayTeam] = record;
                            }
                        }
                    });
                });
            }
        });
        
        console.log('✅ 상대전적 데이터 추출 완료');
        return headToHeadData;
        
    } catch (error) {
        console.warn('⚠️ 상대전적 데이터 추출 실패, 기존 데이터 유지:', error.message);
        return null; // 기존 데이터 유지
    }
}

async function updateHTMLFile(standings, headToHeadData) {
    const htmlPath = './magic-number/index.html';
    
    if (!fs.existsSync(htmlPath)) {
        throw new Error('HTML 파일을 찾을 수 없습니다.');
    }
    
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 1. currentStandings 배열 업데이트
    const standingsPattern = /let currentStandings = \[([\s\S]*?)\];/;
    const standingsMatch = htmlContent.match(standingsPattern);
    
    if (standingsMatch) {
        const newStandingsJS = standings.map(team => 
            `            { rank: ${team.rank}, team: "${team.team}", games: ${team.games}, wins: ${team.wins}, losses: ${team.losses}, draws: ${team.draws}, winPct: ${team.winPct}, gamesBehind: ${team.gamesBehind}, recent10: "${team.recent10}", streak: "${team.streak}" }`
        ).join(',\n');
        
        const newStandings = `let currentStandings = [\n${newStandingsJS}\n        ];`;
        htmlContent = htmlContent.replace(standingsPattern, newStandings);
        console.log('✅ 순위표 데이터 업데이트 완료');
    } else {
        throw new Error('currentStandings 배열을 찾을 수 없습니다.');
    }
    
    // 2. headToHeadData 객체 업데이트 (데이터가 있는 경우)
    if (headToHeadData && Object.keys(headToHeadData).length > 0) {
        const headToHeadPattern = /const headToHeadData = \{([\s\S]*?)\};/;
        const headToHeadMatch = htmlContent.match(headToHeadPattern);
        
        if (headToHeadMatch) {
            const newHeadToHeadJS = Object.entries(headToHeadData).map(([team, opponents]) => {
                const opponentRecords = Object.entries(opponents).map(([opp, record]) => 
                    `"${opp}": "${record}"`
                ).join(', ');
                return `            "${team}": { ${opponentRecords} }`;
            }).join(',\n');
            
            const newHeadToHead = `const headToHeadData = {\n${newHeadToHeadJS}\n        };`;
            htmlContent = htmlContent.replace(headToHeadPattern, newHeadToHead);
            console.log('✅ 상대전적 데이터 업데이트 완료');
        }
    }
    
    // 3. 날짜 업데이트 (주석)
    const today = new Date();
    const dateString = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    
    // 순위 데이터 주석 업데이트
    htmlContent = htmlContent.replace(
        /\/\/ 2025년 \d+월 \d+일 기준 실제 KBO 순위 데이터/,
        `// ${dateString} 기준 실제 KBO 순위 데이터`
    );
    
    // 상대전적 데이터 주석 업데이트
    htmlContent = htmlContent.replace(
        /\/\/ 2025년 \d+월 \d+일 기준 실제 팀간 상대전적 데이터/,
        `// ${dateString} 기준 실제 팀간 상대전적 데이터`
    );
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`✅ HTML 파일 업데이트 완료 (${dateString})`);
}

// 스크립트 실행
if (require.main === module) {
    updateKBOData();
}

module.exports = { updateKBOData };