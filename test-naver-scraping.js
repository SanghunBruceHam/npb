#!/usr/bin/env node

/**
 * 네이버 스포츠 KBO 스케줄 스크래핑 테스트
 * 실제 완료된 경기 결과를 가져오는 테스트
 */

const https = require('https');
const zlib = require('zlib');

class NaverKBOScraper {
    constructor() {
        console.log('🔵 네이버 스포츠 KBO 스크래핑 테스트 시작...\n');
    }

    async fetchNaverSchedule(date) {
        return new Promise((resolve, reject) => {
            // 날짜 형식 변환 (20250731 -> 2025-07-31)
            const formattedDate = date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?date=${formattedDate}&category=kbo`;
            
            console.log(`📡 네이버 요청 URL: ${url}`);
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Referer': 'https://m.sports.naver.com/'
                }
            };
            
            const req = https.get(url, options, (res) => {
                console.log(`📊 응답 상태: ${res.statusCode}`);
                console.log(`📊 응답 헤더:`, res.headers['content-type']);
                console.log(`📊 압축 방식:`, res.headers['content-encoding']);
                
                let stream = res;
                
                // 압축 해제
                if (res.headers['content-encoding'] === 'gzip') {
                    stream = res.pipe(zlib.createGunzip());
                } else if (res.headers['content-encoding'] === 'deflate') {
                    stream = res.pipe(zlib.createInflate());
                } else if (res.headers['content-encoding'] === 'br') {
                    stream = res.pipe(zlib.createBrotliDecompress());
                }
                
                let data = '';
                stream.setEncoding('utf8');
                stream.on('data', chunk => data += chunk);
                stream.on('end', () => {
                    console.log(`📄 압축 해제 후 크기: ${data.length}자`);
                    resolve(data);
                });
                
            }).on('error', (error) => {
                console.log(`❌ 요청 실패: ${error.message}`);
                reject(error);
            });
            
            req.setTimeout(15000, () => {
                req.destroy();
                reject(new Error('요청 타임아웃'));
            });
        });
    }

    // 네이버 API 직접 호출 시도
    async fetchNaverAPI(date) {
        return new Promise((resolve, reject) => {
            // 네이버 스포츠 API 추정 경로들
            const apiPaths = [
                `/api/kbaseball/schedule?date=${date}&category=kbo`,
                `/kbaseball/schedule/api?date=${date}`,
                `/api/schedule/kbo/${date}`
            ];
            
            const tryAPI = async (pathIndex = 0) => {
                if (pathIndex >= apiPaths.length) {
                    reject(new Error('모든 API 경로 시도 실패'));
                    return;
                }
                
                const url = `https://m.sports.naver.com${apiPaths[pathIndex]}`;
                console.log(`📡 API 시도 ${pathIndex + 1}: ${url}`);
                
                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'ko-KR,ko;q=0.9',
                        'Referer': `https://m.sports.naver.com/kbaseball/schedule/index?date=${date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}&category=kbo`
                    }
                };
                
                const req = https.get(url, options, (res) => {
                    console.log(`   📊 상태: ${res.statusCode}`);
                    
                    if (res.statusCode === 200) {
                        let data = '';
                        res.on('data', chunk => data += chunk);
                        res.on('end', () => {
                            try {
                                const jsonData = JSON.parse(data);
                                console.log(`   ✅ JSON 데이터 파싱 성공!`);
                                resolve(jsonData);
                            } catch (e) {
                                console.log(`   ❌ JSON 파싱 실패, 다음 경로 시도`);
                                tryAPI(pathIndex + 1);
                            }
                        });
                    } else {
                        console.log(`   ❌ ${res.statusCode} 응답, 다음 경로 시도`);
                        tryAPI(pathIndex + 1);
                    }
                    
                }).on('error', () => {
                    console.log(`   ❌ 요청 실패, 다음 경로 시도`);
                    tryAPI(pathIndex + 1);
                });
                
                req.setTimeout(10000, () => {
                    req.destroy();
                    tryAPI(pathIndex + 1);
                });
            };
            
            tryAPI();
        });
    }

    analyzeHTML(html) {
        console.log('\n🔍 HTML 분석 시작...');
        console.log('\n📄 HTML 내용 (처음 500자):');
        console.log(html.substring(0, 500));
        console.log('\n📄 HTML 내용 (마지막 500자):');
        console.log(html.substring(Math.max(0, html.length - 500)));
        
        // 주요 키워드 검색
        const keywords = [
            '경기종료', '경기전', '경기중', 
            'KT', 'LG', '키움', 'SSG', 'NC', '롯데', '두산', 'KIA', '삼성', '한화',
            'score', 'game', 'match', 'schedule'
        ];
        
        keywords.forEach(keyword => {
            const matches = (html.match(new RegExp(keyword, 'gi')) || []).length;
            if (matches > 0) {
                console.log(`   "${keyword}": ${matches}개 발견`);
            }
        });

        // JavaScript 변수나 JSON 데이터 찾기
        const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        console.log(`\n📜 스크립트 태그: ${scriptMatches.length}개`);
        
        scriptMatches.forEach((script, i) => {
            if (script.includes('schedule') || script.includes('game') || script.includes('kbo')) {
                console.log(`   스크립트 ${i + 1}: 관련 데이터 포함 가능성`);
                
                // JSON 데이터 패턴 찾기
                const jsonPattern = /(\{[^{}]*(?:"(?:game|schedule|team|score)"[^{}]*)*\})/gi;
                const jsonMatches = script.match(jsonPattern) || [];
                
                if (jsonMatches.length > 0) {
                    console.log(`      JSON 패턴 ${jsonMatches.length}개 발견`);
                    jsonMatches.slice(0, 2).forEach((json, j) => {
                        console.log(`      JSON ${j + 1}: ${json.substring(0, 100)}...`);
                    });
                }
            }
        });
    }

    async testNaverScraping(testDate = '20250731') {
        console.log(`📅 네이버 스포츠에서 ${testDate} 경기 데이터 테스트`);
        
        try {
            // 1. API 직접 호출 시도
            console.log('\n🔸 1단계: 네이버 API 직접 호출 시도');
            
            try {
                const apiData = await this.fetchNaverAPI(testDate);
                console.log('✅ API 호출 성공!');
                console.log('📊 API 응답:', JSON.stringify(apiData, null, 2));
                return apiData;
                
            } catch (apiError) {
                console.log('❌ API 호출 실패:', apiError.message);
            }
            
            // 2. HTML 페이지 스크래핑
            console.log('\n🔸 2단계: HTML 페이지 스크래핑');
            const html = await this.fetchNaverSchedule(testDate);
            
            // HTML 분석
            this.analyzeHTML(html);
            
            // 간단한 경기 결과 패턴 찾기
            console.log('\n🔍 경기 결과 패턴 검색...');
            
            // 팀명 + 점수 패턴
            const scorePattern = /(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화).*?(\d+).*?(\d+).*?(KT|LG|키움|SSG|NC|롯데|두산|KIA|삼성|한화)/gi;
            const scoreMatches = [...html.matchAll(scorePattern)];
            
            if (scoreMatches.length > 0) {
                console.log(`✅ 점수 패턴 ${scoreMatches.length}개 발견:`);
                scoreMatches.forEach((match, i) => {
                    console.log(`   ${i + 1}. ${match[1]} ${match[2]} - ${match[3]} ${match[4]}`);
                });
            } else {
                console.log('❌ 점수 패턴을 찾을 수 없음');
            }
            
        } catch (error) {
            console.log(`❌ 네이버 스크래핑 실패: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 네이버 스포츠 스크래핑 테스트 완료');
        console.log('='.repeat(60));
    }
}

// 실행
async function main() {
    const scraper = new NaverKBOScraper();
    
    // 명령행에서 날짜 받기 (기본값: 20250731)
    const testDate = process.argv[2] || '20250731';
    
    try {
        await scraper.testNaverScraping(testDate);
    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = NaverKBOScraper;