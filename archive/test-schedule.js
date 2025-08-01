#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

async function fetchSchedulePage(month = '07') {
    return new Promise((resolve, reject) => {
        // Schedule.aspx로 변경
        const url = `https://www.koreabaseball.com/Schedule/Schedule.aspx?scheduleMonth=2025${month}`;
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        };
        
        console.log(`📥 2025년 ${month}월 Schedule 페이지 데이터 수집 중...`);
        console.log(`🔗 URL: ${url}`);
        
        https.get(url, options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`📊 응답 코드: ${res.statusCode}`);
                console.log(`📏 HTML 길이: ${data.length}자`);
                
                // HTML 저장
                fs.writeFileSync(`schedule-2025${month}.html`, data);
                console.log(`💾 schedule-2025${month}.html 저장 완료`);
                
                // tblschedulelist 테이블 검색
                console.log('\n🔍 tblschedulelist 검색 중...');
                const tableRegex = /<table[^>]*id="tblScheduleList"[^>]*>([\s\S]*?)<\/table>/i;
                const tableMatch = data.match(tableRegex);
                
                if (tableMatch) {
                    console.log('✅ tblScheduleList 테이블 발견!');
                    
                    // 테이블 내용 일부 출력
                    const tableContent = tableMatch[1];
                    console.log(`📊 테이블 길이: ${tableContent.length}자`);
                    
                    // 경기 결과 패턴 검색
                    const gamePatterns = [
                        /<tr[^>]*>([\s\S]*?)<\/tr>/g,
                        /day_result[^>]*>([^<]+)</g,
                        /win">([^<]+)</g,
                        /lose">([^<]+)</g,
                        /scoreWrap[^>]*>([\s\S]*?)<\/div>/g
                    ];
                    
                    gamePatterns.forEach((pattern, index) => {
                        const matches = tableContent.match(pattern);
                        console.log(`   패턴 ${index + 1}: ${matches ? matches.length : 0}개 매치`);
                    });
                    
                    // 첫 번째 경기 정보 추출 시도
                    const firstRowMatch = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/);
                    if (firstRowMatch) {
                        console.log('\n📅 첫 번째 행 내용:');
                        console.log('=' .repeat(80));
                        console.log(firstRowMatch[1].substring(0, 500));
                        console.log('=' .repeat(80));
                    }
                } else {
                    console.log('❌ tblScheduleList 테이블을 찾을 수 없습니다.');
                    
                    // 다른 테이블 검색
                    const allTables = data.match(/<table[^>]*>([\s\S]*?)<\/table>/g);
                    console.log(`\n📊 전체 테이블 개수: ${allTables ? allTables.length : 0}개`);
                    
                    // ID나 class 검색
                    const tableIds = data.match(/id="tbl[^"]*"/g);
                    if (tableIds) {
                        console.log('\n🔍 발견된 테이블 ID들:');
                        tableIds.forEach(id => console.log(`   - ${id}`));
                    }
                }
                
                resolve(data);
            });
        }).on('error', reject);
    });
}

// 7월 데이터 테스트
fetchSchedulePage('07').catch(console.error);