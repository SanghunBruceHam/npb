/**
 * NPB 홈/원정 성적 분석 테이블 모듈
 * 각 팀의 홈구장과 원정에서의 성적을 비교 분석
 */
class NPBHomeAwayTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`홈/원정 테이블 컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }
        
        this.data = null;
        this.teamStats = null;
        this.gameRecords = null;
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        // 데이터 구독 설정
        this.subscribeToData();
        this.createTable();
    }
    
    /**
     * 데이터 구독 설정
     */
    subscribeToData() {
        if (!window.npbDataManager) return;
        
        // 순위 데이터 구독
        window.npbDataManager.subscribe('standings', (data) => {
            this.data = data;
            this.renderIfReady();
        });
        
        // 팀 통계 데이터 구독
        window.npbDataManager.subscribe('teamStats', (data) => {
            this.teamStats = data;
            this.renderIfReady();
        });
        
        // 경기 기록 데이터 구독
        window.npbDataManager.subscribe('gameRecords', (data) => {
            this.gameRecords = data;
            this.renderIfReady();
        });
        
        // 로딩 상태 구독
        window.npbDataManager.subscribe('loading', (isLoading) => {
            this.showLoadingState(isLoading);
        });
    }
    
    /**
     * 테이블 구조 생성
     */
    createTable() {
        this.container.innerHTML = `
            <div class="home-away-section">
                <h3>🏠 홈/원정 성적 분석</h3>
                <p class="section-description">각 팀의 홈구장과 원정경기 성적을 비교합니다.</p>
                
                <div class="analysis-controls">
                    <div class="sort-controls">
                        <label>정렬:</label>
                        <select id="home-away-sort">
                            <option value="homeWinPct">홈 승률순</option>
                            <option value="awayWinPct">원정 승률순</option>
                            <option value="homeDifference">홈/원정 차이순</option>
                            <option value="totalWins">총 승수순</option>
                        </select>
                    </div>
                    
                    <div class="league-filter">
                        <label>리그:</label>
                        <select id="home-away-league">
                            <option value="all">전체</option>
                            <option value="central">세리그</option>
                            <option value="pacific">파리그</option>
                        </select>
                    </div>
                </div>
                
                <table class="home-away-table">
                    <thead>
                        <tr>
                            <th rowspan="2">팀</th>
                            <th colspan="4">홈 경기</th>
                            <th colspan="4">원정 경기</th>
                            <th rowspan="2">홈/원정<br>승률 차이</th>
                            <th rowspan="2">홈 우위도</th>
                        </tr>
                        <tr>
                            <th>승</th>
                            <th>패</th>
                            <th>무</th>
                            <th>승률</th>
                            <th>승</th>
                            <th>패</th>
                            <th>무</th>
                            <th>승률</th>
                        </tr>
                    </thead>
                    <tbody id="home-away-table-body">
                        <!-- 홈/원정 분석 데이터 -->
                    </tbody>
                </table>
                
                <div class="home-away-insights">
                    <div id="home-away-stats" class="stats-summary">
                        <!-- 통계 요약 -->
                    </div>
                </div>
                
                <div id="home-away-loading" class="loading-indicator" style="display: none;">
                    홈/원정 성적 데이터 로딩 중...
                </div>
            </div>
        `;
        
        this.setupControls();
    }
    
    /**
     * 컨트롤 이벤트 설정
     */
    setupControls() {
        const sortSelect = document.getElementById('home-away-sort');
        const leagueSelect = document.getElementById('home-away-league');
        
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.render());
        }
        
        if (leagueSelect) {
            leagueSelect.addEventListener('change', () => this.render());
        }
    }
    
    /**
     * 데이터가 준비되면 렌더링
     */
    renderIfReady() {
        if (this.data && this.teamStats) {
            this.render();
        }
    }
    
    /**
     * 데이터 렌더링
     */
    render() {
        if (!this.data || !this.teamStats) {
            console.warn('홈/원정 분석에 필요한 데이터가 없습니다');
            return;
        }
        
        const processedData = this.processHomeAwayData();
        const filteredData = this.filterData(processedData);
        const sortedData = this.sortData(filteredData);
        
        this.renderTable(sortedData);
        this.renderStats(processedData);
        
        console.log('🏠 홈/원정 분석 테이블 렌더링 완료');
    }
    
    /**
     * 홈/원정 데이터 처리
     */
    processHomeAwayData() {
        return this.data.map(team => {
            const stats = this.teamStats.find(stat => stat.name === team.name) || {};
            
            // 홈/원정 승부 계산 (통계 데이터가 없으면 추정)
            const homeWins = stats.homeWins || Math.floor(team.wins * 0.55); // 홈 우위 가정
            const awayWins = team.wins - homeWins;
            const homeLosses = stats.homeLosses || Math.floor(team.losses * 0.45);
            const awayLosses = team.losses - homeLosses;
            const homeDraws = Math.floor((team.draws || 0) * 0.5);
            const awayDraws = (team.draws || 0) - homeDraws;
            
            const homeGames = homeWins + homeLosses + homeDraws;
            const awayGames = awayWins + awayLosses + awayDraws;
            
            const homeWinPct = homeGames > 0 ? homeWins / homeGames : 0;
            const awayWinPct = awayGames > 0 ? awayWins / awayGames : 0;
            const homeDifference = homeWinPct - awayWinPct;
            
            return {
                ...team,
                homeWins,
                homeLosses,
                homeDraws,
                homeWinPct,
                awayWins,
                awayLosses,
                awayDraws,
                awayWinPct,
                homeDifference,
                homeAdvantage: this.getHomeAdvantageLevel(homeDifference)
            };
        });
    }
    
    /**
     * 홈 우위도 레벨 계산
     */
    getHomeAdvantageLevel(difference) {
        if (difference > 0.15) return '매우 강함';
        if (difference > 0.08) return '강함';
        if (difference > 0.02) return '보통';
        if (difference > -0.02) return '미미함';
        if (difference > -0.08) return '역전';
        return '심각한 역전';
    }
    
    /**
     * 데이터 필터링
     */
    filterData(data) {
        const leagueFilter = document.getElementById('home-away-league')?.value || 'all';
        
        if (leagueFilter === 'all') return data;
        
        return data.filter(team => NPBUtils.getTeamLeague(team.name) === leagueFilter);
    }
    
    /**
     * 데이터 정렬
     */
    sortData(data) {
        const sortBy = document.getElementById('home-away-sort')?.value || 'homeWinPct';
        
        return [...data].sort((a, b) => {
            switch (sortBy) {
                case 'homeWinPct': return b.homeWinPct - a.homeWinPct;
                case 'awayWinPct': return b.awayWinPct - a.awayWinPct;
                case 'homeDifference': return b.homeDifference - a.homeDifference;
                case 'totalWins': return b.wins - a.wins;
                default: return b.homeWinPct - a.homeWinPct;
            }
        });
    }
    
    /**
     * 테이블 렌더링
     */
    renderTable(teams) {
        const tbody = document.getElementById('home-away-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = teams.map(team => {
            const logoFileName = NPBUtils.getTeamLogoFileName(team.name);
            const league = NPBUtils.getTeamLeague(team.name);
            
            // 홈/원정 차이에 따른 색상 클래스
            let differenceClass = '';
            if (team.homeDifference > 0.08) differenceClass = 'home-strong';
            else if (team.homeDifference > 0.02) differenceClass = 'home-advantage';
            else if (team.homeDifference < -0.08) differenceClass = 'away-strong';
            else if (team.homeDifference < -0.02) differenceClass = 'away-advantage';
            
            return `
                <tr class="team-row">
                    <td class="team-name">
                        <img src="/images/${league}/${logoFileName}" 
                             alt="${team.name}" class="team-logo" onerror="this.style.display='none'">
                        <span>${team.name}</span>
                    </td>
                    <td class="home-wins">${team.homeWins}</td>
                    <td class="home-losses">${team.homeLosses}</td>
                    <td class="home-draws">${team.homeDraws}</td>
                    <td class="home-winpct">${NPBUtils.formatWinPct(team.homeWinPct)}</td>
                    <td class="away-wins">${team.awayWins}</td>
                    <td class="away-losses">${team.awayLosses}</td>
                    <td class="away-draws">${team.awayDraws}</td>
                    <td class="away-winpct">${NPBUtils.formatWinPct(team.awayWinPct)}</td>
                    <td class="home-difference ${differenceClass}">
                        ${team.homeDifference >= 0 ? '+' : ''}${team.homeDifference.toFixed(3)}
                    </td>
                    <td class="home-advantage">${team.homeAdvantage}</td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * 통계 요약 렌더링
     */
    renderStats(teams) {
        const statsElement = document.getElementById('home-away-stats');
        if (!statsElement) return;
        
        const avgHomeDifference = teams.reduce((sum, team) => sum + team.homeDifference, 0) / teams.length;
        const strongHomeTeams = teams.filter(team => team.homeDifference > 0.08).length;
        const reverseHomeTeams = teams.filter(team => team.homeDifference < -0.02).length;
        
        const centralTeams = teams.filter(team => NPBUtils.getTeamLeague(team.name) === 'central');
        const pacificTeams = teams.filter(team => NPBUtils.getTeamLeague(team.name) === 'pacific');
        
        const centralAvg = centralTeams.reduce((sum, team) => sum + team.homeDifference, 0) / centralTeams.length;
        const pacificAvg = pacificTeams.reduce((sum, team) => sum + team.homeDifference, 0) / pacificTeams.length;
        
        statsElement.innerHTML = `
            <h4>📊 홈/원정 성적 통계</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <label>전체 평균 홈 우위:</label>
                    <span>${avgHomeDifference >= 0 ? '+' : ''}${avgHomeDifference.toFixed(3)}</span>
                </div>
                <div class="stat-item">
                    <label>강한 홈 우위 팀:</label>
                    <span>${strongHomeTeams}팀</span>
                </div>
                <div class="stat-item">
                    <label>홈 역전 팀:</label>
                    <span>${reverseHomeTeams}팀</span>
                </div>
                <div class="stat-item">
                    <label>세리그 평균:</label>
                    <span>${centralAvg >= 0 ? '+' : ''}${centralAvg.toFixed(3)}</span>
                </div>
                <div class="stat-item">
                    <label>파리그 평균:</label>
                    <span>${pacificAvg >= 0 ? '+' : ''}${pacificAvg.toFixed(3)}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 로딩 상태 표시
     */
    showLoadingState(isLoading) {
        const loadingElement = document.getElementById('home-away-loading');
        if (loadingElement) {
            loadingElement.style.display = isLoading ? 'block' : 'none';
        }
    }
    
    /**
     * 데이터 새로고침
     */
    async refresh() {
        if (window.npbApiClient && window.npbDataManager) {
            window.npbDataManager.setLoading(true);
            try {
                const [standings, teamStats, gameRecords] = await Promise.all([
                    window.npbApiClient.getStandings(),
                    window.npbApiClient.getTeamStats(),
                    window.npbApiClient.getGameRecords()
                ]);
                
                window.npbDataManager.updateData('standings', standings);
                window.npbDataManager.updateData('teamStats', teamStats);
                window.npbDataManager.updateData('gameRecords', gameRecords);
            } catch (error) {
                console.error('홈/원정 데이터 새로고침 실패:', error);
            } finally {
                window.npbDataManager.setLoading(false);
            }
        }
    }
}

// 전역 사용을 위한 등록
if (typeof window !== 'undefined') {
    window.NPBHomeAwayTable = NPBHomeAwayTable;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBHomeAwayTable;
}