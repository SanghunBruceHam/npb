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
        this.totalGames = 143; // NPB 2025 시즌 총 경기 수 (정규시즌)
        this.playoffSpots = 3; // 각 리그당 클라이맥스 시리즈 진출 팀 수 (1위, 2위, 3위)
        this.leagueNames = {
            central: '센트럴',
            pacific: '퍼시픽'
        };
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
                    <div class="scenario-tabs">
                        <button class="scenario-tab-btn active" data-scenario="championship">🏆 리그 우승</button>
                        <button class="scenario-tab-btn" data-scenario="playoff">⚾ 플레이오프 진출</button>
                        <button class="scenario-tab-btn" data-scenario="elimination">❌ 플레이오프 탈락</button>
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
                                    <th>승률</th>
                                    <th>게임차</th>
                                    <th>남은경기</th>
                                    <th>매직넘버</th>
                                    <th>최대승수</th>
                                    <th>리그우승</th>
                                    <th>CS진출</th>
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
                                    <th>승률</th>
                                    <th>게임차</th>
                                    <th>남은경기</th>
                                    <th>매직넘버</th>
                                    <th>최대승수</th>
                                    <th>리그우승</th>
                                    <th>CS진출</th>
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
        // 시나리오 탭 이벤트 리스너
        document.querySelectorAll('.scenario-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.scenario-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.render();
            });
        });
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
        
        // 상단 카드 업데이트
        const allTeams = [...centralMagicData, ...pacificMagicData];
        this.updateMagicStatusCard(allTeams);
        
        console.log('🔮 매직넘버 테이블 렌더링 완료');
    }
    
    /**
     * 매직넘버 계산
     */
    calculateMagicNumbers(teams) {
        const activeBtn = document.querySelector('.scenario-tab-btn.active');
        const scenario = activeBtn ? activeBtn.dataset.scenario : 'championship';
        
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
        const otherTeams = teams.filter(t => t.name !== team.name);
        if (otherTeams.length === 0) return 0; // 팀이 1개뿐이면 이미 우승
        
        // 현재 팀의 최대 가능 승수
        const teamTotalGames = team.wins + team.losses + (team.draws || 0);
        const teamRemainingGames = this.totalGames - teamTotalGames;
        const teamMaxWins = team.wins + teamRemainingGames;
        
        // 다른 팀들의 현재 승수와 최대 가능 승수 계산
        const otherTeamsData = otherTeams.map(t => {
            const totalGames = t.wins + t.losses + (t.draws || 0);
            const remainingGames = this.totalGames - totalGames;
            return {
                name: t.name,
                currentWins: t.wins,
                maxWins: t.wins + remainingGames
            };
        });
        
        // 2위 팀(현재 승수 기준)의 최대 가능 승수
        const secondBestTeamMaxWins = otherTeamsData
            .sort((a, b) => b.currentWins - a.currentWins)[0]?.maxWins || 0;
        
        // 매직넘버 계산: (2위 팀 최대승수 + 1) - 현재팀승수
        let magicNumber = Math.max(0, secondBestTeamMaxWins + 1 - team.wins);
        
        // 이미 우승 확정인지 확인 (현재 승수가 다른 모든 팀의 최대 가능 승수보다 큰 경우)
        const maxOtherTeamWins = Math.max(...otherTeamsData.map(t => t.maxWins));
        if (team.wins > maxOtherTeamWins) return 0;
        
        // 탈락했는지 확인 (최대 가능 승수가 현재 1위 팀의 승수보다 작은 경우)
        const firstPlaceWins = Math.max(...otherTeamsData.map(t => t.currentWins));
        if (teamMaxWins < firstPlaceWins) return 'E';
        
        return magicNumber;
    }
    
    /**
     * 플레이오프 진출 매직넘버 계산 (NPB는 각 리그 3위까지 플레이오프)
     */
    calculatePlayoffMagicNumber(team, teams) {
        const otherTeams = teams.filter(t => t.name !== team.name);
        if (otherTeams.length < this.playoffSpots) return 0; // 충분한 팀이 없으면 이미 확정
        
        // 현재 팀의 최대 가능 승수
        const teamTotalGames = team.wins + team.losses + (team.draws || 0);
        const teamRemainingGames = this.totalGames - teamTotalGames;
        const teamMaxWins = team.wins + teamRemainingGames;
        
        // 다른 팀들의 최대 가능 승수 계산
        const otherTeamsData = otherTeams
            .map(t => {
                const totalGames = t.wins + t.losses + (t.draws || 0);
                const remainingGames = this.totalGames - totalGames;
                return {
                    name: t.name,
                    currentWins: t.wins,
                    maxWins: t.wins + remainingGames,
                    winPct: t.winPct || (t.wins / (t.wins + t.losses + (t.draws || 0)))
                };
            })
            .sort((a, b) => b.maxWins - a.maxWins); // 최대 가능 승수 기준 정렬
        
        // 플레이오프 컷라인 (3위)에 해당하는 팀의 최대 가능 승수
        const playoffCutoffMaxWins = otherTeamsData[this.playoffSpots - 1]?.maxWins || 0;
        
        // 매직넘버 계산: (컷라인 팀의 최대승수 + 1) - 현재팀승수
        let magicNumber = Math.max(0, playoffCutoffMaxWins + 1 - team.wins);
        
        // 이미 플레이오프 확정인지 확인
        if (team.wins > playoffCutoffMaxWins) return 0;
        
        // 플레이오프 탈락했는지 확인 (상위 3팀의 현재 승수와 비교)
        const topThreeCurrentWins = otherTeamsData
            .sort((a, b) => b.currentWins - a.currentWins)
            .slice(0, this.playoffSpots) // 현재 상위 3팀
            .map(t => t.currentWins);
        const thirdPlaceWins = topThreeCurrentWins[2] || 0;
        
        if (teamMaxWins < thirdPlaceWins) return 'E';
        
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
     * 리그 우승 확률 계산 (NPB 정규시즌 1위)
     */
    calculateChampionshipProbability(team, teams) {
        const teamRank = teams.findIndex(t => t.name === team.name) + 1;
        
        // 이미 확정된 경우
        if (team.status === 'clinched' && team.magicNumber === 0) return 100;
        if (team.status === 'eliminated') return 0;
        
        // 4위 이하는 우승 가능성이 매우 낮음
        if (teamRank > 4) return 0;
        
        // 승률 기반 기본 확률
        const winPctFactor = team.winPct || (team.wins / (team.wins + team.losses + (team.draws || 0)));
        
        // 순위별 가중치 (1위가 압도적으로 유리)
        let rankMultiplier;
        if (teamRank === 1) rankMultiplier = 2.5;
        else if (teamRank === 2) rankMultiplier = 1.2;
        else if (teamRank === 3) rankMultiplier = 0.6;
        else rankMultiplier = 0.2;
        
        // 매직넘버가 작을수록 확률 증가
        let magicFactor = 1.0;
        if (typeof team.magicNumber === 'number' && team.magicNumber > 0) {
            magicFactor = Math.max(0.3, 1 - (team.magicNumber / 20));
        }
        
        // 남은 경기 수 고려
        const remainingGamesFactor = 1 + (team.remainingGames / this.totalGames * 0.5);
        
        const baseProbability = winPctFactor * rankMultiplier * magicFactor * remainingGamesFactor * 100;
        
        return Math.min(95, Math.max(0.1, baseProbability));
    }
    
    /**
     * 클라이맥스 시리즈 진출 확률 계산 (NPB 플레이오프)
     */
    calculatePlayoffProbability(team, teams) {
        const teamRank = teams.findIndex(t => t.name === team.name) + 1;
        
        // 4위 이하는 클라이맥스 시리즈 진출 불가
        if (teamRank > this.playoffSpots) return 0;
        
        // 이미 확정된 팀
        if (team.status === 'clinched') return 100;
        if (team.status === 'eliminated') return 0;
        
        // 승률과 순위 기반 확률 계산
        const winPctFactor = team.winPct || (team.wins / (team.wins + team.losses + (team.draws || 0)));
        
        // 순위별 가중치 (1위: 높은 확률, 3위: 중간 확률)
        let rankMultiplier;
        if (teamRank === 1) rankMultiplier = 1.8;
        else if (teamRank === 2) rankMultiplier = 1.4;
        else if (teamRank === 3) rankMultiplier = 1.0;
        
        // 남은 경기와 게임차 고려
        const gamesToPlay = team.remainingGames || 0;
        const gamesFactor = Math.min(1.2, 1 + (gamesToPlay / this.totalGames));
        
        const baseProbability = winPctFactor * rankMultiplier * gamesFactor * 100;
        
        return Math.min(99, Math.max(1, baseProbability));
    }
    
    /**
     * 팀 상태 판단
     */
    getTeamStatus(rank, magicNumber, remainingGames) {
        // 확정 상황
        if (magicNumber === 0) return 'clinched';
        if (magicNumber === 'E') return 'eliminated';
        
        // 매직넘버가 낮은 경우 (우승 가능성 높음)
        if (rank === 1 && typeof magicNumber === 'number' && magicNumber <= 5) return 'magic-low';
        
        // 플레이오프 경쟁권 (3위까지)
        if (rank <= 3 && typeof magicNumber === 'number') {
            if (magicNumber <= remainingGames) return 'contender';
            return 'in-race';
        }
        
        // 플레이오프 경쟁 밖
        return 'longshot';
    }
    
    /**
     * 매직넘버 테이블 렌더링
     */
    renderMagicTable(bodyId, teams) {
        const tbody = document.getElementById(bodyId);
        if (!tbody) return;
        
        tbody.innerHTML = teams.map(team => {
            const league = NPBUtils.getTeamLeague(team.name);
            
            // 상태에 따른 클래스
            const statusClass = team.status;
            const magicDisplay = team.magicNumber === 'E' ? 'E' : 
                               team.magicNumber === 0 ? '✓' : 
                               team.magicNumber;
            
            // 승률 계산
            const winPct = (team.wins / (team.wins + team.losses + (team.draws || 0)) * 100).toFixed(1);
            
            // 게임차 계산 (1위와의 차이)
            const firstPlaceWins = teams[0].wins;
            const firstPlaceLosses = teams[0].losses;
            const gameBehind = team.rank === 1 ? '-' : 
                ((firstPlaceWins - team.wins + team.losses - firstPlaceLosses) / 2).toFixed(1);
            
            return `
                <tr class="team-row ${statusClass}">
                    <td class="rank">${team.rank}</td>
                    <td class="team-name">
                        <div class="team-info">
                            <span class="team-logo">${NPBUtils.getTeamEmoji(team.name)}</span>
                            <span>${team.name}</span>
                        </div>
                    </td>
                    <td class="wins">${team.wins}</td>
                    <td class="losses">${team.losses}</td>
                    <td class="win-pct">${winPct}%</td>
                    <td class="game-behind">${gameBehind}</td>
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
    
    // 매직넘버 현황을 상단 카드에 업데이트
    updateMagicStatusCard(allTeams) {
        const statusCard = document.getElementById('magic-status-card');
        if (!statusCard) return;
        
        const clinched = allTeams.filter(t => t.status === 'clinched');
        const eliminated = allTeams.filter(t => t.status === 'eliminated');
        const contenders = allTeams.filter(t => t.status === 'contender' || t.status === 'in-race');
        
        document.getElementById('clinched-count').textContent = clinched.length;
        document.getElementById('eliminated-count').textContent = eliminated.length;
        document.getElementById('competing-count').textContent = contenders.length;
        document.getElementById('avg-magic-number').textContent = this.calculateAverageMagicNumber(allTeams);
        
        // 카드 표시
        statusCard.style.display = 'block';
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