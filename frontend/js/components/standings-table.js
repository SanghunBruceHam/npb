// Standings Table Component
class StandingsTable {
    constructor() {
        this.data = null;
        this.isLoading = false;
        this.lastUpdate = null;
        this.updateInterval = null;
    }

    // Initialize the standings tables
    async init() {
        try {
            this.showLoading();
            await this.loadData();
            this.render();
            this.startAutoUpdate();
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Load standings data
    async loadData() {
        this.isLoading = true;
        try {
            const response = await apiClient.getStandings();
            if (response.success) {
                this.data = response.data;
                this.lastUpdate = new Date();
                this.updateLastUpdatedTime();
            } else {
                throw new Error('Failed to load standings data');
            }
        } catch (error) {
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    // Render both league tables
    render() {
        if (!this.data) return;

        // Render for all leagues view
        this.renderLeagueTable('central', this.data.central);
        this.renderLeagueTable('pacific', this.data.pacific);
        
        // Render for single league views
        this.renderLeagueTable('central-single', this.data.central);
        this.renderLeagueTable('pacific-single', this.data.pacific);
        
        this.hideLoading();
    }

    // Render individual league table
    renderLeagueTable(league, teams) {
        const container = document.getElementById(`${league}-standings`);
        if (!container) return;

        const table = this.createStandingsTable(teams, league);
        container.innerHTML = table;
        
        // Add click handlers for team rows
        this.addTeamClickHandlers(container, teams);
    }

    // Create HTML for standings table
    createStandingsTable(teams, league) {
        if (!teams || teams.length === 0) {
            return '<p class="text-center text-muted">순위 데이터를 불러올 수 없습니다.</p>';
        }

        const tableClass = `table table-hover standings-table ${league}-table`;
        
        let html = `
            <div class="table-responsive">
                <table class="${tableClass}">
                    <thead class="table-dark">
                        <tr>
                            <th class="text-center" style="width: 50px;">순위</th>
                            <th class="team-column" style="min-width: 120px;">팀</th>
                            <th class="text-center" style="width: 60px;">경기</th>
                            <th class="text-center" style="width: 50px;">승</th>
                            <th class="text-center" style="width: 50px;">패</th>
                            <th class="text-center" style="width: 50px;">무</th>
                            <th class="text-center" style="width: 80px;">승률</th>
                            <th class="text-center" style="width: 70px;">게임차</th>
                            <th class="d-none d-md-table-cell text-center" style="width: 80px;">득실차</th>
                            <th class="d-none d-lg-table-cell text-center" style="width: 70px;">연속</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        teams.forEach(team => {
            const rowClass = this.getRowClass(team.rank);
            const teamColor = team.team_color || CONFIG.TEAMS[team.team_abbreviation]?.color || '#666';
            const streak = this.formatStreak(team.streak_type, team.streak_count);
            
            html += `
                <tr class="${rowClass}" data-team-id="${team.team_id}" style="cursor: pointer;">
                    <td class="text-center fw-bold rank-cell">
                        <span class="rank-number">${team.rank}</span>
                    </td>
                    <td class="team-cell">
                        <div class="d-flex align-items-center">
                            <div class="team-color-indicator me-2" 
                                 style="width: 4px; height: 24px; background-color: ${teamColor}; border-radius: 2px;"></div>
                            <div>
                                <div class="team-name fw-semibold">${team.team_name}</div>
                                <small class="text-muted team-abbr">${team.team_abbreviation}</small>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">${team.games_played}</td>
                    <td class="text-center fw-semibold text-success">${team.wins}</td>
                    <td class="text-center fw-semibold text-danger">${team.losses}</td>
                    <td class="text-center text-muted">${team.draws}</td>
                    <td class="text-center fw-bold">${this.formatWinPercentage(team.win_percentage)}</td>
                    <td class="text-center">${this.formatGamesBehind(team.games_behind)}</td>
                    <td class="d-none d-md-table-cell text-center ${team.run_differential >= 0 ? 'text-success' : 'text-danger'}">
                        ${team.run_differential > 0 ? '+' : ''}${team.run_differential}
                    </td>
                    <td class="d-none d-lg-table-cell text-center">
                        <span class="streak-indicator ${this.getStreakClass(team.streak_type)}">${streak}</span>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    // Get CSS class for table row based on rank
    getRowClass(rank) {
        if (rank === 1) return 'table-warning first-place';
        if (rank <= 3) return 'table-light playoff-spot';
        if (rank === 6) return 'table-danger last-place';
        return '';
    }

    // Get CSS class for streak indicator
    getStreakClass(streakType) {
        switch (streakType) {
            case 'W': return 'text-success';
            case 'L': return 'text-danger';
            case 'T': return 'text-warning';
            default: return 'text-muted';
        }
    }

    // Format win percentage
    formatWinPercentage(percentage) {
        if (percentage === null || percentage === undefined) return '---';
        return (percentage * 1000).toFixed(0).padStart(3, '0');
    }

    // Format games behind
    formatGamesBehind(gamesBehind) {
        if (gamesBehind === 0 || gamesBehind === null) return '-';
        return gamesBehind.toFixed(1);
    }

    // Format streak
    formatStreak(type, count) {
        if (!type || !count) return '-';
        return `${type}${count}`;
    }

    // Add click handlers to team rows
    addTeamClickHandlers(container, teams) {
        const rows = container.querySelectorAll('tr[data-team-id]');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                const teamId = row.getAttribute('data-team-id');
                const team = teams.find(t => t.team_id == teamId);
                if (team) {
                    this.showTeamDetail(team);
                }
            });
        });
    }

    // Show team detail modal or navigate to team page
    showTeamDetail(team) {
        // For now, just log the team - can be extended to show modal or navigate
        console.log('Show team detail:', team);
        
        // Example: Show basic team info in browser alert
        const info = `
            ${team.team_name} (${team.team_abbreviation})
            순위: ${team.rank}위
            전적: ${team.wins}승 ${team.losses}패 ${team.draws}무
            승률: ${this.formatWinPercentage(team.win_percentage)}
            게임차: ${this.formatGamesBehind(team.games_behind)}
        `;
        
        alert(info.trim());
    }

    // Show loading indicators
    showLoading() {
        const centralLoading = document.getElementById('central-standings-loading');
        const pacificLoading = document.getElementById('pacific-standings-loading');
        
        if (centralLoading) centralLoading.style.display = 'block';
        if (pacificLoading) pacificLoading.style.display = 'block';
    }

    // Hide loading indicators
    hideLoading() {
        const centralLoading = document.getElementById('central-standings-loading');
        const pacificLoading = document.getElementById('pacific-standings-loading');
        
        if (centralLoading) centralLoading.style.display = 'none';
        if (pacificLoading) pacificLoading.style.display = 'none';
    }

    // Show error message
    showError(message) {
        this.hideLoading();
        
        const centralContainer = document.getElementById('central-standings');
        const pacificContainer = document.getElementById('pacific-standings');
        
        const errorHtml = `
            <div class="alert alert-danger text-center" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="standingsTable.init()">
                    다시 시도
                </button>
            </div>
        `;
        
        if (centralContainer) centralContainer.innerHTML = errorHtml;
        if (pacificContainer) pacificContainer.innerHTML = errorHtml;
    }

    // Update last updated time display
    updateLastUpdatedTime() {
        if (!this.lastUpdate) return;
        
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            const timeString = this.lastUpdate.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            lastUpdateElement.textContent = timeString;
        }

        // Update completed games count if available
        if (this.data && this.data.central && this.data.pacific) {
            const totalGames = this.data.central.reduce((sum, team) => sum + team.games_played, 0) +
                             this.data.pacific.reduce((sum, team) => sum + team.games_played, 0);
            const completedGamesElement = document.getElementById('completed-games');
            if (completedGamesElement) {
                completedGamesElement.textContent = (totalGames / 2).toFixed(0); // Divide by 2 because each game involves 2 teams
            }
        }
    }

    // Start auto-update timer
    startAutoUpdate() {
        this.stopAutoUpdate(); // Clear any existing timer
        
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadData();
                this.render();
            } catch (error) {
                console.error('Auto-update failed:', error);
            }
        }, CONFIG.UI.UPDATE_INTERVAL);
    }

    // Stop auto-update timer
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Manual refresh
    async refresh() {
        try {
            await this.loadData();
            this.render();
            
            // Show success message briefly
            const toast = this.createToast('순위표가 업데이트되었습니다.', 'success');
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), CONFIG.UI.SUCCESS_DISPLAY_DURATION);
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Create toast notification
    createToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast position-fixed top-0 end-0 m-3 bg-${type} text-white`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-body">
                <i class="bi bi-check-circle me-2"></i>
                ${message}
            </div>
        `;
        
        // Auto-show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        return toast;
    }

    // Cleanup method
    destroy() {
        this.stopAutoUpdate();
        this.data = null;
    }
}

// Create global instance
const standingsTable = new StandingsTable();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StandingsTable;
}

// Make available globally
window.standingsTable = standingsTable;