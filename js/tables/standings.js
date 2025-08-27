/**
 * NPB 순위표 모듈
 * 세리그와 파리그 순위 테이블 관리
 */
class NPBStandingsTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`순위표 컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }
        
        this.data = null;
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        // 데이터 매니저에서 순위 데이터 구독
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('standings', (data) => {
                this.data = data;
                this.render();
            });
        }
        
        // 로딩 상태 구독
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('loading', (isLoading) => {
                this.showLoadingState(isLoading);
            });
        }
        
        this.createTable();
    }
    
    /**
     * 테이블 구조 생성
     */
    createTable() {
        this.container.innerHTML = `
            <div class="standings-section">
                <div class="league-section">
                    <h3>セントラル・リーグ (Central League)</h3>
                    <table id="central-standings" class="standings-table">
                        <thead>
                            <tr>
                                <th>순위</th>
                                <th>팀</th>
                                <th>경기</th>
                                <th>승</th>
                                <th>패</th>
                                <th>무</th>
                                <th>승률</th>
                                <th>게임차</th>
                            </tr>
                        </thead>
                        <tbody id="central-standings-body">
                            <!-- 세리그 순위 데이터 -->
                        </tbody>
                    </table>
                </div>
                
                <div class="league-section">
                    <h3>パシフィック・リーグ (Pacific League)</h3>
                    <table id="pacific-standings" class="standings-table">
                        <thead>
                            <tr>
                                <th>순위</th>
                                <th>팀</th>
                                <th>경기</th>
                                <th>승</th>
                                <th>패</th>
                                <th>무</th>
                                <th>승률</th>
                                <th>게임차</th>
                            </tr>
                        </thead>
                        <tbody id="pacific-standings-body">
                            <!-- 파리그 순위 데이터 -->
                        </tbody>
                    </table>
                </div>
                
                <div id="standings-loading" class="loading-indicator" style="display: none;">
                    데이터 로딩 중...
                </div>
            </div>
        `;
    }
    
    /**
     * 데이터 렌더링
     */
    render() {
        if (!this.data || !Array.isArray(this.data)) {
            console.warn('순위 데이터가 없습니다');
            return;
        }
        
        // 리그별로 데이터 분리
        const centralTeams = this.data
            .filter(team => NPBUtils.getTeamLeague(team.name) === 'central')
            .sort((a, b) => b.winPct - a.winPct);
            
        const pacificTeams = this.data
            .filter(team => NPBUtils.getTeamLeague(team.name) === 'pacific')
            .sort((a, b) => b.winPct - a.winPct);
        
        // 게임차 계산
        this.calculateGamesBehind(centralTeams);
        this.calculateGamesBehind(pacificTeams);
        
        // 테이블 렌더링
        this.renderLeagueTable('central-standings-body', centralTeams);
        this.renderLeagueTable('pacific-standings-body', pacificTeams);
        
        console.log('🏆 순위표 렌더링 완료');
    }
    
    /**
     * 리그별 테이블 렌더링
     */
    renderLeagueTable(bodyId, teams) {
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;
        
        tbody.innerHTML = teams.map((team, index) => {
            const rank = index + 1;
            const totalGames = team.wins + team.losses + (team.draws || 0);
            const winPct = NPBUtils.formatWinPct(team.winPct);
            const gamesBehind = team.gamesBehind === 0 ? '-' : team.gamesBehind.toFixed(1);
            const logoFileName = NPBUtils.getTeamLogoFileName(team.name);
            
            return `
                <tr class="team-row ${rank <= 3 ? 'playoff-position' : ''}">
                    <td class="rank">${rank}</td>
                    <td class="team-name">
                        <img src="/images/${NPBUtils.getTeamLeague(team.name)}/${logoFileName}" 
                             alt="${team.name}" class="team-logo" onerror="this.style.display='none'">
                        <span>${team.name}</span>
                    </td>
                    <td class="games">${totalGames}</td>
                    <td class="wins">${team.wins}</td>
                    <td class="losses">${team.losses}</td>
                    <td class="draws">${team.draws || 0}</td>
                    <td class="win-pct">${winPct}</td>
                    <td class="games-behind">${gamesBehind}</td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * 게임차 계산
     */
    calculateGamesBehind(teams) {
        if (teams.length === 0) return;
        
        const leader = teams[0];
        teams.forEach(team => {
            if (team === leader) {
                team.gamesBehind = 0;
            } else {
                team.gamesBehind = NPBUtils.calculateGamesBehind(team, leader);
            }
        });
    }
    
    /**
     * 로딩 상태 표시
     */
    showLoadingState(isLoading) {
        const loadingElement = document.getElementById('standings-loading');
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
                const data = await window.npbApiClient.getStandings();
                window.npbDataManager.updateData('standings', data);
            } catch (error) {
                console.error('순위 데이터 새로고침 실패:', error);
            } finally {
                window.npbDataManager.setLoading(false);
            }
        }
    }
}

// 전역 사용을 위한 등록
if (typeof window !== 'undefined') {
    window.NPBStandingsTable = NPBStandingsTable;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBStandingsTable;
}