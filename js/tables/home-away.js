/**
 * NPB 홈/원정 성적 분석 테이블 모듈 - 통일된 구조
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
    
    init() {
        this.subscribeToData();
        this.createTable();
    }
    
    subscribeToData() {
        if (!window.npbDataManager) return;
        
        window.npbDataManager.subscribe('standings', (data) => {
            this.data = data;
            this.renderIfReady();
        });
        
        window.npbDataManager.subscribe('teamStats', (data) => {
            this.teamStats = data;
            this.renderIfReady();
        });
        
        window.npbDataManager.subscribe('gameRecords', (data) => {
            this.gameRecords = data;
            this.renderIfReady();
        });
        
        window.npbDataManager.subscribe('loading', (isLoading) => {
            this.showLoadingState(isLoading);
        });
    }
    
    createTable() {
        this.container.innerHTML = `
            <div class="unified-section">
                <div class="unified-header">
                    <h3>🏠 홈/원정 성적 분석</h3>
                    <p class="unified-description">각 팀의 홈구장과 원정경기 성적 비교</p>
                </div>
                
                <div class="leagues-container">
                    <div class="league-section">
                        <div class="league-header">
                            <div class="league-title central">🔵 세리그 (Central League)</div>
                        </div>
                        <div class="league-content">
                            <table class="unified-table" id="central-home-away">
                                <thead>
                                    <tr>
                                        <th class="sortable team-cell" data-sort="team">팀</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeWins">홈승</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeLosses">홈패</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeDraws">홈무</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeRate">홈승률</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayWins">원정승</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayLosses">원정패</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayDraws">원정무</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayRate">원정승률</th>
                                        <th class="sortable number-cell center-cell" data-sort="difference">승률차이</th>
                                    </tr>
                                </thead>
                                <tbody id="central-home-away-body"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="league-section">
                        <div class="league-header">
                            <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
                        </div>
                        <div class="league-content">
                            <table class="unified-table" id="pacific-home-away">
                                <thead>
                                    <tr>
                                        <th class="sortable team-cell" data-sort="team">팀</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeWins">홈승</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeLosses">홈패</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeDraws">홈무</th>
                                        <th class="sortable number-cell center-cell" data-sort="homeRate">홈승률</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayWins">원정승</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayLosses">원정패</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayDraws">원정무</th>
                                        <th class="sortable number-cell center-cell" data-sort="awayRate">원정승률</th>
                                        <th class="sortable number-cell center-cell" data-sort="difference">승률차이</th>
                                    </tr>
                                </thead>
                                <tbody id="pacific-home-away-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 정렬 기능 초기화
        setTimeout(() => {
            this.initializeSorting();
        }, 100);
    }
    
    initializeSorting() {
        const tables = this.container.querySelectorAll('.unified-table');
        tables.forEach(table => {
            const headers = table.querySelectorAll('th.sortable');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    this.sortTable(table, header);
                });
            });
        });
    }
    
    sortTable(table, clickedHeader) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const columnIndex = Array.from(clickedHeader.parentElement.children).indexOf(clickedHeader);
        
        const currentSort = clickedHeader.classList.contains('sort-asc') ? 'asc' : 
                           clickedHeader.classList.contains('sort-desc') ? 'desc' : 'none';
        
        table.querySelectorAll('th').forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
        });
        
        const newSort = currentSort === 'asc' ? 'desc' : 'asc';
        clickedHeader.classList.add(`sort-${newSort}`);
        
        rows.sort((a, b) => {
            const aValue = this.getCellValue(a, columnIndex);
            const bValue = this.getCellValue(b, columnIndex);
            
            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return newSort === 'asc' ? aNum - bNum : bNum - aNum;
            } else {
                return newSort === 'asc' ? 
                    aValue.localeCompare(bValue) : 
                    bValue.localeCompare(aValue);
            }
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }
    
    getCellValue(row, columnIndex) {
        const cell = row.cells[columnIndex];
        return cell.textContent.trim();
    }
    
    renderIfReady() {
        if (this.data && this.teamStats && this.gameRecords) {
            this.render();
        }
    }
    
    render() {
        if (!this.data) return;
        
        // 홈/원정 데이터 계산
        const homeAwayData = this.calculateHomeAwayStats();
        
        // 리그별로 분리
        const centralData = homeAwayData.filter(team => NPBUtils.getTeamLeague(team.name) === 'central');
        const pacificData = homeAwayData.filter(team => NPBUtils.getTeamLeague(team.name) === 'pacific');
        
        this.renderLeagueTable('central-home-away-body', centralData);
        this.renderLeagueTable('pacific-home-away-body', pacificData);
    }
    
    calculateHomeAwayStats() {
        return this.data.map(team => {
            const homeGames = this.gameRecords?.filter(game => 
                NPBUtils.normalizeTeamName(game.homeTeam) === NPBUtils.normalizeTeamName(team.name)
            ) || [];
            
            const awayGames = this.gameRecords?.filter(game => 
                NPBUtils.normalizeTeamName(game.awayTeam) === NPBUtils.normalizeTeamName(team.name)
            ) || [];
            
            // 홈 성적
            const homeWins = homeGames.filter(g => g.homeScore > g.awayScore).length;
            const homeLosses = homeGames.filter(g => g.homeScore < g.awayScore).length;
            const homeDraws = homeGames.filter(g => g.homeScore === g.awayScore).length;
            const homeTotal = homeWins + homeLosses + homeDraws;
            const homeRate = homeTotal > 0 ? homeWins / (homeWins + homeLosses) : 0;
            
            // 원정 성적
            const awayWins = awayGames.filter(g => g.awayScore > g.homeScore).length;
            const awayLosses = awayGames.filter(g => g.awayScore < g.homeScore).length;
            const awayDraws = awayGames.filter(g => g.awayScore === g.homeScore).length;
            const awayTotal = awayWins + awayLosses + awayDraws;
            const awayRate = awayTotal > 0 ? awayWins / (awayWins + awayLosses) : 0;
            
            const difference = homeRate - awayRate;
            
            return {
                name: team.name,
                homeWins,
                homeLosses,
                homeDraws,
                homeRate,
                awayWins,
                awayLosses,
                awayDraws,
                awayRate,
                difference
            };
        });
    }
    
    renderLeagueTable(bodyId, teams) {
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;
        
        tbody.innerHTML = teams.map(team => {
            const homeRateDisplay = team.homeRate.toFixed(3);
            const awayRateDisplay = team.awayRate.toFixed(3);
            const diffDisplay = (team.difference >= 0 ? '+' : '') + team.difference.toFixed(3);
            const diffClass = team.difference > 0.05 ? 'positive' : team.difference < -0.05 ? 'negative' : '';
            
            return `
                <tr>
                    <td class="team-cell">${team.name}</td>
                    <td class="number-cell center-cell">${team.homeWins}</td>
                    <td class="number-cell center-cell">${team.homeLosses}</td>
                    <td class="number-cell center-cell">${team.homeDraws}</td>
                    <td class="number-cell center-cell">${homeRateDisplay}</td>
                    <td class="number-cell center-cell">${team.awayWins}</td>
                    <td class="number-cell center-cell">${team.awayLosses}</td>
                    <td class="number-cell center-cell">${team.awayDraws}</td>
                    <td class="number-cell center-cell">${awayRateDisplay}</td>
                    <td class="number-cell center-cell ${diffClass}">${diffDisplay}</td>
                </tr>
            `;
        }).join('');
    }
    
    showLoadingState(isLoading) {
        // 로딩 상태 처리 (필요시 구현)
    }
}