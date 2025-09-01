/**
 * NPB 매직넘버 서브탭 관리 모듈
 * 매직넘버 탭의 4개 서브탭을 관리합니다
 */
class NPBMagicNumberSubTabs {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`매직넘버 컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }
        
        this.data = null;
        this.totalGames = 143; // NPB 2025 시즌 총 경기 수
        this.playoffSpots = 3; // 각 리그당 클라이맥스 시리즈 진출 팀 수
        this.init();
    }
    
    init() {
        // 데이터 매니저 구독
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('standings', (data) => {
                this.data = data;
                this.render();
            });
        }
        
        this.initializeSubTabs();
    }
    
    initializeSubTabs() {
        const subTabButtons = this.container.querySelectorAll('.sub-tab-btn');
        subTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSubTab(button.dataset.subtab);
            });
        });
    }
    
    switchSubTab(targetSubTab) {
        // 모든 서브탭 버튼과 콘텐츠 비활성화
        this.container.querySelectorAll('.sub-tab-btn').forEach(btn => 
            btn.classList.remove('active'));
        this.container.querySelectorAll('.sub-content').forEach(content => 
            content.classList.remove('active'));
        
        // 선택된 서브탭 활성화
        const targetButton = this.container.querySelector(`[data-subtab="${targetSubTab}"]`);
        const targetContent = this.container.querySelector(`#${targetSubTab}-content`);
        
        if (targetButton && targetContent) {
            targetButton.classList.add('active');
            targetContent.classList.add('active');
            this.renderSubTabContent(targetSubTab);
        }
    }
    
    render() {
        if (!this.data) return;
        
        // 현재 활성화된 서브탭의 콘텐츠 렌더링
        const activeSubTab = this.container.querySelector('.sub-tab-btn.active');
        if (activeSubTab) {
            this.renderSubTabContent(activeSubTab.dataset.subtab);
        }
    }
    
    renderSubTabContent(subTab) {
        if (!this.data) return;
        
        switch(subTab) {
            case 'championship-scenarios':
                this.renderChampionshipScenarios();
                break;
            case 'first-place-chance':
                this.renderFirstPlaceChance();
                break;
            case 'playoff-conditions':
                this.renderPlayoffConditions();
                break;
            case 'team-rankings':
                this.renderTeamRankings();
                break;
            default:
                this.renderChampionshipScenarios();
        }
    }
    
    renderChampionshipScenarios() {
        this.renderLeagueSection('central-championship-scenarios', 'central', 'createChampionshipScenariosTable');
        this.renderLeagueSection('pacific-championship-scenarios', 'pacific', 'createChampionshipScenariosTable');
    }
    
    renderFirstPlaceChance() {
        this.renderLeagueSection('central-first-place', 'central', 'createFirstPlaceTable');
        this.renderLeagueSection('pacific-first-place', 'pacific', 'createFirstPlaceTable');
    }
    
    renderPlayoffConditions() {
        this.renderLeagueSection('central-playoff-conditions', 'central', 'createPlayoffConditionsTable');
        this.renderLeagueSection('pacific-playoff-conditions', 'pacific', 'createPlayoffConditionsTable');
    }
    
    renderTeamRankings() {
        this.renderLeagueSection('central-team-rankings', 'central', 'createTeamRankingsTable');
        this.renderLeagueSection('pacific-team-rankings', 'pacific', 'createTeamRankingsTable');
    }
    
    renderLeagueSection(containerId, league, methodName) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = this[methodName](league);
        }
    }
    
    createChampionshipScenariosTable(league) {
        const leagueData = this.getLeagueData(league);
        if (!leagueData) return '<div class="no-data">데이터를 불러올 수 없습니다.</div>';
        
        const scenarios = this.calculateChampionshipScenarios(leagueData);
        
        return `
            <table class="unified-table">
                <thead>
                    <tr>
                        <th class="rank-cell">순위</th>
                        <th class="team-cell">팀</th>
                        <th class="number-cell">우승 확률</th>
                        <th class="number-cell">플레이오프 확률</th>
                        <th class="number-cell">필요 승수</th>
                        <th class="center-cell">시나리오</th>
                    </tr>
                </thead>
                <tbody>
                    ${scenarios.map((team, index) => `
                        <tr ${team.clinched ? 'class="playoff-position"' : ''}>
                            <td class="rank-cell">${index + 1}</td>
                            <td class="team-cell">${team.name}</td>
                            <td class="number-cell">${team.championshipChance}%</td>
                            <td class="number-cell">${team.playoffChance}%</td>
                            <td class="number-cell">${team.winsNeeded}</td>
                            <td class="center-cell">
                                <span class="badge ${team.status === 'clinched' ? 'badge-success' : team.status === 'eliminated' ? 'badge-danger' : 'badge-primary'}">
                                    ${team.statusText}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    createFirstPlaceTable(league) {
        const leagueData = this.getLeagueData(league);
        if (!leagueData) return '<div class="no-data">데이터를 불러올 수 없습니다.</div>';
        
        const firstPlaceAnalysis = this.calculateFirstPlaceChance(leagueData);
        
        return `
            <table class="unified-table">
                <thead>
                    <tr>
                        <th class="rank-cell">현재 순위</th>
                        <th class="team-cell">팀</th>
                        <th class="number-cell">현재 승률</th>
                        <th class="number-cell">1위와 게임차</th>
                        <th class="number-cell">1위 확률</th>
                        <th class="center-cell">필요 조건</th>
                    </tr>
                </thead>
                <tbody>
                    ${firstPlaceAnalysis.map(team => `
                        <tr ${team.rank === 1 ? 'class="playoff-position"' : ''}>
                            <td class="rank-cell">${team.rank}</td>
                            <td class="team-cell">${team.name}</td>
                            <td class="number-cell">${team.winPct.toFixed(3)}</td>
                            <td class="number-cell">${team.gamesBehind}</td>
                            <td class="number-cell">${team.firstPlaceChance}%</td>
                            <td class="center-cell">${team.condition}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    createPlayoffConditionsTable(league) {
        const leagueData = this.getLeagueData(league);
        if (!leagueData) return '<div class="no-data">데이터를 불러올 수 없습니다.</div>';
        
        const playoffAnalysis = this.calculatePlayoffConditions(leagueData);
        
        return `
            <table class="unified-table">
                <thead>
                    <tr>
                        <th class="rank-cell">순위</th>
                        <th class="team-cell">팀</th>
                        <th class="number-cell">매직넘버</th>
                        <th class="number-cell">최대 가능 승수</th>
                        <th class="number-cell">CS 진출 확률</th>
                        <th class="center-cell">상태</th>
                    </tr>
                </thead>
                <tbody>
                    ${playoffAnalysis.map(team => `
                        <tr ${team.playoffPosition ? 'class="playoff-position"' : ''}>
                            <td class="rank-cell">${team.rank}</td>
                            <td class="team-cell">${team.name}</td>
                            <td class="number-cell">${team.magicNumber || '-'}</td>
                            <td class="number-cell">${team.maxWins}</td>
                            <td class="number-cell">${team.playoffChance}%</td>
                            <td class="center-cell">
                                <span class="badge ${this.getStatusBadgeClass(team.status)}">
                                    ${team.statusText}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    createTeamRankingsTable(league) {
        const leagueData = this.getLeagueData(league);
        if (!leagueData) return '<div class="no-data">데이터를 불러올 수 없습니다.</div>';
        
        return `
            <table class="unified-table">
                <thead>
                    <tr>
                        <th class="rank-cell">순위</th>
                        <th class="team-cell">팀</th>
                        <th class="number-cell">승</th>
                        <th class="number-cell">패</th>
                        <th class="number-cell">무</th>
                        <th class="number-cell">승률</th>
                        <th class="number-cell">게임차</th>
                        <th class="number-cell">남은경기</th>
                        <th class="center-cell">매직넘버</th>
                    </tr>
                </thead>
                <tbody>
                    ${leagueData.map((team, index) => `
                        <tr ${index < 3 ? 'class="playoff-position"' : ''}>
                            <td class="rank-cell">${index + 1}</td>
                            <td class="team-cell">${team.name}</td>
                            <td class="number-cell">${team.wins}</td>
                            <td class="number-cell">${team.losses}</td>
                            <td class="number-cell">${team.draws}</td>
                            <td class="number-cell">${team.winPct.toFixed(3)}</td>
                            <td class="number-cell">${team.gamesBehind}</td>
                            <td class="number-cell">${team.remainingGames}</td>
                            <td class="center-cell">
                                ${team.magicNumber ? 
                                    `<span class="badge badge-warning">${team.magicNumber}</span>` : 
                                    '-'
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    getLeagueData(league) {
        if (!this.data || !this.data.leagues) return null;
        return this.data.leagues[league] || null;
    }
    
    calculateChampionshipScenarios(leagueData) {
        // 임시 더미 데이터 - 실제로는 복잡한 시뮬레이션이 필요
        return leagueData.map((team, index) => ({
            name: team.name,
            championshipChance: Math.max(0, 80 - index * 15),
            playoffChance: Math.max(20, 95 - index * 10),
            winsNeeded: Math.max(0, 10 - index * 2),
            clinched: index === 0,
            status: index === 0 ? 'clinched' : index >= 3 ? 'eliminated' : 'competing',
            statusText: index === 0 ? '진출 확정' : index >= 3 ? '탈락 위기' : '경쟁 중'
        }));
    }
    
    calculateFirstPlaceChance(leagueData) {
        return leagueData.map((team, index) => ({
            rank: index + 1,
            name: team.name,
            winPct: team.winPct,
            gamesBehind: team.gamesBehind,
            firstPlaceChance: Math.max(5, 70 - index * 15),
            condition: index === 0 ? '1위 유지' : `${team.gamesBehind}게임 따라잡기`
        }));
    }
    
    calculatePlayoffConditions(leagueData) {
        return leagueData.map((team, index) => ({
            rank: index + 1,
            name: team.name,
            magicNumber: index < 3 ? Math.max(1, 15 - index * 3) : null,
            maxWins: team.wins + team.remainingGames,
            playoffChance: Math.max(10, 90 - index * 12),
            playoffPosition: index < 3,
            status: index === 0 ? 'clinched' : index < 3 ? 'competing' : 'eliminated',
            statusText: index === 0 ? 'CS 확정' : index < 3 ? 'CS 경쟁' : '탈락 위기'
        }));
    }
    
    getStatusBadgeClass(status) {
        switch(status) {
            case 'clinched': return 'badge-success';
            case 'eliminated': return 'badge-danger';
            default: return 'badge-primary';
        }
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.NPBMagicNumberSubTabs = NPBMagicNumberSubTabs;
}