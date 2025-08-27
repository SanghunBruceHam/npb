/**
 * NPB 피타고리안 승률 분석 테이블 모듈
 * 실제 승률과 피타고리안 승률(득실점 기반 예상 승률) 비교
 */
class NPBPythagoreanTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`피타고리안 테이블 컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }
        
        this.data = null;
        this.teamStats = null;
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        // 순위 데이터 구독
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('standings', (data) => {
                this.data = data;
                this.renderIfReady();
            });
        }
        
        // 팀 통계 데이터 구독
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('teamStats', (data) => {
                this.teamStats = data;
                this.renderIfReady();
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
            <div class="pythagorean-section">
                <h3>🔬 피타고리안 승률 분석</h3>
                <p class="section-description">득실점을 기반으로 한 예상 승률과 실제 승률을 비교합니다.</p>
                
                <div class="league-tabs">
                    <button class="tab-button active" data-league="central">세리그</button>
                    <button class="tab-button" data-league="pacific">파리그</button>
                </div>
                
                <table class="pythagorean-table">
                    <thead>
                        <tr>
                            <th>순위</th>
                            <th>팀</th>
                            <th>실제 승률</th>
                            <th>피타고리안 승률</th>
                            <th>차이</th>
                            <th>득점</th>
                            <th>실점</th>
                            <th>득실차</th>
                            <th>운/실력</th>
                        </tr>
                    </thead>
                    <tbody id="pythagorean-table-body">
                        <!-- 피타고리안 분석 데이터 -->
                    </tbody>
                </table>
                
                <div id="pythagorean-loading" class="loading-indicator" style="display: none;">
                    피타고리안 분석 데이터 로딩 중...
                </div>
            </div>
        `;
        
        this.setupTabNavigation();
    }
    
    /**
     * 탭 네비게이션 설정
     */
    setupTabNavigation() {
        const tabButtons = this.container.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 모든 탭 비활성화
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 탭 활성화
                e.target.classList.add('active');
                
                const league = e.target.dataset.league;
                this.renderLeague(league);
            });
        });
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
            console.warn('피타고리안 분석에 필요한 데이터가 없습니다');
            return;
        }
        
        // 기본적으로 세리그 표시
        this.renderLeague('central');
        console.log('🔬 피타고리안 분석 테이블 렌더링 완료');
    }
    
    /**
     * 리그별 렌더링
     */
    renderLeague(league) {
        const leagueTeams = this.data
            .filter(team => NPBUtils.getTeamLeague(team.name) === league)
            .sort((a, b) => b.winPct - a.winPct);
        
        // 팀 통계와 결합
        const enrichedTeams = leagueTeams.map(team => {
            const stats = this.teamStats.find(stat => stat.name === team.name);
            return this.calculatePythagoreanStats(team, stats);
        });
        
        this.renderTable(enrichedTeams);
    }
    
    /**
     * 피타고리안 통계 계산
     */
    calculatePythagoreanStats(team, stats) {
        const runsScored = stats?.runsScored || 0;
        const runsAllowed = stats?.runsAllowed || 0;
        const pythagoreanWinPct = NPBUtils.calculatePythagoreanWinPct(runsScored, runsAllowed);
        const actualWinPct = team.winPct;
        const difference = actualWinPct - pythagoreanWinPct;
        const runDifferential = runsScored - runsAllowed;
        
        return {
            ...team,
            runsScored,
            runsAllowed,
            runDifferential,
            actualWinPct,
            pythagoreanWinPct,
            difference,
            luckFactor: this.getLuckFactor(difference)
        };
    }
    
    /**
     * 운/실력 요소 판단
     */
    getLuckFactor(difference) {
        if (Math.abs(difference) < 0.02) return '평균적';
        if (difference > 0.05) return '매우 운이 좋음';
        if (difference > 0.02) return '운이 좋음';
        if (difference < -0.05) return '매우 불운';
        if (difference < -0.02) return '불운';
        return '평균적';
    }
    
    /**
     * 테이블 렌더링
     */
    renderTable(teams) {
        const tbody = document.getElementById('pythagorean-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = teams.map((team, index) => {
            const rank = index + 1;
            const logoFileName = NPBUtils.getTeamLogoFileName(team.name);
            const league = NPBUtils.getTeamLeague(team.name);
            
            // 차이에 따른 색상 클래스
            let differenceClass = '';
            if (team.difference > 0.02) differenceClass = 'positive-large';
            else if (team.difference > 0) differenceClass = 'positive';
            else if (team.difference < -0.02) differenceClass = 'negative-large';
            else if (team.difference < 0) differenceClass = 'negative';
            
            return `
                <tr class="team-row">
                    <td class="rank">${rank}</td>
                    <td class="team-name">
                        <img src="/images/${league}/${logoFileName}" 
                             alt="${team.name}" class="team-logo" onerror="this.style.display='none'">
                        <span>${team.name}</span>
                    </td>
                    <td class="actual-winpct">${NPBUtils.formatWinPct(team.actualWinPct)}</td>
                    <td class="pythagorean-winpct">${NPBUtils.formatWinPct(team.pythagoreanWinPct)}</td>
                    <td class="difference ${differenceClass}">
                        ${team.difference >= 0 ? '+' : ''}${team.difference.toFixed(3)}
                    </td>
                    <td class="runs-scored">${NPBUtils.formatNumber(team.runsScored)}</td>
                    <td class="runs-allowed">${NPBUtils.formatNumber(team.runsAllowed)}</td>
                    <td class="run-differential ${team.runDifferential >= 0 ? 'positive' : 'negative'}">
                        ${team.runDifferential >= 0 ? '+' : ''}${NPBUtils.formatNumber(team.runDifferential)}
                    </td>
                    <td class="luck-factor">${team.luckFactor}</td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * 로딩 상태 표시
     */
    showLoadingState(isLoading) {
        const loadingElement = document.getElementById('pythagorean-loading');
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
                const [standings, teamStats] = await Promise.all([
                    window.npbApiClient.getStandings(),
                    window.npbApiClient.getTeamStats()
                ]);
                
                window.npbDataManager.updateData('standings', standings);
                window.npbDataManager.updateData('teamStats', teamStats);
            } catch (error) {
                console.error('피타고리안 데이터 새로고침 실패:', error);
            } finally {
                window.npbDataManager.setLoading(false);
            }
        }
    }
}

// 전역 사용을 위한 등록
if (typeof window !== 'undefined') {
    window.NPBPythagoreanTable = NPBPythagoreanTable;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBPythagoreanTable;
}