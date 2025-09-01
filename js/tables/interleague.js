/**
 * NPB 교류전(인터리그) 분석 테이블 모듈
 */
class NPBInterleagueTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`교류전 테이블 컨테이너를 찾을 수 없습니다: ${containerId}`);
            return;
        }

        this.standings = null;
        this.gameRecords = null;
        this.teamStats = null; // optional
        this.init();
    }

    init() {
        if (!window.npbDataManager) return;

        window.npbDataManager.subscribe('standings', (data) => {
            this.standings = data;
            this.renderIfReady();
        });

        window.npbDataManager.subscribe('gameRecords', (data) => {
            this.gameRecords = data;
            this.renderIfReady();
        });

        window.npbDataManager.subscribe('teamStats', (data) => {
            this.teamStats = data;
            this.renderIfReady();
        });

        window.npbDataManager.subscribe('loading', (isLoading) => {
            this.showLoadingState(isLoading);
        });

        this.createTable();
    }

    createTable() {
        this.container.innerHTML = `
            <div class="interleague-section">
                <h3>🔄 교류전 분석 (CL vs PL)</h3>
                <p class="section-description">리그 간 경기의 팀별/리그별 성과를 요약합니다.</p>
                <div class="interleague-summary" id="interleague-summary"></div>
                <table id="interleague-table" class="interleague-table">
                    <thead>
                        <tr>
                            <th>팀</th>
                            <th>리그</th>
                            <th>교류전 승</th>
                            <th>교류전 패</th>
                            <th>교류전 무</th>
                            <th>승률</th>
                        </tr>
                    </thead>
                    <tbody id="interleague-body"></tbody>
                </table>
                <div id="interleague-loading" class="loading-indicator" style="display:none;">교류전 데이터 로딩 중...</div>
            </div>
        `;
    }

    renderIfReady() {
        if (this.standings && this.gameRecords) {
            this.computeAndRender();
        }
    }

    computeAndRender() {
        const teams = (this.standings || []).map(t => t.name);
        let records = [];
        const seasonData = window.npbDataManager?.getData('seasonData');
        if (seasonData && Array.isArray(seasonData)) {
            seasonData.forEach(day => {
                (day.games||[]).forEach(g => records.push({
                    homeTeam: g.homeTeam || g.home,
                    awayTeam: g.awayTeam || g.away,
                    homeScore: g.homeScore,
                    awayScore: g.awayScore
                }));
            });
        } else {
            records = (this.gameRecords && this.gameRecords.games) ? this.gameRecords.games : [];
        }

        // 팀별 교류전 성과
        const perTeam = new Map(teams.map(t => [t, { team: t, league: NPBUtils.getTeamLeague(t), W: 0, L: 0, D: 0 }]));

        // 리그 간 합산
        const leagueAgg = { central: { W: 0, L: 0, D: 0 }, pacific: { W: 0, L: 0, D: 0 } };

        records.forEach(g => {
            const home = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
            const away = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
            const hs = g.homeScore;
            const as = g.awayScore;
            const lh = NPBUtils.getTeamLeague(home);
            const la = NPBUtils.getTeamLeague(away);
            if (lh === la) return; // only interleague
            if (typeof hs !== 'number' || typeof as !== 'number') return; // final only

            const homeRow = perTeam.get(home);
            const awayRow = perTeam.get(away);
            if (!homeRow || !awayRow) return;

            if (hs === as) {
                homeRow.D++; awayRow.D++;
                leagueAgg[lh].D++; leagueAgg[la].D++;
            } else if (hs > as) {
                homeRow.W++; awayRow.L++;
                leagueAgg[lh].W++; leagueAgg[la].L++;
            } else {
                homeRow.L++; awayRow.W++;
                leagueAgg[lh].L++; leagueAgg[la].W++;
            }
        });

        const rows = Array.from(perTeam.values())
            .map(r => ({ ...r, winPct: (r.W + r.L) > 0 ? r.W / (r.W + r.L) : 0 }))
            .sort((a, b) => b.winPct - a.winPct);

        // Render table
        const tbody = document.getElementById('interleague-body');
        tbody.innerHTML = rows.map(row => {
            return `
                <tr>
                    <td class="team-name">${row.team}</td>
                    <td>${row.league === 'central' ? '세리그' : '파리그'}</td>
                    <td>${row.W}</td>
                    <td>${row.L}</td>
                    <td>${row.D}</td>
                    <td>${NPBUtils.formatWinPct(row.winPct)}</td>
                </tr>
            `;
        }).join('');

        // Render summary
        const cs = leagueAgg.central; const ps = leagueAgg.pacific;
        const centralPct = (cs.W + cs.L) > 0 ? (cs.W / (cs.W + cs.L)) : 0;
        const pacificPct = (ps.W + ps.L) > 0 ? (ps.W / (ps.W + ps.L)) : 0;
        const summary = document.getElementById('interleague-summary');
        summary.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item"><label>세리그 합계:</label> <span>${cs.W}승 ${cs.L}패 ${cs.D}무 (승률 ${NPBUtils.formatWinPct(centralPct)})</span></div>
                <div class="summary-item"><label>파리그 합계:</label> <span>${ps.W}승 ${ps.L}패 ${ps.D}무 (승률 ${NPBUtils.formatWinPct(pacificPct)})</span></div>
            </div>
        `;
        
    }

    showLoadingState(isLoading) {
        const el = document.getElementById('interleague-loading');
        if (el) el.style.display = isLoading ? 'block' : 'none';
    }

    async refresh() {
        if (window.npbApiClient && window.npbDataManager) {
            window.npbDataManager.setLoading(true);
            try {
                const [standings, records] = await Promise.all([
                    window.npbApiClient.getStandings(),
                    window.npbApiClient.getGameRecords()
                ]);
                window.npbDataManager.updateData('standings', standings);
                window.npbDataManager.updateData('gameRecords', records);
            } catch (e) {
                console.error('교류전 데이터 새로고침 실패:', e);
            } finally {
                window.npbDataManager.setLoading(false);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.NPBInterleagueTable = NPBInterleagueTable;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBInterleagueTable;
}
