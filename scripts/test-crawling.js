#!/usr/bin/env node

/**
 * KBO 경기 결과 크롤링 테스트 스크립트
 * 목표: clean.txt 형식으로 경기 결과 자동 수집
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class KBOCrawlingTest {
    constructor() {
        this.teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
        this.teamMapping = {
            '엘지': 'LG', 'LG트윈스': 'LG', 'LG 트윈스': 'LG',
            '삼성라이온즈': '삼성', '삼성 라이온즈': '삼성',
            'KT위즈': 'KT', 'KT 위즈': 'KT',
            'SSG랜더스': 'SSG', 'SSG 랜더스': 'SSG',
            'NC다이노스': 'NC', 'NC 다이노스': 'NC',
            'KIA타이거즈': 'KIA', 'KIA 타이거즈': 'KIA',
            '롯데자이언츠': '롯데', '롯데 자이언츠': '롯데',
            '두산베어스': '두산', '두산 베어스': '두산',
            '키움히어로즈': '키움', '키움 히어로즈': '키움',
            '한화이글스': '한화', '한화 이글스': '한화'
        };
        console.log('🏟️ KBO 경기 결과 크롤링 테스트 시작...\n');
    }

    async init() {
        console.log('🚀 브라우저 시작...');
        this.browser = await puppeteer.launch({
            headless: false, // 디버깅을 위해 헤드리스 끄기
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        console.log('✅ 브라우저 초기화 완료');
    }

    normalizeTeamName(teamName) {
        // 팀명 정규화
        const cleaned = teamName.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '');
        return this.teamMapping[cleaned] || this.teams.find(team => cleaned.includes(team)) || cleaned;
    }

    async testNaverScraping(targetDate = '2025-07-31') {
        try {
            console.log(`\n📡 네이버 스포츠 모바일 크롤링 테스트 (${targetDate})`);
            
            const url = `https://m.sports.naver.com/kbaseball/schedule/index?category=kbo&date=${targetDate}`;
            console.log(`🔗 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // 페이지 로딩 대기
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 페이지 HTML 확인 및 디버깅
            console.log('📄 페이지 로딩 완료, HTML 구조 분석 중...');
            
            // 먼저 페이지에서 사용 가능한 선택자들을 찾아보기
            await this.page.evaluate(() => {
                console.log('=== 페이지 디버깅 정보 ===');
                console.log('URL:', window.location.href);
                console.log('Title:', document.title);
                
                // 가능한 경기 관련 요소들 찾기
                const possibleSelectors = [
                    '.game', '.match', '.schedule', '.result',
                    '[class*="game"]', '[class*="match"]', '[class*="schedule"]', '[class*="result"]',
                    '[class*="team"]', '[class*="score"]'
                ];
                
                possibleSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    }
                });
                
                // 전체 HTML의 일부만 로그
                const bodyText = document.body?.innerText?.substring(0, 500) || 'No body text';
                console.log('Body text preview:', bodyText);
            });

            // 경기 결과 추출 (모바일 사이트용 선택자)
            const games = await this.page.evaluate(() => {
                const results = [];
                
                // 여러 가능한 선택자 시도
                const possibleGameSelectors = [
                    '.game_item', '.match_item', '.schedule_item',
                    '[class*="game"]', '[class*="match"]', '[class*="schedule"]',
                    '.result', '[class*="result"]'
                ];
                
                let gameElements = [];
                for (const selector of possibleGameSelectors) {
                    gameElements = document.querySelectorAll(selector);
                    if (gameElements.length > 0) {
                        console.log(`Using selector: ${selector}, found ${gameElements.length} games`);
                        break;
                    }
                }
                
                if (gameElements.length === 0) {
                    // 전체 페이지에서 점수 패턴 찾기
                    const pageText = document.body.innerText;
                    const scorePattern = /(\w+)\s*(\d+)\s*:\s*(\d+)\s*(\w+)/g;
                    let match;
                    
                    while ((match = scorePattern.exec(pageText)) !== null) {
                        console.log('Found score pattern:', match[0]);
                        results.push({
                            awayTeam: match[1],
                            homeTeam: match[4],
                            awayScore: parseInt(match[2]),
                            homeScore: parseInt(match[3]),
                            raw: match[0]
                        });
                    }
                    
                    return results;
                }
                
                // 실제 게임 요소 파싱
                gameElements.forEach((gameEl, index) => {
                    try {
                        console.log(`Processing game ${index + 1}...`);
                        
                        // 다양한 팀명/점수 선택자 시도
                        const teamSelectors = ['.team', '[class*="team"]', '.name', '[class*="name"]'];
                        const scoreSelectors = ['.score', '[class*="score"]', '.point', '[class*="point"]'];
                        
                        let teams = [];
                        let scores = [];
                        
                        // 팀명 찾기
                        for (const selector of teamSelectors) {
                            const teamElements = gameEl.querySelectorAll(selector);
                            if (teamElements.length >= 2) {
                                teams = Array.from(teamElements).map(el => el.textContent?.trim());
                                break;
                            }
                        }
                        
                        // 점수 찾기
                        for (const selector of scoreSelectors) {
                            const scoreElements = gameEl.querySelectorAll(selector);
                            if (scoreElements.length >= 2) {
                                scores = Array.from(scoreElements).map(el => el.textContent?.trim());
                                break;
                            }
                        }
                        
                        // 텍스트에서 직접 파싱
                        if (teams.length < 2 || scores.length < 2) {
                            const gameText = gameEl.textContent || '';
                            console.log('Game text:', gameText);
                            
                            // 점수 패턴 찾기
                            const scoreMatch = gameText.match(/(\d+)\s*:\s*(\d+)/);
                            if (scoreMatch) {
                                scores = [scoreMatch[1], scoreMatch[2]];
                            }
                            
                            // 팀명 패턴 찾기 (한글 팀명)
                            const teamMatches = gameText.match(/(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)/g);
                            if (teamMatches && teamMatches.length >= 2) {
                                teams = teamMatches;
                            }
                        }
                        
                        if (teams.length >= 2 && scores.length >= 2) {
                            const result = {
                                awayTeam: teams[0],
                                homeTeam: teams[1], 
                                awayScore: parseInt(scores[0]),
                                homeScore: parseInt(scores[1]),
                                raw: `${teams[0]} ${scores[0]}:${scores[1]} ${teams[1]}`
                            };
                            
                            console.log('Parsed game:', result);
                            results.push(result);
                        }
                        
                    } catch (error) {
                        console.log('게임 파싱 오류:', error.message);
                    }
                });

                return results;
            });

            console.log(`\n📊 추출된 경기 결과 (${games.length}개):`);
            
            let cleanFormat = `${targetDate}\n`;
            
            games.forEach((game, index) => {
                console.log(`${index + 1}. ${game.raw}`);
                
                // 팀명 정규화
                const awayTeam = this.normalizeTeamName(game.awayTeam);
                const homeTeam = this.normalizeTeamName(game.homeTeam);
                
                // clean.txt 형식으로 변환
                const cleanLine = `${awayTeam} ${game.awayScore}:${game.homeScore} ${homeTeam}(H)`;
                cleanFormat += `${cleanLine}\n`;
                
                console.log(`   → ${cleanLine}`);
            });

            // 결과를 파일로 저장
            const outputPath = `test-crawling-result-${targetDate}.txt`;
            fs.writeFileSync(outputPath, cleanFormat);
            
            console.log(`\n✅ 크롤링 결과를 ${outputPath}에 저장했습니다.`);
            console.log(`📝 Clean.txt 형식:`);
            console.log(cleanFormat);

            return { success: true, games, cleanFormat };

        } catch (error) {
            console.error('❌ 네이버 크롤링 오류:', error.message);
            return { success: false, error: error.message };
        }
    }

    async testKBOOfficialScraping(targetDate = '2025-07-31') {
        try {
            console.log(`\n📡 KBO 공식 스코어보드 크롤링 테스트 (${targetDate})`);
            
            const url = 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx';
            console.log(`🔗 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            await new Promise(resolve => setTimeout(resolve, 5000));

            // 페이지 HTML 구조 확인
            console.log('📄 KBO 공식 사이트 구조 분석 중...');
            
            await this.page.evaluate(() => {
                console.log('=== KBO 공식 사이트 디버깅 정보 ===');
                console.log('URL:', window.location.href);
                console.log('Title:', document.title);
                
                // 가능한 스코어보드 관련 요소들 찾기
                const possibleSelectors = [
                    '.tData', '.score', '.game', '.match', '.board',
                    '[class*="score"]', '[class*="game"]', '[class*="match"]',
                    '[class*="board"]', '[class*="result"]', 'table', 'tr', 'td'
                ];
                
                possibleSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    }
                });
                
                // 테이블 구조 확인
                const tables = document.querySelectorAll('table');
                console.log(`Found ${tables.length} tables`);
                
                tables.forEach((table, index) => {
                    const rows = table.querySelectorAll('tr');
                    console.log(`Table ${index + 1}: ${rows.length} rows`);
                    
                    // 첫 번째 몇 행의 텍스트 확인
                    for (let i = 0; i < Math.min(3, rows.length); i++) {
                        const cellTexts = Array.from(rows[i].querySelectorAll('td, th')).map(cell => 
                            cell.textContent?.trim().substring(0, 20)
                        );
                        if (cellTexts.length > 0) {
                            console.log(`  Row ${i + 1}:`, cellTexts);
                        }
                    }
                });
            });

            // KBO 공식 사이트에서 경기 결과 추출
            const games = await this.page.evaluate((targetDate) => {
                const results = [];
                
                // KBO 공식 사이트의 다양한 테이블 구조 시도
                const tables = document.querySelectorAll('table');
                
                tables.forEach((table, tableIndex) => {
                    console.log(`Processing table ${tableIndex + 1}...`);
                    
                    const rows = table.querySelectorAll('tr');
                    
                    rows.forEach((row, rowIndex) => {
                        try {
                            const cells = row.querySelectorAll('td');
                            if (cells.length < 3) return; // 최소 3개 셀 필요
                            
                            const rowText = row.textContent?.trim();
                            if (!rowText) return;
                            
                            console.log(`Row ${rowIndex + 1} text:`, rowText.substring(0, 100));
                            
                            // 점수 패턴 찾기 (다양한 형식 지원)
                            const scorePatterns = [
                                /(\w+)\s*(\d+)\s*[-:]\s*(\d+)\s*(\w+)/g,  // 팀1 점수-점수 팀2
                                /(\w+)\s*vs\s*(\w+)\s*(\d+)\s*[-:]\s*(\d+)/g, // 팀1 vs 팀2 점수:점수
                                /(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)[^\d]*(\d+)[^\d]+(\d+)[^\d]+(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)/g
                            ];
                            
                            let matchFound = false;
                            
                            for (const pattern of scorePatterns) {
                                let match;
                                while ((match = pattern.exec(rowText)) !== null) {
                                    console.log('Found match:', match[0]);
                                    
                                    let team1, team2, score1, score2;
                                    
                                    if (match.length === 5) {
                                        [, team1, score1, score2, team2] = match;
                                    } else if (match.length === 6) {
                                        [, team1, team2, score1, score2] = match;
                                    }
                                    
                                    if (team1 && team2 && score1 !== undefined && score2 !== undefined) {
                                        results.push({
                                            awayTeam: team1,
                                            homeTeam: team2,
                                            awayScore: parseInt(score1),
                                            homeScore: parseInt(score2),
                                            raw: match[0],
                                            source: `table${tableIndex + 1}_row${rowIndex + 1}`
                                        });
                                        matchFound = true;
                                    }
                                }
                                
                                if (matchFound) break;
                            }
                            
                            // 셀별로 개별 분석
                            if (!matchFound && cells.length >= 5) {
                                const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim());
                                
                                // 일반적인 스코어보드 구조: [날짜, 팀1, 점수, 점수, 팀2] 또는 비슷한 형태
                                for (let i = 0; i < cellTexts.length - 4; i++) {
                                    const team1 = cellTexts[i];
                                    const score1 = cellTexts[i + 1];
                                    const score2 = cellTexts[i + 2];
                                    const team2 = cellTexts[i + 3];
                                    
                                    // 팀명과 점수 검증
                                    if (this.isValidTeam(team1) && this.isValidTeam(team2) && 
                                        this.isValidScore(score1) && this.isValidScore(score2)) {
                                        
                                        results.push({
                                            awayTeam: team1,
                                            homeTeam: team2,
                                            awayScore: parseInt(score1),
                                            homeScore: parseInt(score2),
                                            raw: `${team1} ${score1}:${score2} ${team2}`,
                                            source: `table${tableIndex + 1}_row${rowIndex + 1}_cells`
                                        });
                                        break;
                                    }
                                }
                            }
                            
                        } catch (error) {
                            console.log('Row parsing error:', error.message);
                        }
                    });
                });
                
                return results;
            }, targetDate);

            console.log(`\n📊 KBO 공식 사이트에서 추출된 경기 결과 (${games.length}개):`);
            
            let cleanFormat = `${targetDate}\n`;
            
            games.forEach((game, index) => {
                console.log(`${index + 1}. ${game.raw} (${game.source})`);
                
                // 팀명 정규화
                const awayTeam = this.normalizeTeamName(game.awayTeam);
                const homeTeam = this.normalizeTeamName(game.homeTeam);
                
                // clean.txt 형식으로 변환
                const cleanLine = `${awayTeam} ${game.awayScore}:${game.homeScore} ${homeTeam}(H)`;
                cleanFormat += `${cleanLine}\n`;
                
                console.log(`   → ${cleanLine}`);
            });

            // 결과를 파일로 저장
            if (games.length > 0) {
                const outputPath = `test-kbo-official-result-${targetDate}.txt`;
                const fs = require('fs');
                fs.writeFileSync(outputPath, cleanFormat);
                
                console.log(`\n✅ KBO 공식 크롤링 결과를 ${outputPath}에 저장했습니다.`);
                console.log(`📝 Clean.txt 형식:`);
                console.log(cleanFormat);
            }
            
            return { success: true, games, cleanFormat };

        } catch (error) {
            console.error('❌ KBO 공식 크롤링 오류:', error.message);
            return { success: false, error: error.message };
        }
    }

    isValidTeam(text) {
        if (!text) return false;
        const teams = ['LG', '삼성', 'KT', 'SSG', 'NC', 'KIA', '롯데', '두산', '키움', '한화'];
        return teams.some(team => text.includes(team));
    }

    isValidScore(text) {
        if (!text) return false;
        const score = parseInt(text);
        return !isNaN(score) && score >= 0 && score <= 50; // 야구 점수는 보통 0-50 범위
    }

    async testDaumScraping(targetMonth = '202507') {
        try {
            console.log(`\n📡 다음 스포츠 KBO 스케줄 크롤링 테스트 (${targetMonth})`);
            
            const url = `https://sports.daum.net/schedule/kbo?date=${targetMonth}`;
            console.log(`🔗 URL: ${url}`);
            
            await this.page.goto(url, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            await new Promise(resolve => setTimeout(resolve, 5000));

            // 페이지 HTML 구조 확인
            console.log('📄 다음 스포츠 사이트 구조 분석 중...');
            
            await this.page.evaluate(() => {
                console.log('=== 다음 스포츠 디버깅 정보 ===');
                console.log('URL:', window.location.href);
                console.log('Title:', document.title);
                
                // 가능한 스케줄 관련 요소들 찾기
                const possibleSelectors = [
                    '.match', '.game', '.schedule', '.result', '.score',
                    '[class*="match"]', '[class*="game"]', '[class*="schedule"]',
                    '[class*="result"]', '[class*="score"]', '[class*="team"]',
                    '.list_match', '.info_match', '.match_info'
                ];
                
                possibleSelectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    }
                });
                
                // 리스트 구조 확인
                const lists = document.querySelectorAll('ul, ol, div[class*="list"]');
                console.log(`Found ${lists.length} list elements`);
                
                lists.forEach((list, index) => {
                    const items = list.children;
                    if (items.length > 0) {
                        console.log(`List ${index + 1}: ${items.length} items`);
                        
                        // 첫 번째 몇 개 아이템의 텍스트 확인
                        for (let i = 0; i < Math.min(3, items.length); i++) {
                            const itemText = items[i].textContent?.trim().substring(0, 100);
                            if (itemText) {
                                console.log(`  Item ${i + 1}:`, itemText);
                            }
                        }
                    }
                });
                
                // 전체 페이지 텍스트 샘플
                const bodyText = document.body?.innerText?.substring(0, 1000) || 'No body text';
                console.log('Body text preview:', bodyText);
            });

            // 다음 스포츠에서 경기 결과 추출
            const games = await this.page.evaluate(() => {
                const results = [];
                
                // 다양한 선택자 시도
                const possibleGameSelectors = [
                    '.match_item', '.game_item', '.schedule_item',
                    '[class*="match"]', '[class*="game"]', '[class*="schedule"]',
                    '.list_match li', '.match_list li', 'li[class*="match"]'
                ];
                
                let gameElements = [];
                let usedSelector = '';
                
                for (const selector of possibleGameSelectors) {
                    gameElements = document.querySelectorAll(selector);
                    if (gameElements.length > 0) {
                        console.log(`Using selector: ${selector}, found ${gameElements.length} potential games`);
                        usedSelector = selector;
                        break;
                    }
                }
                
                if (gameElements.length === 0) {
                    console.log('No game elements found with standard selectors, trying text parsing...');
                    
                    // 페이지 전체에서 패턴 매칭
                    const pageText = document.body.innerText;
                    
                    // 다양한 패턴으로 경기 결과 찾기
                    const patterns = [
                        // "팀명 점수:점수 팀명" 패턴
                        /(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)\s*(\d+)\s*[-:]\s*(\d+)\s*(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)/g,
                        // "팀명 vs 팀명 점수:점수" 패턴
                        /(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)\s*(?:vs|대)\s*(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)\s*(\d+)\s*:\s*(\d+)/g,
                        // 날짜와 함께 있는 패턴
                        /(\d{2}\/\d{2}|\d{2}\.\d{2})\s*(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)\s*(\d+)\s*[-:]\s*(\d+)\s*(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)/g
                    ];
                    
                    for (const pattern of patterns) {
                        let match;
                        while ((match = pattern.exec(pageText)) !== null) {
                            console.log('Found pattern match:', match[0]);
                            
                            let team1, team2, score1, score2, date;
                            
                            if (match.length === 5) {
                                [, team1, score1, score2, team2] = match;
                            } else if (match.length === 6) {
                                [, date, team1, score1, score2, team2] = match;
                            } else if (match.length === 5 && match[3] && match[4]) {
                                [, team1, team2, score1, score2] = match;
                            }
                            
                            if (team1 && team2 && score1 !== undefined && score2 !== undefined) {
                                results.push({
                                    awayTeam: team1,
                                    homeTeam: team2,
                                    awayScore: parseInt(score1),
                                    homeScore: parseInt(score2),
                                    raw: match[0],
                                    source: 'text_pattern',
                                    date: date || 'unknown'
                                });
                            }
                        }
                    }
                    
                    return results;
                }
                
                // 실제 게임 요소 파싱
                gameElements.forEach((gameEl, index) => {
                    try {
                        console.log(`Processing game element ${index + 1}...`);
                        
                        const gameText = gameEl.textContent?.trim();
                        if (!gameText) return;
                        
                        console.log(`Game text: ${gameText.substring(0, 150)}`);
                        
                        // 다양한 팀명/점수 선택자 시도
                        const teamSelectors = [
                            '.team', '[class*="team"]', '.name', '[class*="name"]',
                            '.club', '[class*="club"]', 'strong', 'b'
                        ];
                        const scoreSelectors = [
                            '.score', '[class*="score"]', '.point', '[class*="point"]',
                            '.num', '[class*="num"]', 'span'
                        ];
                        
                        let teams = [];
                        let scores = [];
                        
                        // 팀명 찾기
                        for (const selector of teamSelectors) {
                            const teamElements = gameEl.querySelectorAll(selector);
                            if (teamElements.length >= 2) {
                                teams = Array.from(teamElements)
                                    .map(el => el.textContent?.trim())
                                    .filter(text => text && this.isValidTeam(text))
                                    .slice(0, 2);
                                if (teams.length >= 2) break;
                            }
                        }
                        
                        // 점수 찾기
                        for (const selector of scoreSelectors) {
                            const scoreElements = gameEl.querySelectorAll(selector);
                            if (scoreElements.length >= 2) {
                                scores = Array.from(scoreElements)
                                    .map(el => el.textContent?.trim())
                                    .filter(text => text && this.isValidScore(text))
                                    .slice(0, 2);
                                if (scores.length >= 2) break;
                            }
                        }
                        
                        // 텍스트에서 직접 파싱
                        if (teams.length < 2 || scores.length < 2) {
                            // 점수 패턴 찾기
                            const scoreMatch = gameText.match(/(\d+)\s*[-:]\s*(\d+)/);
                            if (scoreMatch) {
                                scores = [scoreMatch[1], scoreMatch[2]];
                            }
                            
                            // 팀명 패턴 찾기
                            const teamMatches = gameText.match(/(LG|삼성|KT|SSG|NC|KIA|롯데|두산|키움|한화)/g);
                            if (teamMatches && teamMatches.length >= 2) {
                                teams = teamMatches.slice(0, 2);
                            }
                        }
                        
                        // 날짜 추출
                        const dateMatch = gameText.match(/(\d{1,2}\/\d{1,2}|\d{1,2}\.\d{1,2}|\d{2}-\d{2})/);
                        const gameDate = dateMatch ? dateMatch[1] : 'unknown';
                        
                        if (teams.length >= 2 && scores.length >= 2) {
                            const result = {
                                awayTeam: teams[0],
                                homeTeam: teams[1], 
                                awayScore: parseInt(scores[0]),
                                homeScore: parseInt(scores[1]),
                                raw: gameText.substring(0, 100),
                                source: `${usedSelector}_${index + 1}`,
                                date: gameDate
                            };
                            
                            console.log('Parsed game:', result);
                            results.push(result);
                        }
                        
                    } catch (error) {
                        console.log('Game parsing error:', error.message);
                    }
                });

                return results;
            });

            console.log(`\n📊 다음 스포츠에서 추출된 경기 결과 (${games.length}개):`);
            
            if (games.length > 0) {
                let cleanFormat = `# 다음 스포츠 크롤링 결과 (${targetMonth})\n`;
                
                // 날짜별로 그룹화
                const gamesByDate = {};
                games.forEach(game => {
                    const date = game.date || 'unknown';
                    if (!gamesByDate[date]) {
                        gamesByDate[date] = [];
                    }
                    gamesByDate[date].push(game);
                });
                
                Object.keys(gamesByDate).forEach(date => {
                    console.log(`\n📅 ${date}:`);
                    cleanFormat += `\n${date}:\n`;
                    
                    gamesByDate[date].forEach((game, index) => {
                        console.log(`${index + 1}. ${game.raw} (${game.source})`);
                        
                        // 팀명 정규화
                        const awayTeam = this.normalizeTeamName(game.awayTeam);
                        const homeTeam = this.normalizeTeamName(game.homeTeam);
                        
                        // clean.txt 형식으로 변환
                        const cleanLine = `${awayTeam} ${game.awayScore}:${game.homeScore} ${homeTeam}(H)`;
                        cleanFormat += `${cleanLine}\n`;
                        
                        console.log(`   → ${cleanLine}`);
                    });
                });

                // 결과를 파일로 저장
                const outputPath = `test-daum-result-${targetMonth}.txt`;
                const fs = require('fs');
                fs.writeFileSync(outputPath, cleanFormat);
                
                console.log(`\n✅ 다음 스포츠 크롤링 결과를 ${outputPath}에 저장했습니다.`);
                console.log(`📝 Clean.txt 형식 미리보기:`);
                console.log(cleanFormat.substring(0, 500) + (cleanFormat.length > 500 ? '...' : ''));
                
                return { success: true, games, cleanFormat };
            } else {
                console.log('❌ 추출된 경기 결과가 없습니다.');
                return { success: false, games: [], error: 'No games found' };
            }

        } catch (error) {
            console.error('❌ 다음 스포츠 크롤링 오류:', error.message);
            return { success: false, error: error.message };
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 브라우저 종료');
        }
    }

    async runTest(targetDate = '2025-07-31') {
        try {
            await this.init();
            
            console.log('🎯 크롤링 테스트 목표:');
            console.log(`   - 날짜: ${targetDate}`);
            console.log(`   - 형식: "원정팀 점수:점수 홈팀(H)"`);
            console.log(`   - 출력: clean.txt 호환 형식\n`);

            // 네이버 크롤링 테스트
            const naverResult = await this.testNaverScraping(targetDate);
            
            if (naverResult.success) {
                console.log('\n🎉 네이버 크롤링 테스트 성공!');
                
                // 실제 clean.txt와 비교해보기
                const actualCleanPath = 'data/2025-season-data-clean.txt';
                if (fs.existsSync(actualCleanPath)) {
                    const actualData = fs.readFileSync(actualCleanPath, 'utf8');
                    const targetSection = actualData.split(targetDate)[1]?.split('\n').slice(1, 6).join('\n');
                    
                    console.log('\n📋 실제 clean.txt의 해당 날짜 데이터:');
                    console.log(targetSection || '해당 날짜 데이터 없음');
                    
                    console.log('\n🔄 크롤링으로 생성된 데이터:');
                    console.log(naverResult.cleanFormat);
                }
            }

            // KBO 공식 크롤링 테스트
            console.log('\n' + '='.repeat(50));
            const kboResult = await this.testKBOOfficialScraping(targetDate);
            
            if (kboResult.success) {
                console.log('\n🎉 KBO 공식 크롤링 테스트 성공!');
                
                if (kboResult.games && kboResult.games.length > 0) {
                    console.log('\n📋 비교 분석:');
                    console.log('🔵 네이버:', naverResult.success ? `${naverResult.games.length}개 경기` : '실패');
                    console.log('🟠 KBO 공식:', `${kboResult.games.length}개 경기`);
                    
                    // 실제 데이터와 비교
                    const actualCleanPath = 'data/2025-season-data-clean.txt';
                    if (fs.existsSync(actualCleanPath)) {
                        const actualData = fs.readFileSync(actualCleanPath, 'utf8');
                        const targetSection = actualData.split(targetDate)[1]?.split('\n').slice(1, 6).join('\n');
                        
                        console.log('\n📊 정확도 비교:');
                        console.log('🎯 실제 데이터 (5경기):', targetSection?.split('\n').length || 0, '경기');
                        console.log('📱 네이버 결과:', naverResult.games?.length || 0, '경기');
                        console.log('🏟️ KBO 공식 결과:', kboResult.games.length, '경기');
                    }
                }
            } else {
                console.log('\n❌ KBO 공식 크롤링 실패:', kboResult.error);
            }

        } catch (error) {
            console.error('❌ 테스트 실행 오류:', error.message);
        } finally {
            await this.close();
        }
    }
}

// 테스트 실행
if (require.main === module) {
    const crawler = new KBOCrawlingTest();
    
    // 날짜를 인자로 받기 (기본값: 2025-07-31)
    const targetDate = process.argv[2] || '2025-07-31';
    
    crawler.runTest(targetDate)
        .then(() => {
            console.log('\n✅ 크롤링 테스트 완료!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 테스트 실패:', error);
            process.exit(1);
        });
}

module.exports = KBOCrawlingTest;