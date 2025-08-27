/**
 * NPB 매직넘버 분석 테이블 모듈
 * 각 팀의 리그 우승 매직넘버와 플레이오프 진출 가능성 분석
 */
class NPBMagicNumberTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`매직넘버 테이블 컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }
        
        this.data = null;
        this.totalGames = 143; // NPB 시즌 총 경기 수
        this.playoffSpots = 3; // 각 리그당 플레이오프 진출 팀 수
        this.init();
    }
    
    /**
     * 초기화
     */
    init() {
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('standings', (data) => {
                this.data = data;
                this.render();
            });
            
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
            <div class="magic-number-section">
                <h3>🔮 매직넘버 분석</h3>
                <p class="section-description">리그 우승과 플레이오프 진출에 필요한 승수를 분석합니다.</p>
                
                <div class="magic-controls">
                    <div class="scenario-selector">
                        <label>시나리오:</label>
                        <select id="magic-scenario">
                            <option value="championship">리그 우승</option>
                            <option value="playoff">플레이오프 진출</option>
                            <option value="elimination">플레이오프 탈락</option>
                        </select>
                    </div>
                    
                    <div class="remaining-games-info">
                        <span id="season-progress">시즌 진행률: 계산 중...</span>
                    </div>
                </div>
                
                <div class="league-magic-tables">
                    <div class="league-magic-section">
                        <h4>セントラル・リーグ (Central League)</h4>
                        <table class="magic-table" id="central-magic-table">
                            <thead>
                                <tr>
                                    <th>순위</th>
                                    <th>팀</th>
                                    <th>승</th>
                                    <th>패</th>
                                    <th>남은 경기</th>
                                    <th>매직넘버</th>
                                    <th>최대 가능 승수</th>
                                    <th>우승 가능성</th>
                                    <th>플레이오프 확률</th>
                                </tr>
                            </thead>
                            <tbody id="central-magic-body">
                                <!-- 세리그 매직넘버 데이터 -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="league-magic-section">
                        <h4>パシフィック・リーグ (Pacific League)</h4>
                        <table class="magic-table" id="pacific-magic-table">
                            <thead>
                                <tr>
                                    <th>순위</th>
                                    <th>팀</th>
                                    <th>승</th>
                                    <th>패</th>
                                    <th>남은 경기</th>
                                    <th>매직넘버</th>
                                    <th>최대 가능 승수</th>
                                    <th>우승 가능성</th>
                                    <th>플레이오프 확률</th>
                                </tr>
                            </thead>
                            <tbody id="pacific-magic-body">
                                <!-- 파리그 매직넘버 데이터 -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="magic-insights">
                    <div id="magic-summary" class="summary-section">
                        <!-- 매직넘버 요약 -->
                    </div>
                </div>
                
                <div id="magic-loading" class="loading-indicator" style="display: none;">
                    매직넘버 계산 중...
                </div>
            </div>
        `;
        
        this.setupControls();
    }
    
    /**
     * 컨트롤 설정
     */
    setupControls() {
        const scenarioSelect = document.getElementById('magic-scenario');
        if (scenarioSelect) {
            scenarioSelect.addEventListener('change', () => this.render());
        }
    }
    
    /**
     * 데이터 렌더링
     */
    render() {
        if (!this.data || !Array.isArray(this.data)) {
            console.warn('매직넘버 계산에 필요한 순위 데이터가 없습니다');
            return;
        }
        
        // 리그별로 데이터 분리
        const centralTeams = this.data
            .filter(team => NPBUtils.getTeamLeague(team.name) === 'central')
            .sort((a, b) => b.winPct - a.winPct);
            
        const pacificTeams = this.data
            .filter(team => NPBUtils.getTeamLeague(team.name) === 'pacific')
            .sort((a, b) => b.winPct - a.winPct);
        
        // 매직넘버 계산
        const centralMagicData = this.calculateMagicNumbers(centralTeams);
        const pacificMagicData = this.calculateMagicNumbers(pacificTeams);
        
        // 테이블 렌더링
        this.renderMagicTable('central-magic-body', centralMagicData);
        this.renderMagicTable('pacific-magic-body', pacificMagicData);
        
        // 시즌 진행률 업데이트
        this.updateSeasonProgress();
        
        // 요약 정보 렌더링
        this.renderSummary(centralMagicData, pacificMagicData);
        
        console.log('🔮 매직넘버 테이블 렌더링 완료');
    }
    
    /**
     * 매직넘버 계산
     */
    calculateMagicNumbers(teams) {
        const scenario = document.getElementById('magic-scenario')?.value || 'championship';
        
        return teams.map((team, index) => {
            const rank = index + 1;
            const totalGames = team.wins + team.losses + (team.draws || 0);
            const remainingGames = this.totalGames - totalGames;
            const maxPossibleWins = team.wins + remainingGames;
            
            // 매직넘버 계산
            let magicNumber;
            let championshipProbability;
            let playoffProbability;
            
            if (scenario === 'championship') {
                magicNumber = this.calculateChampionshipMagicNumber(team, teams);
                championshipProbability = this.calculateChampionshipProbability(team, teams);
            } else if (scenario === 'playoff') {
                magicNumber = this.calculatePlayoffMagicNumber(team, teams);
                playoffProbability = this.calculatePlayoffProbability(team, teams);
            } else {
                magicNumber = this.calculateEliminationNumber(team, teams);
            }
            
            // 확률 계산 (간단한 추정)
            if (championshipProbability === undefined) {
                championshipProbability = this.calculateChampionshipProbability(team, teams);
            }
            if (playoffProbability === undefined) {
                playoffProbability = this.calculatePlayoffProbability(team, teams);
            }
            
            return {
                ...team,
                rank,
                remainingGames,
                maxPossibleWins,
                magicNumber,
                championshipProbability,
                playoffProbability,
                status: this.getTeamStatus(rank, magicNumber, remainingGames)
            };
        });
    }
    
    /**
     * 리그 우승 매직넘버 계산
     */
    calculateChampionshipMagicNumber(team, teams) {
        // 2위 팀의 최대 가능 승수와 비교
        const otherTeams = teams.filter(t => t.name !== team.name);
        if (otherTeams.length === 0) return 1;
        
        const secondBestMaxWins = Math.max(...otherTeams.map(t => {
            const totalGames = t.wins + t.losses + (t.draws || 0);
            return t.wins + (this.totalGames - totalGames);
        }));
        
        const magicNumber = Math.max(1, secondBestMaxWins + 1 - team.wins);
        
        // 이미 우승 확정인지 확인
        if (team.wins > secondBestMaxWins) return 0;
        
        // 탈락했는지 확인
        const teamMaxWins = team.wins + (this.totalGames - team.wins - team.losses - (team.draws || 0));
        if (teamMaxWins <= secondBestMaxWins) return 'E';
        
        return magicNumber;
    }
    
    /**
     * 플레이오프 진출 매직넘버 계산
     */
    calculatePlayoffMagicNumber(team, teams) {
        // 4위 팀의 최대 가능 승수와 비교
        const otherTeams = teams.filter(t => t.name !== team.name);
        if (otherTeams.length < this.playoffSpots) return 1;
        
        const sortedOthers = otherTeams
            .map(t => {
                const totalGames = t.wins + t.losses + (t.draws || 0);
                return {
                    ...t,
                    maxWins: t.wins + (this.totalGames - totalGames)
                };
            })
            .sort((a, b) => b.maxWins - a.maxWins);
        
        const fourthBestMaxWins = sortedOthers[this.playoffSpots - 1]?.maxWins || 0;
        
        const magicNumber = Math.max(1, fourthBestMaxWins + 1 - team.wins);
        
        // 이미 플레이오프 확정인지 확인
        if (team.wins > fourthBestMaxWins) return 0;
        
        // 탈락했는지 확인
        const teamMaxWins = team.wins + (this.totalGames - team.wins - team.losses - (team.draws || 0));
        if (teamMaxWins <= fourthBestMaxWins) return 'E';
        
        return magicNumber;
    }
    
    /**
     * 플레이오프 탈락 넘버 계산
     */
    calculateEliminationNumber(team, teams) {
        const teamMaxWins = team.wins + (this.totalGames - team.wins - team.losses - (team.draws || 0));
        
        const betterTeamsCount = teams.filter(t => 
            t.name !== team.name && t.wins >= teamMaxWins
        ).length;
        
        return betterTeamsCount >= this.playoffSpots ? 'E' : '---';
    }
    
    /**
     * 우승 확률 계산 (간단한 추정)
     */
    calculateChampionshipProbability(team, teams) {
        const teamRank = teams.findIndex(t => t.name === team.name) + 1;
        if (teamRank > 3) return 0;
        
        // 현재 순위와 승률을 기반으로 한 간단한 확률 모델
        const winPctFactor = Math.pow(team.winPct, 2);
        const rankPenalty = Math.pow(0.7, teamRank - 1);
        
        return Math.min(95, Math.max(1, winPctFactor * rankPenalty * 100));
    }
    
    /**
     * 플레이오프 진출 확률 계산
     */
    calculatePlayoffProbability(team, teams) {
        const teamRank = teams.findIndex(t => t.name === team.name) + 1;
        if (teamRank > 5) return 0;
        
        const winPctFactor = team.winPct;
        const rankBonus = teamRank <= this.playoffSpots ? 1.5 : Math.pow(0.8, teamRank - this.playoffSpots);
        
        return Math.min(99, Math.max(1, winPctFactor * rankBonus * 100));
    }
    
    /**
     * 팀 상태 판단
     */
    getTeamStatus(rank, magicNumber, remainingGames) {
        if (magicNumber === 0) return 'clinched';
        if (magicNumber === 'E') return 'eliminated';
        if (rank === 1 && magicNumber <= 5) return 'magic-low';
        if (rank <= 3 && magicNumber <= remainingGames) return 'contender';
        if (rank <= 3) return 'in-race';
        return 'longshot';
    }
    
    /**
     * 매직넘버 테이블 렌더링
     */
    renderMagicTable(bodyId, teams) {
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;
        
        tbody.innerHTML = teams.map(team => {
            const logoFileName = NPBUtils.getTeamLogoFileName(team.name);
            const league = NPBUtils.getTeamLeague(team.name);
            
            // 상태에 따른 클래스
            const statusClass = team.status;
            const magicDisplay = team.magicNumber === 'E' ? 'E' : 
                               team.magicNumber === 0 ? '✓' : 
                               team.magicNumber;
            
            return `
                <tr class="team-row ${statusClass}">
                    <td class="rank">${team.rank}</td>
                    <td class="team-name">
                        <img src="/images/${league}/${logoFileName}" 
                             alt="${team.name}" class="team-logo" onerror="this.style.display='none'">
                        <span>${team.name}</span>
                    </td>
                    <td class="wins">${team.wins}</td>
                    <td class="losses">${team.losses}</td>
                    <td class="remaining">${team.remainingGames}</td>
                    <td class="magic-number ${team.magicNumber <= 5 && team.magicNumber > 0 ? 'critical' : ''}">${magicDisplay}</td>
                    <td class="max-wins">${team.maxPossibleWins}</td>
                    <td class="championship-prob">${team.championshipProbability.toFixed(1)}%</td>
                    <td class="playoff-prob">${team.playoffProbability.toFixed(1)}%</td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * 시즌 진행률 업데이트
     */
    updateSeasonProgress() {
        const progressElement = document.getElementById('season-progress');
        if (!progressElement || !this.data) return;
        
        const totalGamesPlayed = this.data.reduce((sum, team) => 
            sum + team.wins + team.losses + (team.draws || 0), 0) / 2; // 2로 나누는 이유: 각 경기가 두 번 계산됨
        
        const totalPossibleGames = (this.data.length / 2) * this.totalGames;
        const progressPct = (totalGamesPlayed / totalPossibleGames * 100).toFixed(1);
        
        progressElement.textContent = `시즌 진행률: ${progressPct}% (${Math.floor(totalGamesPlayed)}/${Math.floor(totalPossibleGames)} 경기)`;
    }
    
    /**
     * 요약 정보 렌더링
     */
    renderSummary(centralData, pacificData) {
        const summaryElement = document.getElementById('magic-summary');
        if (!summaryElement) return;
        
        const allTeams = [...centralData, ...pacificData];
        const clinched = allTeams.filter(t => t.status === 'clinched');
        const eliminated = allTeams.filter(t => t.status === 'eliminated');
        const contenders = allTeams.filter(t => t.status === 'contender' || t.status === 'in-race');
        
        summaryElement.innerHTML = `
            <h4>📊 매직넘버 현황</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <label>우승/진출 확정:</label>
                    <span>${clinched.length}팀</span>
                </div>
                <div class="summary-item">
                    <label>탈락 확정:</label>
                    <span>${eliminated.length}팀</span>
                </div>
                <div class="summary-item">
                    <label>경쟁 중:</label>
                    <span>${contenders.length}팀</span>
                </div>
                <div class="summary-item">
                    <label>평균 매직넘버:</label>
                    <span>${this.calculateAverageMagicNumber(allTeams)}</span>
                </div>
            </div>
            ${clinched.length > 0 ? `
                <div class="clinched-teams">
                    <strong>확정 팀:</strong> ${clinched.map(t => t.name).join(', ')}
                </div>
            ` : ''}
        `;
    }
    
    /**
     * 평균 매직넘버 계산
     */
    calculateAverageMagicNumber(teams) {
        const validMagicNumbers = teams
            .map(t => t.magicNumber)
            .filter(m => typeof m === 'number' && m > 0);
        
        if (validMagicNumbers.length === 0) return '---';
        
        const avg = validMagicNumbers.reduce((sum, m) => sum + m, 0) / validMagicNumbers.length;
        return avg.toFixed(1);
    }
    
    /**
     * 로딩 상태 표시
     */
    showLoadingState(isLoading) {
        const loadingElement = document.getElementById('magic-loading');
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
                const standings = await window.npbApiClient.getStandings();
                window.npbDataManager.updateData('standings', standings);
            } catch (error) {
                console.error('매직넘버 데이터 새로고침 실패:', error);
            } finally {
                window.npbDataManager.setLoading(false);
            }
        }
    }
}

// 전역 사용을 위한 등록
if (typeof window !== 'undefined') {
    window.NPBMagicNumberTable = NPBMagicNumberTable;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBMagicNumberTable;
}