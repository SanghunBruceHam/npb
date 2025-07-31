#!/usr/bin/env node

/**
 * 네이버 스포츠 KBO 데이터 스크래핑
 * 네이버 스포츠는 API 기반이므로 실제 API 엔드포인트를 찾아서 사용
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

class NaverSportsScraper {
    constructor() {
        this.client = axios.create({
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://m.sports.naver.com/'
            }
        });
        
        // 네이버 스포츠 API 엔드포인트들 (추정)
        this.apiEndpoints = [
            'https://sports.news.naver.com/kbaseball/schedule/index',
            'https://m.sports.naver.com/ajax/kbaseball/schedule',
            'https://sports.news.naver.com/ajax/kbaseball/schedule/list',
            'https://m.sports.naver.com/api/kbaseball/schedule'
        ];
    }

    async testNaverAPIs(date = '2025-07-31') {
        console.log(`🔍 네이버 스포츠 API 엔드포인트 탐색 (${date})...`);
        
        for (const endpoint of this.apiEndpoints) {
            try {
                console.log(`\n📡 테스트: ${endpoint}`);
                
                const params = {
                    category: 'kbo',
                    date: date
                };
                
                const response = await this.client.get(endpoint, { params });
                
                console.log(`✅ 응답 성공 (${response.status})`);
                console.log(`📄 Content-Type: ${response.headers['content-type']}`);
                console.log(`📊 데이터 크기: ${JSON.stringify(response.data).length} 문자`);
                
                // JSON 응답인 경우 구조 분석
                if (typeof response.data === 'object') {
                    console.log(`🗂️ JSON 구조:`, Object.keys(response.data));
                    
                    // 경기 데이터로 보이는 배열 찾기
                    const findGameData = (obj, path = '') => {
                        for (const [key, value] of Object.entries(obj)) {
                            const currentPath = path ? `${path}.${key}` : key;
                            
                            if (Array.isArray(value) && value.length > 0) {
                                console.log(`📋 배열 발견: ${currentPath} (${value.length}개 항목)`);
                                
                                // 첫 번째 항목이 경기 데이터인지 확인
                                const firstItem = value[0];
                                if (typeof firstItem === 'object' && firstItem !== null) {
                                    const keys = Object.keys(firstItem);
                                    console.log(`  🔑 항목 키: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
                                    
                                    // 팀, 점수, 경기 관련 키워드 확인
                                    const gameKeywords = ['team', 'score', 'game', 'match', 'home', 'away', '팀', '점수'];
                                    const matchingKeys = keys.filter(key => 
                                        gameKeywords.some(keyword => 
                                            key.toLowerCase().includes(keyword) || key.includes(keyword)
                                        )
                                    );
                                    
                                    if (matchingKeys.length > 0) {
                                        console.log(`  🎯 경기 관련 키: ${matchingKeys.join(', ')}`);
                                        console.log(`  📝 샘플 데이터:`, JSON.stringify(firstItem, null, 2).slice(0, 500));
                                    }
                                }
                            } else if (typeof value === 'object' && value !== null) {
                                findGameData(value, currentPath);
                            }
                        }
                    };
                    
                    findGameData(response.data);
                }
                
                // 파일로 저장
                const filename = `./naver-sports-${endpoint.split('/').pop()}-${date}.json`;
                fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
                console.log(`💾 저장: ${filename}`);
                
            } catch (error) {
                console.log(`❌ 실패: ${error.message}`);
                if (error.response) {
                    console.log(`   HTTP ${error.response.status}: ${error.response.statusText}`);
                }
            }
            
            // API 부하 방지
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async findNaverKBOAPI() {
        console.log('🕵️ 네이버 스포츠 KBO API 자동 탐지...');
        
        // 다양한 날짜로 테스트
        const testDates = [
            '2025-07-31',
            '2025-07-30', 
            '2025-07-29'
        ];
        
        for (const date of testDates) {
            console.log(`\n📅 ${date} 테스트:`);
            await this.testNaverAPIs(date);
        }
        
        // 브라우저 네트워크 탭에서 볼 수 있는 실제 API 패턴들 시도
        const commonPatterns = [
            `https://sports.news.naver.com/kbaseball/schedule/ajax/list.nhn?category=kbo&date=2025-07-31`,
            `https://m.sports.naver.com/ajax/kbaseball/schedule/list.nhn?date=2025-07-31`,
            `https://sports.news.naver.com/ajax/schedule/list?sport=kbaseball&date=2025-07-31`,
            `https://m.sports.naver.com/api/schedule?sport=kbaseball&date=2025-07-31`
        ];
        
        console.log('\n🎯 공통 API 패턴 테스트:');
        for (const url of commonPatterns) {
            try {
                console.log(`\n📡 ${url}`);
                const response = await this.client.get(url);
                console.log(`✅ 성공! (${response.status})`);
                
                const filename = `./naver-pattern-${Date.now()}.json`;
                fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));
                console.log(`💾 저장: ${filename}`);
                
            } catch (error) {
                console.log(`❌ ${error.response?.status || error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// 실행
async function main() {
    console.log('🚀 네이버 스포츠 KBO API 탐색 시작...\n');
    
    const scraper = new NaverSportsScraper();
    await scraper.findNaverKBOAPI();
    
    console.log('\n✨ 탐색 완료! JSON 파일들을 확인하여 사용 가능한 API를 찾아보세요.');
}

if (require.main === module) {
    main();
}

module.exports = NaverSportsScraper;