// KBO 데이터 크롤링 스크립트
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

class KBODataCrawler {
    constructor() {
        this.baseUrl = 'https://www.koreabaseball.com';
        this.data = {
            standings: [],
            headToHead: {},
            lastUpdated: new Date().toISOString()
        };
    }

    async crawlStandings() {
        try {
            console.log('📊 KBO 순위표 데이터 수집 중...');
            
            // KBO 공식 사이트 순위 페이지 크롤링
            const response = await axios.get(`${this.baseUrl}/Record/TeamRank/TeamRankDaily.aspx`);
            const $ = cheerio.load(response.data);
            
            const standings = [];
            
            // 순위표 테이블에서 데이터 추출
            $('.tData tbody tr').each((index, element) => {
                const row = $(element);
                const rank = parseInt(row.find('td').eq(0).text().trim());
                const team = row.find('td').eq(1).text().trim();
                const games = parseInt(row.find('td').eq(2).text().trim());
                const wins = parseInt(row.find('td').eq(3).text().trim());
                const losses = parseInt(row.find('td').eq(4).text().trim());
                const draws = parseInt(row.find('td').eq(5).text().trim());
                const winPct = parseFloat(row.find('td').eq(6).text().trim());
                const gamesBehind = row.find('td').eq(7).text().trim();
                const recent10 = row.find('td').eq(8).text().trim();
                const streak = row.find('td').eq(9).text().trim();
                
                standings.push({
                    rank,
                    team: this.normalizeTeamName(team),
                    games,
                    wins,
                    losses,
                    draws,
                    winPct,
                    gamesBehind: gamesBehind === '-' ? 0 : parseFloat(gamesBehind),
                    recent10,
                    streak
                });
            });
            
            this.data.standings = standings;
            console.log(`✅ 순위표 데이터 수집 완료: ${standings.length}개 팀`);
            
        } catch (error) {
            console.error('❌ 순위표 크롤링 오류:', error.message);
            throw error;
        }
    }

    async crawlHeadToHead() {
        try {
            console.log('⚔️ 팀간 상대전적 데이터 수집 중...');
            
            // 상대전적 페이지 크롤링
            const response = await axios.get(`${this.baseUrl}/Record/TeamVs/TeamVs.aspx`);
            const $ = cheerio.load(response.data);
            
            const headToHead = {};
            
            // 상대전적 테이블에서 데이터 추출
            // 실제 구현에서는 KBO 사이트 구조에 맞게 셀렉터 조정 필요
            $('.vs-table tbody tr').each((index, element) => {
                const row = $(element);
                const homeTeam = this.normalizeTeamName(row.find('td').eq(0).text().trim());
                
                if (!headToHead[homeTeam]) {
                    headToHead[homeTeam] = {};
                }
                
                // 각 상대팀과의 전적 수집
                row.find('td').slice(1).each((i, cell) => {
                    const record = $(cell).text().trim();
                    const awayTeam = this.getTeamByIndex(i);
                    if (awayTeam && record !== '-') {
                        headToHead[homeTeam][awayTeam] = record;
                    }
                });
            });
            
            this.data.headToHead = headToHead;
            console.log('✅ 상대전적 데이터 수집 완료');
            
        } catch (error) {
            console.error('❌ 상대전적 크롤링 오류:', error.message);
            // 상대전적은 중요도가 낮으므로 기본값 사용
            this.data.headToHead = this.getDefaultHeadToHead();
        }
    }

    normalizeTeamName(teamName) {
        // 팀명 정규화 (KBO 사이트와 우리 데이터 형식 맞춤)
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

    getTeamByIndex(index) {
        const teams = ['한화', 'LG', '롯데', 'KT', 'KIA', '삼성', 'SSG', 'NC', '두산', '키움'];
        return teams[index] || null;
    }

    getDefaultHeadToHead() {
        // 크롤링 실패시 사용할 기본 상대전적 (현재 데이터와 동일)
        return {
            "한화": { "LG": "4-5-1", "롯데": "4-6-0", "KT": "8-3-0", "KIA": "8-3-0", "삼성": "5-3-0", "SSG": "6-6-0", "NC": "7-4-1", "두산": "6-5-1", "키움": "9-1-0" },
            "LG": { "한화": "5-4-1", "롯데": "6-4-1", "KT": "3-4-0", "KIA": "7-4-0", "삼성": "6-6-0", "SSG": "8-4-0", "NC": "6-5-0", "두산": "6-5-0", "키움": "8-4-0" },
            // ... 나머지 팀들
        };
    }

    async saveData() {
        try {
            // 수집한 데이터를 JSON 파일로 저장
            const dataPath = './data/kbo-data.json';
            fs.writeFileSync(dataPath, JSON.stringify(this.data, null, 2), 'utf8');
            console.log(`💾 데이터 저장 완료: ${dataPath}`);
            
            // 백업 파일도 생성 (날짜별)
            const date = new Date().toISOString().split('T')[0];
            const backupPath = `./data/backup/kbo-data-${date}.json`;
            fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2), 'utf8');
            
        } catch (error) {
            console.error('❌ 데이터 저장 오류:', error.message);
            throw error;
        }
    }

    async run() {
        try {
            console.log('🚀 KBO 데이터 크롤링 시작...');
            
            await this.crawlStandings();
            await this.crawlHeadToHead();
            await this.saveData();
            
            console.log('✅ KBO 데이터 크롤링 완료!');
            console.log(`📊 수집된 팀 수: ${this.data.standings.length}`);
            console.log(`⏰ 업데이트 시간: ${this.data.lastUpdated}`);
            
        } catch (error) {
            console.error('❌ 크롤링 실패:', error.message);
            process.exit(1);
        }
    }
}

// 스크립트 실행
if (require.main === module) {
    const crawler = new KBODataCrawler();
    crawler.run();
}

module.exports = KBODataCrawler;