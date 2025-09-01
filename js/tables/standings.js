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
            <div class="unified-section">
                <div class="unified-header">
                    <h3>📊 종합 순위</h3>
                    <p class="unified-description">2025시즌 NPB 리그 순위 및 기본 지표</p>
                </div>
                
                <div class="leagues-container">
                    <div class="league-section">
                        <div class="league-header">
                            <div class="league-title central">🔵 세리그 (Central League)</div>
                        </div>
                        <div class="league-content">
                            <table id="central-standings" class="unified-table">
                                <thead>
                                    <tr>
                                        <th class="sortable rank-cell" data-sort="rank">순위</th>
                                        <th class="sortable team-cell" data-sort="team">팀</th>
                                        <th class="sortable number-cell center-cell" data-sort="games">경기</th>
                                        <th class="sortable number-cell center-cell" data-sort="wins">승</th>
                                        <th class="sortable number-cell center-cell" data-sort="losses">패</th>
                                        <th class="sortable number-cell center-cell" data-sort="draws">무</th>
                                        <th class="sortable number-cell center-cell" data-sort="winRate">승률</th>
                                        <th class="sortable number-cell center-cell" data-sort="gameBehind">게임차</th>
                                    </tr>
                                </thead>
                                <tbody id="central-standings-body"></tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="league-section">
                        <div class="league-header">
                            <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
                        </div>
                        <div class="league-content">
                            <table id="pacific-standings" class="unified-table">
                                <thead>
                                    <tr>
                                        <th class="sortable rank-cell" data-sort="rank">순위</th>
                                        <th class="sortable team-cell" data-sort="team">팀</th>
                                        <th class="sortable number-cell center-cell" data-sort="games">경기</th>
                                        <th class="sortable number-cell center-cell" data-sort="wins">승</th>
                                        <th class="sortable number-cell center-cell" data-sort="losses">패</th>
                                        <th class="sortable number-cell center-cell" data-sort="draws">무</th>
                                        <th class="sortable number-cell center-cell" data-sort="winRate">승률</th>
                                        <th class="sortable number-cell center-cell" data-sort="gameBehind">게임차</th>
                                    </tr>
                                </thead>
                                <tbody id="pacific-standings-body"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div id="standings-loading" class="loading-indicator" style="display: none;">
                    데이터 로딩 중...
                </div>
            </div>
        `;
        
        // 정렬 기능 초기화
        setTimeout(() => {
            this.initializeSorting();
        }, 100);
    }
    
    /**
     * 정렬 기능 초기화
     */
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
    
    /**
     * 테이블 정렬
     */
    sortTable(table, clickedHeader) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const sortKey = clickedHeader.dataset.sort;
        const columnIndex = Array.from(clickedHeader.parentElement.children).indexOf(clickedHeader);
        
        // 현재 정렬 상태 확인
        const currentSort = clickedHeader.classList.contains('sort-asc') ? 'asc' : 
                           clickedHeader.classList.contains('sort-desc') ? 'desc' : 'none';
        
        // 모든 헤더의 정렬 클래스 제거
        table.querySelectorAll('th').forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
        });
        
        // 새로운 정렬 방향
        const newSort = currentSort === 'asc' ? 'desc' : 'asc';
        clickedHeader.classList.add(`sort-${newSort}`);
        
        // 데이터 정렬
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
        
        // 정렬된 행들 재배치
        rows.forEach(row => tbody.appendChild(row));
    }
    
    /**
     * 셀 값 추출
     */
    getCellValue(row, columnIndex) {
        const cell = row.cells[columnIndex];
        return cell.textContent.trim();
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
            
            return `
                <tr class="team-row ${rank <= 3 ? 'playoff-position' : ''}">
                    <td class="rank-cell">${rank}</td>
                    <td class="team-cell">${team.name}</td>
                    <td class="number-cell center-cell">${totalGames}</td>
                    <td class="number-cell center-cell">${team.wins}</td>
                    <td class="number-cell center-cell">${team.losses}</td>
                    <td class="number-cell center-cell">${team.draws || 0}</td>
                    <td class="number-cell center-cell">${winPct}</td>
                    <td class="number-cell center-cell">${gamesBehind}</td>
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