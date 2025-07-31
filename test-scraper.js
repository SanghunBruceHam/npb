#!/usr/bin/env node

/**
 * KBO 웹사이트 구조 테스트 및 디버깅 스크립트
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testKBOScraping() {
    try {
        console.log('🔍 KBO 웹사이트 구조 분석 중...');
        
        // 최근 실제 경기가 있었던 날짜로 테스트 (7월 29일)
        const testDate = '20250729';
        const url = `https://www.koreabaseball.com/Schedule/ScoreBoard.aspx?gameDate=${testDate}`;
        
        console.log(`📡 테스트 URL: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 15000
        });
        
        console.log('✅ HTML 응답 받음');
        console.log(`📄 HTML 길이: ${response.data.length} 문자`);
        
        // HTML을 파일로 저장하여 구조 분석
        fs.writeFileSync('./debug-kbo-html.html', response.data);
        console.log('💾 HTML 파일 저장: ./debug-kbo-html.html');
        
        // Cheerio로 파싱
        const $ = cheerio.load(response.data);
        
        console.log('\n🔍 DOM 구조 분석:');
        
        // 다양한 가능한 셀렉터들 테스트
        const selectors = [
            '.game-item',
            '.score-item',
            '.match-item',
            '.game',
            '.match',
            '.score',
            '.tbl_score',
            '.scoreBoard',
            'table',
            '.team',
            '.logo',
            'img[src*="emblem"]',
            'strong'
        ];
        
        selectors.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`  ✅ ${selector}: ${elements.length}개 요소 발견`);
                
                // 처음 몇 개 요소의 텍스트 내용 확인
                elements.slice(0, 3).each((i, el) => {
                    const text = $(el).text().trim().slice(0, 100);
                    if (text) {
                        console.log(`    [${i}] ${text}`);
                    }
                });
            } else {
                console.log(`  ❌ ${selector}: 요소 없음`);
            }
        });
        
        // 팀 로고 이미지 찾기
        console.log('\n🖼️ 팀 로고 이미지:');
        $('img[src*="emblem"]').each((i, img) => {
            const src = $(img).attr('src');
            const alt = $(img).attr('alt') || 'N/A';
            console.log(`  ${i + 1}. ${alt}: ${src}`);
        });
        
        // Strong 태그 내용 (팀명일 가능성)
        console.log('\n💪 Strong 태그 내용:');
        $('strong').each((i, strong) => {
            const text = $(strong).text().trim();
            if (text && text.length < 10) {
                console.log(`  ${i + 1}. "${text}"`);
            }
        });
        
        // 테이블 구조 확인
        console.log('\n📊 테이블 구조:');
        $('table').each((i, table) => {
            const $table = $(table);
            const rows = $table.find('tr').length;
            const cols = $table.find('tr').first().find('th, td').length;
            console.log(`  테이블 ${i + 1}: ${rows}행 x ${cols}열`);
            
            // 첫 번째 행의 내용
            const firstRowText = $table.find('tr').first().text().trim().slice(0, 100);
            if (firstRowText) {
                console.log(`    첫 행: ${firstRowText}`);
            }
        });
        
        console.log('\n✨ 분석 완료! debug-kbo-html.html 파일을 확인하여 정확한 구조를 파악하세요.');
        
    } catch (error) {
        console.error('❌ 테스트 중 오류:', error.message);
        if (error.response) {
            console.error(`HTTP 상태: ${error.response.status}`);
            console.error(`응답 헤더:`, error.response.headers);
        }
    }
}

// 실행
testKBOScraping();