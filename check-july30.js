#!/usr/bin/env node

/**
 * 7월 30일 KBO 경기 결과 정확한 파싱
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkJuly30() {
    try {
        console.log('🔍 2025년 7월 30일 KBO 경기 결과 확인...');
        
        const url = 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?gameDate=20250730';
        console.log(`📡 URL: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        console.log('✅ HTML 응답 받음');
        
        // HTML 저장
        fs.writeFileSync('./kbo-july30-detailed.html', response.data);
        console.log('💾 HTML 저장: ./kbo-july30-detailed.html');
        
        const $ = cheerio.load(response.data);
        
        console.log('\n🏟️ 경기별 상세 분석:');
        
        // .smsScore 클래스로 각 경기 찾기
        $('.smsScore').each((gameIndex, gameElement) => {
            console.log(`\n⚾ 경기 ${gameIndex + 1}:`);
            const $game = $(gameElement);
            
            // 원정팀 정보
            const $leftTeam = $game.find('.leftTeam');
            const awayTeamName = $leftTeam.find('strong.teamT').text().trim();
            const awayScoreElement = $leftTeam.find('.score span');
            const awayScoreText = awayScoreElement.text().trim();
            const awayScoreHtml = awayScoreElement.html();
            
            // 홈팀 정보
            const $rightTeam = $game.find('.rightTeam');
            const homeTeamName = $rightTeam.find('strong.teamT').text().trim();
            const homeScoreElement = $rightTeam.find('.score span');
            const homeScoreText = homeScoreElement.text().trim();
            const homeScoreHtml = homeScoreElement.html();
            
            // 경기 상태
            const gameStatusElement = $game.find('strong.flag span');
            const gameStatus = gameStatusElement.text().trim();
            const gameStatusHtml = gameStatusElement.html();
            
            console.log(`  원정팀: ${awayTeamName}`);
            console.log(`  원정팀 점수: "${awayScoreText}" (HTML: ${awayScoreHtml})`);
            console.log(`  홈팀: ${homeTeamName}`);
            console.log(`  홈팀 점수: "${homeScoreText}" (HTML: ${homeScoreHtml})`);
            console.log(`  경기 상태: "${gameStatus}" (HTML: ${gameStatusHtml})`);
            
            // 점수가 숫자인지 확인
            const awayScore = parseInt(awayScoreText);
            const homeScore = parseInt(homeScoreText);
            
            if (!isNaN(awayScore) && !isNaN(homeScore)) {
                console.log(`  ✅ 경기 완료! ${awayTeamName} ${awayScore} : ${homeScore} ${homeTeamName}`);
                
                const result = awayScore > homeScore ? '원정승' : 
                              homeScore > awayScore ? '홈승' : '무승부';
                console.log(`  🎯 결과: ${result}`);
            } else {
                console.log(`  ⏸️ 아직 미완료 또는 점수 없음`);
            }
            
            // 테이블에서도 점수 확인
            const $scoreTable = $game.find('.tScore');
            if ($scoreTable.length > 0) {
                console.log('  📊 점수 테이블 확인:');
                
                $scoreTable.find('tbody tr').each((rowIndex, row) => {
                    const $row = $(row);
                    const cells = $row.find('td');
                    
                    if (cells.length > 0) {
                        const teamName = $(cells[0]).text().trim();
                        const runColumn = $(cells[cells.length - 3]); // R 열
                        const hitColumn = $(cells[cells.length - 2]); // H 열
                        const errorColumn = $(cells[cells.length - 1]); // E 열
                        
                        const runs = runColumn.text().trim();
                        const hits = hitColumn.text().trim();
                        const errors = errorColumn.text().trim();
                        
                        if (teamName && runs && runs !== '-') {
                            console.log(`    ${teamName}: ${runs}점 (${hits}안타, ${errors}에러)`);
                        } else {
                            console.log(`    ${teamName}: 점수 없음 (R:${runs}, H:${hits}, E:${errors})`);
                        }
                    }
                });
            }
        });
        
        console.log('\n📅 페이지에 표시된 날짜 확인:');
        const displayedDate = $('#cphContents_cphContents_cphContents_lblGameDate').text().trim();
        console.log(`표시된 날짜: "${displayedDate}"`);
        
        console.log('\n✨ 분석 완료!');
        
    } catch (error) {
        console.error('❌ 오류:', error.message);
        if (error.response) {
            console.error(`HTTP 상태: ${error.response.status}`);
        }
    }
}

checkJuly30();