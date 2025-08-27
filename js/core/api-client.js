/**
 * NPB API 클라이언트
 * 실제 NPB 데이터를 가져오는 역할
 */
class NPBApiClient {
    constructor() {
        this.baseUrl = '/data'; // 로컬 데이터 폴더
        this.retryCount = 3;
        this.timeout = 10000; // 10초
    }
    
    /**
     * HTTP 요청 헬퍼 메서드
     */
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('요청 시간 초과');
            }
            throw error;
        }
    }
    
    /**
     * 재시도 로직이 포함된 요청
     */
    async requestWithRetry(url, options = {}, retries = this.retryCount) {
        try {
            return await this.request(url, options);
        } catch (error) {
            if (retries > 0) {
                console.warn(`⚠️ API 요청 실패, 재시도 (${retries}회 남음):`, error.message);
                await this.delay(1000); // 1초 대기
                return this.requestWithRetry(url, options, retries - 1);
            }
            throw error;
        }
    }
    
    /**
     * 지연 함수
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * NPB 순위 데이터 가져오기
     */
    async getStandings() {
        try {
            const data = await this.requestWithRetry(`${this.baseUrl}/npb-standings.json`);
            return this.processStandingsData(data);
        } catch (error) {
            console.error('순위 데이터 로드 실패:', error);
            return this.getMockStandings(); // 목업 데이터 반환
        }
    }
    
    /**
     * NPB 팀 통계 데이터 가져오기
     */
    async getTeamStats() {
        try {
            const data = await this.requestWithRetry(`${this.baseUrl}/npb-team-stats.json`);
            return this.processTeamStatsData(data);
        } catch (error) {
            console.error('팀 통계 데이터 로드 실패:', error);
            return this.getMockTeamStats();
        }
    }
    
    /**
     * NPB 경기 기록 가져오기
     */
    async getGameRecords() {
        try {
            const data = await this.requestWithRetry(`${this.baseUrl}/npb-game-records.json`);
            return this.processGameRecordsData(data);
        } catch (error) {
            console.error('경기 기록 데이터 로드 실패:', error);
            return this.getMockGameRecords();
        }
    }
    
    /**
     * 시즌 데이터 가져오기 (크롤링된 데이터)
     */
    async getSeasonData() {
        try {
            const data = await this.requestWithRetry(`${this.baseUrl}/npb-2025-season-data.json`);
            return data;
        } catch (error) {
            console.error('시즌 데이터 로드 실패:', error);
            return null;
        }
    }
    
    /**
     * 모든 데이터 한번에 로드
     */
    async loadAllData() {
        console.log('📡 NPB 데이터 로딩 시작...');
        
        try {
            const [standings, teamStats, gameRecords, seasonData] = await Promise.allSettled([
                this.getStandings(),
                this.getTeamStats(),
                this.getGameRecords(),
                this.getSeasonData()
            ]);
            
            const result = {
                standings: standings.status === 'fulfilled' ? standings.value : null,
                teamStats: teamStats.status === 'fulfilled' ? teamStats.value : null,
                gameRecords: gameRecords.status === 'fulfilled' ? gameRecords.value : null,
                seasonData: seasonData.status === 'fulfilled' ? seasonData.value : null,
                loadTime: new Date()
            };
            
            console.log('✅ NPB 데이터 로딩 완료:', result);
            return result;
        } catch (error) {
            console.error('❌ NPB 데이터 로딩 실패:', error);
            throw error;
        }
    }
    
    /**
     * 순위 데이터 처리
     */
    processStandingsData(data) {
        if (!data || !Array.isArray(data)) return this.getMockStandings();
        
        return data.map(team => ({
            ...team,
            winPct: team.wins / (team.wins + team.losses + team.draws),
            gamesBehind: 0 // 계산 필요
        })).sort((a, b) => b.winPct - a.winPct);
    }
    
    /**
     * 팀 통계 데이터 처리
     */
    processTeamStatsData(data) {
        return data || this.getMockTeamStats();
    }
    
    /**
     * 경기 기록 데이터 처리
     */
    processGameRecordsData(data) {
        return data || this.getMockGameRecords();
    }
    
    /**
     * 목업 순위 데이터 (개발용)
     */
    getMockStandings() {
        return [
            { name: '読売ジャイアンツ', league: 'central', wins: 45, losses: 30, draws: 0, winPct: 0.600 },
            { name: '阪神タイガース', league: 'central', wins: 42, losses: 33, draws: 0, winPct: 0.560 },
            { name: '広島東洋カープ', league: 'central', wins: 40, losses: 35, draws: 0, winPct: 0.533 },
            { name: '横浜DeNAベイスターズ', league: 'central', wins: 38, losses: 37, draws: 0, winPct: 0.507 },
            { name: '中日ドラゴンズ', league: 'central', wins: 35, losses: 40, draws: 0, winPct: 0.467 },
            { name: 'ヤクルトスワローズ', league: 'central', wins: 32, losses: 43, draws: 0, winPct: 0.427 },
            { name: '福岡ソフトバンクホークス', league: 'pacific', wins: 48, losses: 27, draws: 0, winPct: 0.640 },
            { name: '千葉ロッテマリーンズ', league: 'pacific', wins: 44, losses: 31, draws: 0, winPct: 0.587 },
            { name: '埼玉西武ライオンズ', league: 'pacific', wins: 41, losses: 34, draws: 0, winPct: 0.547 },
            { name: '東北楽天ゴールデンイーグルス', league: 'pacific', wins: 38, losses: 37, draws: 0, winPct: 0.507 },
            { name: '北海道日本ハムファイターズ', league: 'pacific', wins: 35, losses: 40, draws: 0, winPct: 0.467 },
            { name: 'オリックスバファローズ', league: 'pacific', wins: 29, losses: 46, draws: 0, winPct: 0.387 }
        ];
    }
    
    /**
     * 목업 팀 통계 (개발용)
     */
    getMockTeamStats() {
        return this.getMockStandings().map(team => ({
            ...team,
            runsScored: Math.floor(Math.random() * 200) + 300,
            runsAllowed: Math.floor(Math.random() * 200) + 300,
            homeWins: Math.floor(team.wins * 0.6),
            awayWins: Math.floor(team.wins * 0.4)
        }));
    }
    
    /**
     * 목업 경기 기록 (개발용)
     */
    getMockGameRecords() {
        return {
            totalGames: 1000,
            lastUpdate: new Date().toISOString(),
            games: []
        };
    }
}

// 전역 API 클라이언트 인스턴스
if (typeof window !== 'undefined') {
    window.npbApiClient = new NPBApiClient();
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBApiClient;
}