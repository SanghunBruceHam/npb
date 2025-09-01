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
        // 기본 파일 로드. 실제 데이터 우선화를 위해 loadAllData에서 seasonData 기반으로 재계산함.
        const data = await this.requestWithRetry(`${this.baseUrl}/npb-standings.json`);
        return this.processStandingsData(data);
    }
    
    /**
     * NPB 팀 통계 데이터 가져오기
     */
    async getTeamStats() {
        const data = await this.requestWithRetry(`${this.baseUrl}/npb-team-stats.json`);
        return this.processTeamStatsData(data);
    }
    
    /**
     * NPB 경기 기록 가져오기
     */
    async getGameRecords() {
        const data = await this.requestWithRetry(`${this.baseUrl}/npb-game-records.json`);
        return this.processGameRecordsData(data);
    }
    
    /**
     * 시즌 데이터 가져오기 (크롤링된 데이터)
     */
    async getSeasonData() {
        const data = await this.requestWithRetry(`${this.baseUrl}/npb-2025-season-data.json`);
        return data;
    }
    
    /**
     * 모든 데이터 한번에 로드
     */
    async loadAllData() {
        console.log('📡 NPB 데이터 로딩 시작...');
        
        try {
            // 시즌 데이터 우선 로드(실제 데이터 계산 기반)
            const seasonData = await this.getSeasonData().catch(() => null);
            const [standingsRes, teamStatsRes, gameRecordsRes] = await Promise.allSettled([
                this.getStandings(),
                this.getTeamStats(),
                this.getGameRecords()
            ]);

            let standings = standingsRes.status === 'fulfilled' ? standingsRes.value : null;
            let teamStats = teamStatsRes.status === 'fulfilled' ? teamStatsRes.value : null;
            let gameRecords = gameRecordsRes.status === 'fulfilled' ? gameRecordsRes.value : null;

            // 시즌 데이터가 있으면 이를 기반으로 실시간 계산하여 덮어쓰기
            if (seasonData && Array.isArray(seasonData)) {
                try {
                    standings = this.buildStandingsFromSeasonData(seasonData);
                } catch (e) { console.warn('standings 재계산 실패:', e.message); }
                try {
                    teamStats = this.buildTeamStatsFromSeasonData(seasonData);
                } catch (e) { console.warn('teamStats 재계산 실패:', e.message); }
                try {
                    gameRecords = this.buildGameRecordsFromSeasonData(seasonData);
                } catch (e) { console.warn('gameRecords 재구성 실패:', e.message); }
            }

            const result = { standings, teamStats, gameRecords, seasonData, loadTime: new Date() };
            
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
        // data가 객체이고 standings 배열을 가지고 있는 경우
        if (data && data.standings && Array.isArray(data.standings)) {
            return data.standings.map(team => ({
                ...team,
                winPct: team.winPct || ((team.wins + team.losses) > 0 ? team.wins / (team.wins + team.losses) : 0),
                gamesBehind: team.gamesBehind || 0
            }));
        }
        // data가 직접 배열인 경우 (legacy 지원)
        else if (Array.isArray(data)) {
            return data.map(team => ({
                ...team,
                winPct: team.winPct || ((team.wins + team.losses) > 0 ? team.wins / (team.wins + team.losses) : 0),
                gamesBehind: team.gamesBehind || 0
            }));
        }
        return null;
    }
    
    /**
     * 팀 통계 데이터 처리
     */
    processTeamStatsData(data) {
        return data || null;
    }
    
    /**
     * 경기 기록 데이터 처리
     */
    processGameRecordsData(data) {
        return data || null;
    }
    
    /**
     * 목업 순위 데이터 (개발용)
     */
    // 시즌 데이터 기반 실시간 계산기들
    buildStandingsFromSeasonData(seasonData) {
        const teamSet = new Set();
        seasonData.forEach(day => (day.games || []).forEach(g => {
            teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
            teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
        }));
        const teams = Array.from(teamSet);
        const tally = new Map(teams.map(t => [t, { wins:0, losses:0, draws:0 }]));
        const days = [...seasonData].sort((a,b)=> new Date(a.date)-new Date(b.date));
        for (const day of days) {
            for (const g of (day.games || [])) {
                const hs = g.homeScore, as = g.awayScore;
                if (typeof hs !== 'number' || typeof as !== 'number') continue;
                const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
                const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
                const hT = tally.get(h), aT = tally.get(a);
                if (hs === as) { hT.draws++; aT.draws++; }
                else if (hs > as) { hT.wins++; aT.losses++; }
                else { hT.losses++; aT.wins++; }
            }
        }
        return teams.map(name => {
            const t = tally.get(name);
            const league = NPBUtils.getTeamLeague(name);
            const winPct = NPBUtils.calculateWinPct(t.wins, t.losses, t.draws);
            return { name, league, wins: t.wins, losses: t.losses, draws: t.draws, winPct };
        }).sort((a,b)=> b.winPct - a.winPct || (b.wins - a.wins));
    }

    buildTeamStatsFromSeasonData(seasonData) {
        const teamSet = new Set();
        seasonData.forEach(day => (day.games || []).forEach(g => {
            teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
            teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
        }));
        const teams = Array.from(teamSet);
        const init = () => ({ runsScored:0, runsAllowed:0, wins:0, losses:0, draws:0, homeWins:0, awayWins:0 });
        const map = new Map(teams.map(t=>[t, init()]));
        for (const day of seasonData) {
            for (const g of (day.games || [])) {
                const hs = g.homeScore, as = g.awayScore;
                if (typeof hs !== 'number' || typeof as !== 'number') continue;
                const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
                const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
                const hm = map.get(h), am = map.get(a);
                hm.runsScored += hs; hm.runsAllowed += as;
                am.runsScored += as; am.runsAllowed += hs;
                if (hs === as) { hm.draws++; am.draws++; }
                else if (hs > as) { hm.wins++; am.losses++; hm.homeWins++; }
                else { am.wins++; hm.losses++; am.awayWins++; }
            }
        }
        return teams.map(name => {
            const s = map.get(name);
            const league = NPBUtils.getTeamLeague(name);
            return { name, league, ...s };
        });
    }

    buildGameRecordsFromSeasonData(seasonData) {
        const games = [];
        let finalCount = 0;
        seasonData.forEach(day => {
            (day.games || []).forEach(g => {
                games.push({
                    date: day.date,
                    homeTeam: g.homeTeam || g.home,
                    awayTeam: g.awayTeam || g.away,
                    homeScore: g.homeScore,
                    awayScore: g.awayScore,
                    status: g.status || g.gameType || null
                });
                if (typeof g.homeScore === 'number' && typeof g.awayScore === 'number') finalCount++;
            });
        });
        return {
            totalGames: finalCount,
            lastUpdate: new Date().toISOString(),
            games
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
