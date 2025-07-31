#!/usr/bin/env node

/**
 * 특정 날짜 KBO 데이터 디버깅
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function debugSpecificDate(date) {
    try {
        console.log(`🔍 ${date} KBO 데이터 상세 분석...`);
        
        const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?gameDate=${date}`;
        console.log(`📡 URL: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        console.log('✅ HTML 응답 받음');
        
        // HTML 저장
        fs.writeFileSync(`./debug-${date}.html`, response.data);
        console.log(`💾 HTML 저장: ./debug-${date}.html`);
        
        const $ = cheerio.load(response.data);
        
        console.log('\n🔍 경기 박스 분석:');
        
        $('.gameBox').each((i, gameBox) => {
            console.log(`\n🏟️ 경기 ${i + 1}:`);
            const $game = $(gameBox);
            
            // 원정팀 정보
            const $leftTeam = $game.find('.leftTeam');
            const awayTeam = $leftTeam.find('strong.teamT').text().trim();
            const awayScoreSpan = $leftTeam.find('.score span');
            const awayScore = awayScoreSpan.text().trim();
            
            // 홈팀 정보
            const $rightTeam = $game.find('.rightTeam');
            const homeTeam = $rightTeam.find('strong.teamT').text().trim();
            const homeScoreSpan = $rightTeam.find('.score span');
            const homeScore = homeScoreSpan.text().trim();
            
            // 경기 상태
            const gameStatus = $game.find('strong.flag span').text().trim();
            
            console.log(`  원정팀: ${awayTeam} (점수: "${awayScore}")`);
            console.log(`  홈팀: ${homeTeam} (점수: "${homeScore}")`);
            console.log(`  상태: ${gameStatus}`);
            
            // 점수 요소의 HTML 확인
            console.log(`  원정팀 점수 HTML: ${awayScoreSpan.html()}`);
            console.log(`  홈팀 점수 HTML: ${homeScoreSpan.html()}`);
            
            // 테이블 확인
            const $table = $game.find('.tScore');
            if ($table.length > 0) {
                console.log(`  📊 점수 테이블 존재`);
                
                // 테이블에서 최종 점수 찾기
                const finalScores = [];
                $table.find('tbody tr').each((rowIndex, row) => {
                    const $row = $(row);
                    const teamName = $row.find('td').first().text().trim();
                    const runScore = $row.find('td').eq(-3).text().trim(); // R 컬럼
                    
                    if (teamName && runScore && runScore !== '-') {
                        finalScores.push({ team: teamName, score: runScore });
                        console.log(`    ${teamName}: ${runScore}점`);
                    }
                });
                
                if (finalScores.length === 0) {
                    console.log(`    ⚪ 아직 점수 없음`);
                }
            }
        });
        
        console.log('\n✨ 분석 완료!');
        
    } catch (error) {
        console.error('❌ 오류:', error.message);
    }
}

// 여러 날짜 테스트
async function testMultipleDates() {
    const dates = [
        '20250729', // 7월 29일
        '20250728', // 7월 28일  
        '20250727', // 7월 27일
        '20250730'  // 7월 30일
    ];
    
    for (const date of dates) {
        await debugSpecificDate(date);
        console.log('\n' + '='.repeat(50) + '\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

testMultipleDates();