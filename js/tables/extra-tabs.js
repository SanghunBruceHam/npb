// 공통 베이스 뷰: 간단한 스캐폴드 렌더링 유틸
class NPBBaseView {
  constructor(containerId, title, description) {
    this.container = document.getElementById(containerId);
    this.title = title;
    this.description = description || '';
    this.standings = null;
    this.teamStats = null;
    this.gameRecords = null;
    if (!this.container) return;
    this.init();
  }

  init() {
    if (window.npbDataManager) {
      window.npbDataManager.subscribe('standings', d => { this.standings = d; this.render(); });
      window.npbDataManager.subscribe('teamStats', d => { this.teamStats = d; this.render(); });
      window.npbDataManager.subscribe('gameRecords', d => { this.gameRecords = d; this.render(); });
      window.npbDataManager.subscribe('seasonData', d => { this.seasonData = d; this.render(); });
    }
    this.container.innerHTML = this.shell();
  }

  shell() {
    return `
      <div class="analysis-section">
        <h3>${this.title}</h3>
        ${this.description ? `<p class="section-description">${this.description}</p>` : ''}
        <div class="content" id="${this.container.id}-content">데이터 준비 중...</div>
      </div>
    `;
  }

  setContent(html) {
    const el = document.getElementById(`${this.container.id}-content`);
    if (el) el.innerHTML = html;
  }

  render() {
    // override in subclasses
  }
}

// 1) 시즌 진행률
class NPBSeasonProgressView extends NPBBaseView {
  constructor(id) { super(id, '📅 시즌 진행률', '2025시즌 NPB 경기 진행 현황 및 잔여 경기'); }
  render() {
    if (!this.standings && !this.seasonData) return;

    // 1) 시즌 데이터 기반(가능 시) 경기 소화 수
    let totalGamesPlayed = 0;
    const teamGamesPlayed = new Map(); // 팀별 경기 수
    
    if (this.seasonData && Array.isArray(this.seasonData)) {
      // 팀별 경기 수 초기화
      const teamSet = new Set();
      this.seasonData.forEach(day => {
        (day.games || []).forEach(g => {
          teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
          teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
        });
      });
      teamSet.forEach(team => teamGamesPlayed.set(team, 0));
      
      // 완료된 경기 집계
      totalGamesPlayed = this.seasonData.reduce((sum, day) => {
        const dayGames = (day.games || []).filter(g => typeof g.homeScore === 'number' && typeof g.awayScore === 'number');
        dayGames.forEach(g => {
          const home = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
          const away = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
          teamGamesPlayed.set(home, teamGamesPlayed.get(home) + 1);
          teamGamesPlayed.set(away, teamGamesPlayed.get(away) + 1);
        });
        return sum + dayGames.length;
      }, 0);
    } else if (this.standings) {
      // 폴백: 순위 데이터 기반
      this.standings.forEach(team => {
        const games = team.wins + team.losses + (team.draws || 0);
        teamGamesPlayed.set(team.name, games);
      });
      totalGamesPlayed = this.standings.reduce((s, t) => s + t.wins + t.losses + (t.draws || 0), 0) / 2;
    }

    // 전체 가능 경기 수(12팀 × 143 / 2 = 858)
    const totalPossibleGames = 12 * 143 / 2;
    const maxTeamGames = 143;

    // 리그별 진행률 계산
    let centralPlayed = 0, pacificPlayed = 0;
    if (this.seasonData && Array.isArray(this.seasonData)) {
      this.seasonData.forEach(day => {
        (day.games || []).forEach(g => {
          const hL = NPBUtils.getTeamLeague(g.homeTeam || g.home);
          const aL = NPBUtils.getTeamLeague(g.awayTeam || g.away);
          const isFinal = typeof g.homeScore === 'number' && typeof g.awayScore === 'number';
          if (!isFinal) return;
          if (hL === 'central' && aL === 'central') centralPlayed += 1;
          else if (hL === 'pacific' && aL === 'pacific') pacificPlayed += 1;
        });
      });
    }

    const progressPct = totalPossibleGames ? (totalGamesPlayed / totalPossibleGames * 100) : 0;
    const centralPct = centralPlayed ? ((centralPlayed / (6 * 143 / 2)) * 100) : 0;
    const pacificPct = pacificPlayed ? ((pacificPlayed / (6 * 143 / 2)) * 100) : 0;

    // 팀별 진행률 계산
    const teamProgressData = Array.from(teamGamesPlayed.entries()).map(([team, games]) => {
      const percentage = (games / maxTeamGames * 100);
      const league = NPBUtils.getTeamLeague(team);
      return { team, games, percentage, league };
    }).sort((a, b) => b.percentage - a.percentage);

    let html = `
      <div class="season-progress-container">
        <!-- 전체 진행률 -->
        <div class="progress-section">
          <h4>🏟️ 전체 시즌 진행률</h4>
          <div class="progress-item">
            <div class="progress-label">
              <span>전체 진행률</span>
              <span class="progress-value">${progressPct.toFixed(1)}%</span>
            </div>
            <div class="progress-bar-container" style="position: relative;">
              <div class="progress-bar">
                <div class="progress-fill overall" style="width: ${progressPct}%"></div>
                <div class="progress-text" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #fff; font-size: 12px; font-weight: 600; z-index: 2;">
                  ${Math.floor(totalGamesPlayed)} / ${Math.floor(totalPossibleGames)}
                </div>
                <div class="remaining-text" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #333; font-size: 12px; font-weight: 600;">
                  잔여: ${Math.floor(totalPossibleGames - totalGamesPlayed)}경기
                </div>
              </div>
            </div>
            <div class="progress-info">
              ${Math.floor(totalGamesPlayed)}경기 완료 / ${Math.floor(totalPossibleGames)}경기 총 예정
            </div>
          </div>
        </div>

        <!-- 리그별 진행률 -->
        <div class="progress-section">
          <h4>⚾ 리그별 진행률</h4>
          <div class="progress-item">
            <div class="progress-label">
              <span>세리그 (Central)</span>
              <span class="progress-value">${centralPct.toFixed(1)}%</span>
            </div>
            <div class="progress-bar-container" style="position: relative;">
              <div class="progress-bar">
                <div class="progress-fill central" style="width: ${centralPct}%"></div>
                <div class="progress-text" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #fff; font-size: 12px; font-weight: 600; z-index: 2;">
                  ${centralPlayed} / ${Math.floor(totalPossibleGames/2)}
                </div>
                <div class="remaining-text" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #333; font-size: 12px; font-weight: 600;">
                  잔여: ${Math.floor(totalPossibleGames/2 - centralPlayed)}경기
                </div>
              </div>
            </div>
            <div class="progress-info">${centralPlayed}경기 완료</div>
          </div>
          
          <div class="progress-item">
            <div class="progress-label">
              <span>파리그 (Pacific)</span>
              <span class="progress-value">${pacificPct.toFixed(1)}%</span>
            </div>
            <div class="progress-bar-container" style="position: relative;">
              <div class="progress-bar">
                <div class="progress-fill pacific" style="width: ${pacificPct}%"></div>
                <div class="progress-text" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #fff; font-size: 12px; font-weight: 600; z-index: 2;">
                  ${pacificPlayed} / ${Math.floor(totalPossibleGames/2)}
                </div>
                <div class="remaining-text" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #333; font-size: 12px; font-weight: 600;">
                  잔여: ${Math.floor(totalPossibleGames/2 - pacificPlayed)}경기
                </div>
              </div>
            </div>
            <div class="progress-info">${pacificPlayed}경기 완료</div>
          </div>
        </div>

        <!-- 팀별 진행률 - 리그별로 구분 -->
        <div class="progress-section">
          <h4>🏆 세리그 팀별 경기 소화율</h4>
          <div class="team-progress-grid">
    `;

    // 세리그 팀들
    const centralTeams = teamProgressData.filter(t => t.league === 'central');
    centralTeams.forEach(({ team, games, percentage }) => {
      html += `
        <div class="team-progress-item">
          <div class="progress-label">
            <span class="team-name">${team}</span>
            <span class="progress-value">${percentage.toFixed(1)}%</span>
          </div>
          <div class="progress-bar-container" style="position: relative;">
            <div class="progress-bar small">
              <div class="progress-fill central" style="width: ${percentage}%"></div>
              <div class="progress-text" style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); color: #fff; font-size: 10px; font-weight: 600; z-index: 2;">
                ${games}
              </div>
              <div class="remaining-text" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); color: #555; font-size: 10px; font-weight: 600;">
                잔여: ${maxTeamGames - games}
              </div>
            </div>
          </div>
          <div class="progress-info small">${games}/${maxTeamGames}경기</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
        
        <div class="progress-section">
          <h4>🏆 파리그 팀별 경기 소화율</h4>
          <div class="team-progress-grid">
    `;

    // 파리그 팀들
    const pacificTeams = teamProgressData.filter(t => t.league === 'pacific');
    pacificTeams.forEach(({ team, games, percentage }) => {
      html += `
        <div class="team-progress-item">
          <div class="progress-label">
            <span class="team-name">${team}</span>
            <span class="progress-value">${percentage.toFixed(1)}%</span>
          </div>
          <div class="progress-bar-container" style="position: relative;">
            <div class="progress-bar small">
              <div class="progress-fill pacific" style="width: ${percentage}%"></div>
              <div class="progress-text" style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); color: #fff; font-size: 10px; font-weight: 600; z-index: 2;">
                ${games}
              </div>
              <div class="remaining-text" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); color: #555; font-size: 10px; font-weight: 600;">
                잔여: ${maxTeamGames - games}
              </div>
            </div>
          </div>
          <div class="progress-info small">${games}/${maxTeamGames}경기</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
        
        <div class="update-info">
          마지막 업데이트: ${new Date().toLocaleString('ja-JP')}
        </div>
      </div>
    `;

    this.setContent(html);
  }
}

// 2) 일자별 지표(스캐폴드)
// Shared timeline builder (cache by reference)
function NPB_buildDailyTimeline(seasonData) {
  if (!Array.isArray(seasonData)) return null;
  // 최근 경기가 있는 날짜까지만 포함
  const days = [...seasonData]
    .filter(d => d.games && d.games.length > 0 && d.games.some(g => typeof g.homeScore === 'number' && typeof g.awayScore === 'number'))
    .sort((a,b)=> new Date(a.date)-new Date(b.date));
  const dates = days.map(d=>d.date);
  const teamSet = new Set();
  days.forEach(day => (day.games||[]).forEach(g => {
    const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
    const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
    teamSet.add(h); teamSet.add(a);
  }));
  const teams = Array.from(teamSet);
  const leagueOf = t => NPBUtils.getTeamLeague(t);
  const record = new Map(teams.map(t=>[t,{W:0,L:0,D:0}]));
  const timeline = new Map(teams.map(t=>[t,{ dates:[], winPct:[], rank:[], gb:[] }]));
  for (const day of days) {
    for (const g of (day.games||[])) {
      const hs = g.homeScore, as = g.awayScore;
      if (typeof hs !== 'number' || typeof as !== 'number') continue;
      const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
      const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
      const hRec = record.get(h); const aRec = record.get(a);
      if (!hRec || !aRec) continue;
      if (hs === as) { hRec.D++; aRec.D++; }
      else if (hs > as) { hRec.W++; aRec.L++; }
      else { hRec.L++; aRec.W++; }
    }
    const leagues = ['central','pacific'];
    const leagueLeaders = {}; const leagueSorted = {};
    leagues.forEach(lg => {
      const lgTeams = teams.filter(t => leagueOf(t)===lg).map(t => {
        const r = record.get(t);
        const pct = (r.W + r.L) ? (r.W/(r.W+r.L)) : 0;
        return { name:t, W:r.W, L:r.L, pct };
      }).sort((a,b)=> b.pct - a.pct || (b.W - a.W));
      leagueSorted[lg] = lgTeams; leagueLeaders[lg] = lgTeams[0] || null;
    });
    teams.forEach(t => {
      const r = record.get(t);
      const pct = (r.W + r.L) ? (r.W/(r.W+r.L)) : 0;
      const lg = leagueOf(t);
      const leader = leagueLeaders[lg];
      const rank = (leagueSorted[lg]||[]).findIndex(x=>x.name===t) + 1;
      let gb = 0; if (leader) gb = ((leader.W - r.W) + (r.L - leader.L)) / 2;
      const tl = timeline.get(t);
      tl.dates.push(day.date);
      tl.winPct.push(+pct.toFixed(3));
      tl.rank.push(rank || null);
      tl.gb.push(+gb.toFixed(1));
    });
  }
  return { dates, teams, timeline, leagueOf };
}

class NPBDailyTrendsView extends NPBBaseView {
  constructor(id) { super(id, '📈 일자별 순위·게임차·승률', '리그/지표 선택 후 팀별 선 그래프'); this._cache = null; }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) {
      this.setContent('<div>시즌 일자별 데이터(seasonData)가 필요합니다.</div>');
      return;
    }

    // 최초 렌더: 지표 탭 + 리그 탭 + 차트 구성
    if (!document.getElementById('daily-charts-container')) {
      this.setContent(`
        <div class="metric-tabs">
          <button class="metric-tab-btn active" data-metric="rank">순위 변동</button>
          <button class="metric-tab-btn" data-metric="winPct">승률 추이</button>
          <button class="metric-tab-btn" data-metric="gb">게임차 변동</button>
        </div>
        <div class="league-tabs">
          <button class="league-tab-btn active" data-league="central">🔵 세리그</button>
          <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
        </div>
        <div id="daily-charts-container">
          <div class="chart-container" style="height: 500px; margin-top: 20px;">
            <canvas id="daily-chart" style="height: 500px;"></canvas>
          </div>
        </div>
      `);

      // 지표 탭 이벤트 리스너
      document.querySelectorAll('.metric-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.metric-tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          setTimeout(() => this.drawDailyTrend(), 100);
        });
      });

      // 리그 탭 이벤트 리스너
      document.querySelectorAll('.league-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.league-tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          setTimeout(() => this.drawDailyTrend(), 100);
        });
      });
    }

    // 데이터 준비 및 그래프 그리기
    if (!this._cache) this._cache = NPB_buildDailyTimeline(this.seasonData);
    setTimeout(() => this.drawDailyTrend(), 100);
  }

  drawDailyTrend() {
    if (!this._cache || typeof Chart === 'undefined') return;
    const { dates, teams, timeline, leagueOf } = this._cache;
    
    // 현재 선택된 지표와 리그
    const activeMetricBtn = document.querySelector('.metric-tab-btn.active');
    const activeLeagueBtn = document.querySelector('.league-tab-btn.active');
    const metric = activeMetricBtn ? activeMetricBtn.dataset.metric : 'rank';
    const selectedLeague = activeLeagueBtn ? activeLeagueBtn.dataset.league : 'central';

    // 최근 데이터가 있는 날짜 찾기
    let lastDateWithData = dates.length - 1;
    for (let i = dates.length - 1; i >= 0; i--) {
      const hasData = teams.some(t => {
        const data = timeline.get(t)[metric];
        return data && data[i] != null && data[i] !== undefined;
      });
      if (hasData) {
        lastDateWithData = i;
        break;
      }
    }
    
    // 최근 날짜까지의 데이터만 사용
    const effectiveDates = dates.slice(0, lastDateWithData + 1);
    const palette = ['#e11d48','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6'];

    // 선택된 리그의 팀들만 필터링
    const leagueTeams = teams.filter(t => leagueOf(t) === selectedLeague);
    const canvas = document.getElementById('daily-chart');
    
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 캔버스 사이즈 설정
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 500;
    
    const datasets = leagueTeams.map((t, i) => ({
      label: t,
      data: (timeline.get(t)[metric]||[]).slice(0, lastDateWithData + 1),
      borderColor: palette[i % palette.length],
      backgroundColor: palette[i % palette.length],
      borderWidth: 3,
      tension: 0.25,
      spanGaps: true,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: palette[i % palette.length],
      pointBorderColor: palette[i % palette.length]
    }));

    // 기존 차트 파괴
    if (this._chart) this._chart.destroy();
    
    this._chart = new Chart(ctx, {
      type: 'line',
      data: { labels: effectiveDates, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { 
          mode: 'index', 
          intersect: false 
        },
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20,
              font: {
                size: 14
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1f2937',
            bodyColor: '#374151',
            borderColor: '#d1d5db',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: function(context) {
                return `📅 ${context[0].label}`;
              },
              label: function(context) {
                const value = context.parsed.y;
                const teamName = context.dataset.label;
                if (metric === 'rank') {
                  return `${teamName}: ${Math.round(value)}위`;
                } else if (metric === 'winPct') {
                  return `${teamName}: ${value.toFixed(3)}`;
                } else if (metric === 'gb') {
                  return `${teamName}: ${value === 0 ? '-' : value.toFixed(1)}GB`;
                }
                return `${teamName}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            reverse: metric === 'rank', // 순위는 작을수록 위
            suggestedMin: metric === 'rank' ? 1 : undefined,
            suggestedMax: metric === 'rank' ? 6 : (metric==='winPct'?1:undefined),
            grid: {
              color: 'rgba(156, 163, 175, 0.2)'
            },
            ticks: {
              font: {
                size: 13
              },
              color: '#6b7280',
              callback: function(value) {
                if (metric === 'rank') {
                  return Math.round(value) + '위';
                } else if (metric === 'winPct') {
                  return value.toFixed(3);
                } else if (metric === 'gb') {
                  return value === 0 ? '-' : value.toFixed(1) + 'GB';
                }
                return value;
              }
            }
          },
          x: { 
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            },
            ticks: { 
              maxRotation: 0, 
              autoSkip: true,
              font: {
                size: 11
              },
              color: '#6b7280',
              callback: function(value, index) {
                const date = this.getLabelForValue(value);
                return date ? date.substring(5) : ''; // MM-DD 형태로 표시
              }
            }
          }
        }
      }
    });
  }
  }

// 3) 순위 변동 추이(스캐폴드)
class NPBRankTrendView extends NPBBaseView {
  constructor(id) { super(id, '📊 순위 변동 추이', '팀별 일자별 순위(리그별)'); this._cache = null; }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) {
      this.setContent('<div>seasonData가 필요합니다.</div>');
      return;
    }

    if (!document.getElementById('rank-trend-chart')) {
      this.setContent(`
        <div class="league-tabs">
          <button class="league-tab-btn active" data-league="central">🔵 세리그</button>
          <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
        </div>
        <div class="chart-container" style="margin-top:10px; position:relative; height:400px; width:100%;">
          <canvas id="rank-trend-chart"></canvas>
        </div>
      `);
      document.querySelectorAll('.league-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.league-tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          setTimeout(() => this.draw(), 100);
        });
      });
    }

    if (!this._cache) this._cache = NPB_buildDailyTimeline(this.seasonData);
    setTimeout(() => this.draw(), 100);
  }

  draw() {
    if (!this._cache || typeof Chart === 'undefined') return;
    const { dates, teams, timeline, leagueOf } = this._cache;
    const activeBtn = document.querySelector('.league-tab-btn.active');
    const league = activeBtn ? activeBtn.dataset.league : 'central';
    const leagueTeams = teams.filter(t => leagueOf(t)===league);
    const palette = ['#e11d48','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6'];
    const datasets = leagueTeams.map((t, i) => ({
      label: t,
      data: timeline.get(t).rank,
      borderColor: palette[i%palette.length],
      backgroundColor: palette[i%palette.length],
      borderWidth: 2,
      tension: 0.25,
      spanGaps: true,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: palette[i%palette.length],
      pointBorderColor: palette[i%palette.length]
    }));

    const canvas = document.getElementById('rank-trend-chart');
    const ctx = canvas.getContext('2d');
    
    // 캔버스 사이즈 명시적 설정
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 400;
    
    if (this._chart) this._chart.destroy();
    this._chart = new Chart(ctx, {
      type: 'line',
      data: { labels: dates, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { 
          mode: 'index', 
          intersect: false 
        },
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1f2937',
            bodyColor: '#374151',
            borderColor: '#d1d5db',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              title: function(context) {
                return `📅 ${context[0].label}`;
              },
              label: function(context) {
                return `${context.dataset.label}: ${Math.round(context.parsed.y)}위`;
              }
            }
          }
        },
        scales: {
          y: { 
            reverse: true, 
            suggestedMin: 1, 
            suggestedMax: 6,
            grid: { color: 'rgba(156, 163, 175, 0.2)' },
            ticks: {
              font: { size: 11 },
              color: '#6b7280',
              callback: function(value) { return Math.round(value) + '위'; }
            }
          },
          x: { 
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { 
              maxRotation: 0, 
              autoSkip: true,
              font: { size: 10 },
              color: '#6b7280',
              callback: function(value) {
                const date = this.getLabelForValue(value);
                return date ? date.substring(5) : '';
              }
            }
          }
        }
      }
    });
  }
}

// 4) 승률 추이(스캐폴드)
class NPBWinrateTrendView extends NPBBaseView {
  constructor(id) { super(id, '📉 승률 추이', '팀별 일자별 승률(리그별)'); this._cache = null; }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) {
      this.setContent('<div>seasonData가 필요합니다.</div>');
      return;
    }

    if (!document.getElementById('winrate-trend-chart')) {
      this.setContent(`
        <div class="league-tabs">
          <button class="league-tab-btn active" data-league="central">🔵 세리그</button>
          <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
        </div>
        <div class="chart-container" style="margin-top:10px; position:relative; height:400px; width:100%;">
          <canvas id="winrate-trend-chart"></canvas>
        </div>
      `);
      document.querySelectorAll('.league-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.league-tab-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          setTimeout(() => this.draw(), 100);
        });
      });
    }

    if (!this._cache) this._cache = NPB_buildDailyTimeline(this.seasonData);
    setTimeout(() => this.draw(), 100);
  }

  draw() {
    if (!this._cache || typeof Chart === 'undefined') return;
    const { dates, teams, timeline, leagueOf } = this._cache;
    const activeBtn = document.querySelector('.league-tab-btn.active');
    const league = activeBtn ? activeBtn.dataset.league : 'central';
    const leagueTeams = teams.filter(t => leagueOf(t)===league);
    const palette = ['#e11d48','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6'];
    const datasets = leagueTeams.map((t, i) => ({
      label: t,
      data: timeline.get(t).winPct,
      borderColor: palette[i%palette.length],
      backgroundColor: palette[i%palette.length],
      borderWidth: 2,
      tension: 0.25,
      spanGaps: true,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: palette[i%palette.length],
      pointBorderColor: palette[i%palette.length]
    }));

    const canvas = document.getElementById('winrate-trend-chart');
    const ctx = canvas.getContext('2d');
    
    // 캔버스 사이즈 명시적 설정
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 400;
    
    if (this._chart) this._chart.destroy();
    this._chart = new Chart(ctx, {
      type: 'line',
      data: { labels: dates, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { 
          mode: 'index', 
          intersect: false 
        },
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1f2937',
            bodyColor: '#374151',
            borderColor: '#d1d5db',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              title: function(context) {
                return `📅 ${context[0].label}`;
              },
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)}`;
              }
            }
          }
        },
        scales: { 
          y: { 
            min: 0, 
            max: 1,
            grid: { color: 'rgba(156, 163, 175, 0.2)' },
            ticks: {
              font: { size: 11 },
              color: '#6b7280',
              callback: function(value) { return value.toFixed(3); }
            }
          },
          x: { 
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { 
              maxRotation: 0, 
              autoSkip: true,
              font: { size: 10 },
              color: '#6b7280',
              callback: function(value) {
                const date = this.getLabelForValue(value);
                return date ? date.substring(5) : '';
              }
            }
          }
        }
      }
    });
  }
}

// 5) 종합 지표(간단 요약)
class NPBOverallMetricsView extends NPBBaseView {
  constructor(id) { super(id, '📊 종합 순위 - 전체 지표', '기본 지표 요약'); }
  render() {
    if (!this.standings) return;
    const teams = this.standings.length;
    const best = [...this.standings].sort((a,b)=>b.winPct-a.winPct)[0];
    const central = this.standings.filter(t => NPBUtils.getTeamLeague(t.name)==='central');
    const pacific = this.standings.filter(t => NPBUtils.getTeamLeague(t.name)==='pacific');
    const avg = arr => arr.length? (arr.reduce((s,t)=>s+(t.winPct||0),0)/arr.length):0;
    const centralAvg = avg(central), pacificAvg = avg(pacific);
    let bestRunDiff = null;
    if (this.teamStats) {
      const withDiff = this.teamStats.map(t=>({ name: t.name, diff: (t.runsScored||0)-(t.runsAllowed||0) }));
      bestRunDiff = withDiff.sort((a,b)=>b.diff-a.diff)[0];
    }
    this.setContent(`
      <div class="summary-grid">
        <div class="summary-item"><label>팀 수:</label><span>${teams}</span></div>
        <div class="summary-item"><label>최고 승률 팀:</label><span>${best?.name || '-'} (${NPBUtils.formatWinPct(best?.winPct || 0)})</span></div>
        <div class="summary-item"><label>세리그 평균 승률:</label><span>${NPBUtils.formatWinPct(centralAvg)}</span></div>
        <div class="summary-item"><label>파리그 평균 승률:</label><span>${NPBUtils.formatWinPct(pacificAvg)}</span></div>
        ${bestRunDiff?`<div class="summary-item"><label>최고 득실차:</label><span>${bestRunDiff.name} (${bestRunDiff.diff>=0?'+':''}${NPBUtils.formatNumber(bestRunDiff.diff)})</span></div>`:''}
      </div>
    `);
  }
}

// 6) 전/후반기 비교(스캐폴드)
class NPBHalfSeasonView extends NPBBaseView {
  constructor(id) { super(id, '⚖️ 전/후반기 비교', '올스타 브레이크 기준 전/후반기 성적 비교'); }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) {
      this.setContent('<div>seasonData가 필요합니다.</div>');
      return;
    }

    // 팀별 결과 타임라인 생성 (결정 경기만)
    const teamSet = new Set();
    this.seasonData.forEach(day => (day.games||[]).forEach(g => {
      teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
      teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
    }));
    const teams = Array.from(teamSet);
    const results = new Map(teams.map(t=>[t, []])); // array of {date, r}

    const days = [...this.seasonData].sort((a,b)=> new Date(a.date)-new Date(b.date));
    const allStar = (typeof window !== 'undefined' && window.npbConfig && window.npbConfig.season && window.npbConfig.season.allStar)
      ? window.npbConfig.season.allStar
      : { firstGame: '2025-07-23', secondGame: '2025-07-24' };
    const firstDate = new Date(allStar.firstGame);
    const secondDate = new Date(allStar.secondGame);
    for (const day of days) {
      for (const g of (day.games||[])) {
        const hs = g.homeScore, as = g.awayScore;
        if (typeof hs !== 'number' || typeof as !== 'number') continue;
        const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
        const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
        const hArr = results.get(h); const aArr = results.get(a);
        const rHome = (hs === as) ? 'D' : (hs > as ? 'W' : 'L');
        const rAway = rHome === 'W' ? 'L' : rHome === 'L' ? 'W' : 'D';
        hArr.push({ date: day.date, r: rHome });
        aArr.push({ date: day.date, r: rAway });
      }
    }
    const rows = teams.map(t => {
      const arr = results.get(t);
      const first = arr.filter(x => new Date(x.date) < firstDate).map(x=>x.r);
      const second = arr.filter(x => new Date(x.date) > secondDate).map(x=>x.r);
      const count = s => ({
        W: s.filter(x=>x==='W').length,
        L: s.filter(x=>x==='L').length,
        D: s.filter(x=>x==='D').length,
      });
      const c1 = count(first), c2 = count(second);
      const pct = c => (c.W + c.L) ? (c.W/(c.W+c.L)) : 0;
      return {
        team: t,
        league: NPBUtils.getTeamLeague(t),
        first: { ...c1, pct: pct(c1) },
        second: { ...c2, pct: pct(c2) },
        delta: +(pct(c2) - pct(c1)).toFixed(3)
      };
    }).sort((a,b)=> b.delta - a.delta);

    // 렌더 표 (리그 필터 탭)
    const html = `
      <div class="league-tabs">
        <button class="league-tab-btn active" data-league="all">전체</button>
        <button class="league-tab-btn" data-league="central">🔵 세리그</button>
        <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
      </div>
      <table id="half-season-table" class="half-table" style="width:100%;margin-top:10px;">
        <thead>
          <tr>
            <th>팀</th><th>리그</th>
            <th>전반기 W-L-D</th><th>전반기 승률</th>
            <th>후반기 W-L-D</th><th>후반기 승률</th>
            <th>승률 변화</th>
          </tr>
        </thead>
        <tbody id="half-body"></tbody>
      </table>`;

    this.setContent(html);

    const renderBody = () => {
      const activeBtn = document.querySelector('.league-tab-btn.active');
      const sel = activeBtn ? activeBtn.dataset.league : 'all';
      const data = rows.filter(r => sel==='all' ? true : r.league===sel);
      const tbody = document.getElementById('half-body');
      tbody.innerHTML = data.map(r => `
        <tr>
          <td>${r.team}</td>
          <td>${r.league==='central'?'세리그':'파리그'}</td>
          <td>${r.first.W}-${r.first.L}-${r.first.D}</td>
          <td>${NPBUtils.formatWinPct(r.first.pct)}</td>
          <td>${r.second.W}-${r.second.L}-${r.second.D}</td>
          <td>${NPBUtils.formatWinPct(r.second.pct)}</td>
          <td>${r.delta>=0?'+':''}${r.delta.toFixed(3)}</td>
        </tr>
      `).join('');
    };
    document.querySelectorAll('.league-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.league-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderBody();
      });
    });
    renderBody();
  }
}

// 7) 고급 지표 통합 (피타고리안, 기대승률, 운 지수)
class NPBAdvancedMetricsView extends NPBBaseView {
  constructor(id) { super(id, '📊 고급 지표 분석', '피타고리안 기대승률, 운 지수, 고급 통계 종합'); }
  
  shell() {
    return `
      <div class="unified-section">
        <div class="unified-header">
          <h3>${this.title}</h3>
          <p class="unified-description">${this.description}</p>
        </div>
        
        <div class="leagues-container">
          <div class="league-section">
            <div class="league-header">
              <div class="league-title central">🔵 세리그 (Central League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="central-advanced-metrics">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="team">팀</th>
                    <th class="sortable number-cell center-cell" data-sort="games">경기</th>
                    <th class="sortable number-cell center-cell" data-sort="actual">실제승률</th>
                    <th class="sortable number-cell center-cell" data-sort="expected">기대승률</th>
                    <th class="sortable number-cell center-cell" data-sort="luck">운지수</th>
                    <th class="sortable number-cell center-cell" data-sort="scored">득점</th>
                    <th class="sortable number-cell center-cell" data-sort="allowed">실점</th>
                    <th class="sortable number-cell center-cell" data-sort="diff">득실차</th>
                    <th class="sortable number-cell center-cell" data-sort="rpg">경기당득점</th>
                    <th class="sortable number-cell center-cell" data-sort="rapg">경기당실점</th>
                  </tr>
                </thead>
                <tbody id="central-advanced-metrics-body"></tbody>
              </table>
            </div>
          </div>
          
          <div class="league-section">
            <div class="league-header">
              <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="pacific-advanced-metrics">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="team">팀</th>
                    <th class="sortable number-cell center-cell" data-sort="games">경기</th>
                    <th class="sortable number-cell center-cell" data-sort="actual">실제승률</th>
                    <th class="sortable number-cell center-cell" data-sort="expected">기대승률</th>
                    <th class="sortable number-cell center-cell" data-sort="luck">운지수</th>
                    <th class="sortable number-cell center-cell" data-sort="scored">득점</th>
                    <th class="sortable number-cell center-cell" data-sort="allowed">실점</th>
                    <th class="sortable number-cell center-cell" data-sort="diff">득실차</th>
                    <th class="sortable number-cell center-cell" data-sort="rpg">경기당득점</th>
                    <th class="sortable number-cell center-cell" data-sort="rapg">경기당실점</th>
                  </tr>
                </thead>
                <tbody id="pacific-advanced-metrics-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  render() {
    if (!this.standings || !this.teamStats) return;
    
    const enrichedData = this.standings.map(t => {
      const s = this.teamStats.find(x=>x.name===t.name) || {};
      const totalGames = t.wins + t.losses + (t.draws || 0);
      const pythWinPct = NPBUtils.calculatePythagoreanWinPct(s.runsScored||0, s.runsAllowed||0);
      const luckIndex = (t.winPct || 0) - pythWinPct;
      const runsPG = totalGames > 0 ? (s.runsScored || 0) / totalGames : 0;
      const raPerGame = totalGames > 0 ? (s.runsAllowed || 0) / totalGames : 0;
      
      return {
        team: t.name,
        league: NPBUtils.getTeamLeague(t.name),
        actual: t.winPct || 0,
        expected: pythWinPct || 0,
        luckIndex: +luckIndex.toFixed(3),
        runsScored: s.runsScored || 0,
        runsAllowed: s.runsAllowed || 0,
        runDiff: (s.runsScored||0) - (s.runsAllowed||0),
        rpg: +runsPG.toFixed(2),
        rapg: +raPerGame.toFixed(2),
        totalGames
      };
    });
    
    // 리그별로 분리
    const centralData = enrichedData.filter(team => team.league === 'central');
    const pacificData = enrichedData.filter(team => team.league === 'pacific');
    
    this.renderLeagueTable('central-advanced-metrics-body', centralData);
    this.renderLeagueTable('pacific-advanced-metrics-body', pacificData);
    
    // 정렬 기능 초기화
    setTimeout(() => {
      this.initializeSorting();
    }, 100);
  }
  
  renderLeagueTable(bodyId, teams) {
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;
    
    tbody.innerHTML = teams.map(r => `
      <tr>
        <td class="team-cell">${r.team}</td>
        <td class="number-cell center-cell">${r.totalGames}</td>
        <td class="number-cell center-cell">${NPBUtils.formatWinPct(r.actual)}</td>
        <td class="number-cell center-cell">${NPBUtils.formatWinPct(r.expected)}</td>
        <td class="number-cell center-cell ${r.luckIndex>=0?'positive':'negative'}">${r.luckIndex>=0?'+':''}${r.luckIndex.toFixed(3)}</td>
        <td class="number-cell center-cell">${NPBUtils.formatNumber(r.runsScored)}</td>
        <td class="number-cell center-cell">${NPBUtils.formatNumber(r.runsAllowed)}</td>
        <td class="number-cell center-cell ${r.runDiff>=0?'positive':'negative'}">${r.runDiff>=0?'+':''}${NPBUtils.formatNumber(r.runDiff)}</td>
        <td class="number-cell center-cell">${r.rpg.toFixed(2)}</td>
        <td class="number-cell center-cell">${r.rapg.toFixed(2)}</td>
      </tr>
    `).join('');
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
      
      const aNum = parseFloat(aValue.replace(/[+,]/g, ''));
      const bNum = parseFloat(bValue.replace(/[+,]/g, ''));
      
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
}

// 7-1) 기존 운 지수 분석 (호환성을 위해 유지)
class NPBLuckAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '🎯 피타고리안 기대승률 & 운 지수', '실제 vs 기대 승률 비교'); }
  render() {
    if (!this.standings || !this.teamStats) return;
    const enrich = t => {
      const s = this.teamStats.find(x=>x.name===t.name) || {};
      const p = NPBUtils.calculatePythagoreanWinPct(s.runsScored||0, s.runsAllowed||0);
      const diff = (t.winPct || 0) - p;
      return {
        team: t.name,
        league: NPBUtils.getTeamLeague(t.name),
        actual: t.winPct || 0,
        pyth: p || 0,
        diff: +diff.toFixed(3),
        runsScored: s.runsScored || 0,
        runsAllowed: s.runsAllowed || 0,
        runDiff: (s.runsScored||0) - (s.runsAllowed||0)
      };
    };
    const all = this.standings.map(enrich).sort((a,b)=> b.diff - a.diff);

    const html = `
      <div class="league-tabs">
        <button class="league-tab-btn active" data-league="all">전체</button>
        <button class="league-tab-btn" data-league="central">🔵 세리그</button>
        <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
      </div>
      <div class="analysis-controls" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
        <label>정렬:</label>
        <select id="luck-sort">
          <option value="diff-desc">운 지수(내림차순)</option>
          <option value="diff-asc">운 지수(오름차순)</option>
          <option value="actual">실제 승률</option>
          <option value="pyth">피타 승률</option>
          <option value="runDiff">득실차</option>
        </select>
      </div>
      <table id="luck-analysis-table" class="luck-table" style="width:100%;margin-top:10px;">
        <thead>
          <tr>
            <th>팀</th><th>리그</th>
            <th>실제 승률</th><th>피타 승률</th>
            <th>운 지수(차)</th>
            <th>득점</th><th>실점</th><th>득실차</th>
          </tr>
        </thead>
        <tbody id="luck-body"></tbody>
      </table>`;
    this.setContent(html);

    const render = () => {
      const activeBtn = document.querySelector('.league-tab-btn.active');
      const lg = activeBtn ? activeBtn.dataset.league : 'all';
      const sort = document.getElementById('luck-sort').value;
      let rows = all.filter(r => lg==='all' ? true : r.league===lg);
      rows = rows.sort((a,b)=>{
        switch (sort) {
          case 'diff-asc': return a.diff - b.diff;
          case 'actual': return b.actual - a.actual;
          case 'pyth': return b.pyth - a.pyth;
          case 'runDiff': return (b.runDiff - a.runDiff);
          default: return b.diff - a.diff;
        }
      });
      const tbody = document.getElementById('luck-body');
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td>${r.team}</td>
          <td>${r.league==='central'?'세리그':'파리그'}</td>
          <td>${NPBUtils.formatWinPct(r.actual)}</td>
          <td>${NPBUtils.formatWinPct(r.pyth)}</td>
          <td>${r.diff>=0?'+':''}${r.diff.toFixed(3)}</td>
          <td>${NPBUtils.formatNumber(r.runsScored)}</td>
          <td>${NPBUtils.formatNumber(r.runsAllowed)}</td>
          <td class="${r.runDiff>=0?'positive':'negative'}">${r.runDiff>=0?'+':''}${NPBUtils.formatNumber(r.runDiff)}</td>
        </tr>
      `).join('');
      
    };
    document.querySelectorAll('.league-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.league-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        render();
      });
    });
    document.getElementById('luck-sort').addEventListener('change', render);
    render();
  }
}

// 8) 클러치(스캐폴드)
class NPBClutchAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '🧠 클러치 상황 분석', '1점차·2점차 및 접전 지표'); }
  
  shell() {
    return `
      <div class="unified-section">
        <div class="unified-header">
          <h3>${this.title}</h3>
          <p class="unified-description">${this.description}</p>
        </div>
        
        <div class="leagues-container">
          <div class="league-section">
            <div class="league-header">
              <div class="league-title central">🔵 세리그 (Central League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="central-clutch">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="team">팀</th>
                    <th class="sortable number-cell center-cell" data-sort="oneRecord">1점차기록</th>
                    <th class="sortable number-cell center-cell" data-sort="onePct">1점차승률</th>
                    <th class="sortable number-cell center-cell" data-sort="twoPct">2점차이내승률</th>
                    <th class="sortable number-cell center-cell" data-sort="overallPct">전체승률</th>
                    <th class="sortable number-cell center-cell" data-sort="clutchIdx">클러치지수</th>
                  </tr>
                </thead>
                <tbody id="central-clutch-body"></tbody>
              </table>
            </div>
          </div>
          
          <div class="league-section">
            <div class="league-header">
              <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="pacific-clutch">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="team">팀</th>
                    <th class="sortable number-cell center-cell" data-sort="oneRecord">1점차기록</th>
                    <th class="sortable number-cell center-cell" data-sort="onePct">1점차승률</th>
                    <th class="sortable number-cell center-cell" data-sort="twoPct">2점차이내승률</th>
                    <th class="sortable number-cell center-cell" data-sort="overallPct">전체승률</th>
                    <th class="sortable number-cell center-cell" data-sort="clutchIdx">클러치지수</th>
                  </tr>
                </thead>
                <tbody id="pacific-clutch-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) {
      return;
    }
    
    const teamSet = new Set();
    this.seasonData.forEach(day => (day.games||[]).forEach(g => {
      teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
      teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
    }));
    const teams = Array.from(teamSet);
    const stat = new Map(teams.map(t=>[t, {overall:{W:0,L:0,D:0}, one:{W:0,L:0,D:0}, two:{W:0,L:0,D:0}}]));

    const days = [...this.seasonData].sort((a,b)=> new Date(a.date)-new Date(b.date));
    for (const day of days) {
      for (const g of (day.games||[])) {
        const hs = g.homeScore, as = g.awayScore;
        if (typeof hs !== 'number' || typeof as !== 'number') continue;
        const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
        const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
        const diff = Math.abs(hs - as);
        const hS = stat.get(h), aS = stat.get(a);
        if (hs === as) { hS.overall.D++; aS.overall.D++; if (diff===0){ hS.one.D++; aS.one.D++; hS.two.D++; aS.two.D++; } continue; }
        const hWin = hs > as;
        (hWin ? hS.overall.W++ : hS.overall.L++);
        (!hWin ? aS.overall.W++ : aS.overall.L++);
        if (diff === 1) { (hWin ? hS.one.W++ : hS.one.L++); (!hWin ? aS.one.W++ : aS.one.L++); }
        if (diff <= 2) { (hWin ? hS.two.W++ : hS.two.L++); (!hWin ? aS.two.W++ : aS.two.L++); }
      }
    }

    const pct = o => (o.W+o.L) ? (o.W/(o.W+o.L)) : 0;
    const enrichedData = teams.map(t => {
      const s = stat.get(t);
      const clutchIdx = +(pct(s.one) - pct(s.overall)).toFixed(3);
      return {
        team: t,
        league: NPBUtils.getTeamLeague(t),
        one: { ...s.one, pct: pct(s.one) },
        two: { ...s.two, pct: pct(s.two) },
        overall: { ...s.overall, pct: pct(s.overall) },
        clutchIdx
      };
    });

    // 리그별로 분리
    const centralData = enrichedData.filter(team => team.league === 'central');
    const pacificData = enrichedData.filter(team => team.league === 'pacific');
    
    this.renderLeagueTable('central-clutch-body', centralData);
    this.renderLeagueTable('pacific-clutch-body', pacificData);
    
    // 정렬 기능 초기화
    setTimeout(() => {
      this.initializeSorting();
    }, 100);
  }
  
  renderLeagueTable(bodyId, teams) {
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;
    
    tbody.innerHTML = teams.map(r => `
      <tr>
        <td class="team-cell">${r.team}</td>
        <td class="number-cell center-cell">${r.one.W}-${r.one.L}-${r.one.D}</td>
        <td class="number-cell center-cell">${NPBUtils.formatWinPct(r.one.pct)}</td>
        <td class="number-cell center-cell">${NPBUtils.formatWinPct(r.two.pct)}</td>
        <td class="number-cell center-cell">${NPBUtils.formatWinPct(r.overall.pct)}</td>
        <td class="number-cell center-cell ${r.clutchIdx>=0?'positive':'negative'}">${r.clutchIdx>=0?'+':''}${r.clutchIdx.toFixed(3)}</td>
      </tr>
    `).join('');
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
      
      const aNum = parseFloat(aValue.replace(/[+,]/g, ''));
      const bNum = parseFloat(bValue.replace(/[+,]/g, ''));
      
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
}

// 9) 팀간 잔여경기수 매트릭스
class NPBRemainingGamesView extends NPBBaseView {
  constructor(id) { super(id, '⏳ 팀간 잔여경기수', '리그 내 팀간 남은 경기 수를 매트릭스로 확인'); }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) { 
      this.setContent('<div class="no-data-message">시즌 데이터를 로딩 중입니다...</div>'); 
      return; 
    }

    // 팀 목록 추출
    const teamSet = new Set();
    this.seasonData.forEach(day => {
      (day.games || []).forEach(g => {
        teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
        teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
      });
    });
    const teams = Array.from(teamSet).sort();

    // 이미 치른 경기수 계산 (팀간 매트릭스)
    const playedGames = new Map();
    teams.forEach(team => {
      playedGames.set(team, new Map());
      teams.forEach(opponent => {
        if (team !== opponent) {
          playedGames.get(team).set(opponent, 0);
        }
      });
    });

    // 실제 경기 결과에서 이미 치른 경기수 집계
    this.seasonData.forEach(day => {
      (day.games || []).forEach(g => {
        const hs = g.homeScore, as = g.awayScore;
        if (typeof hs !== 'number' || typeof as !== 'number') return; // 경기가 치러진 것만 카운트
        
        const home = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
        const away = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
        
        playedGames.get(home).set(away, playedGames.get(home).get(away) + 1);
        playedGames.get(away).set(home, playedGames.get(away).get(home) + 1);
      });
    });

    // NPB 2025 시즌: 실제 데이터를 기반으로 예상 총 경기수 계산
    // 데이터에서 팀간 최대 경기수를 추출하여 시즌 기준으로 사용
    const expectedGamesMap = new Map();
    teams.forEach(team1 => {
      expectedGamesMap.set(team1, new Map());
      teams.forEach(team2 => {
        if (team1 !== team2) {
          expectedGamesMap.get(team1).set(team2, 0);
        }
      });
    });

    // 전체 시즌 데이터에서 예정된 경기수 계산 (완료된 경기 + 예정된 경기)
    this.seasonData.forEach(day => {
      (day.games || []).forEach(g => {
        const home = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
        const away = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
        if (expectedGamesMap.has(home) && expectedGamesMap.has(away)) {
          expectedGamesMap.get(home).set(away, expectedGamesMap.get(home).get(away) + 1);
          expectedGamesMap.get(away).set(home, expectedGamesMap.get(away).get(home) + 1);
        }
      });
    });

    const getExpectedGames = (team1, team2) => {
      return expectedGamesMap.get(team1)?.get(team2) || 0;
    };

    // 잔여경기 계산
    const remainingGames = new Map();
    teams.forEach(team => {
      remainingGames.set(team, new Map());
      teams.forEach(opponent => {
        if (team !== opponent) {
          const expected = getExpectedGames(team, opponent);
          const played = playedGames.get(team).get(opponent) || 0;
          const remaining = Math.max(0, expected - played);
          remainingGames.get(team).set(opponent, remaining);
        }
      });
    });

    // 리그별로 팀을 분리
    const centralTeams = teams.filter(team => NPBUtils.getTeamLeague(team) === 'central');
    const pacificTeams = teams.filter(team => NPBUtils.getTeamLeague(team) === 'pacific');

    // 리그별 매트릭스 테이블 생성 함수 - 리그 내 경기만 표시
    const createLeagueMatrix = (leagueTeams, leagueName, leagueClass) => {
      let matrixHtml = `
        <div class="league-remaining-matrix ${leagueClass}">
          <h4>${leagueName}</h4>
          <div class="matrix-table-wrapper">
            <table class="remaining-matrix-table">
              <thead>
                <tr>
                  <th class="team-header" style="min-width: 100px; width: 100px;"></th>
                  ${leagueTeams.map(team => `
                    <th class="opponent-header" title="${team}">
                      <div class="team-abbr">${team.substring(0, 3)}</div>
                    </th>
                  `).join('')}
                  <th class="total-header">리그내<br>잔여</th>
                  <th class="inter-header">교류전<br>잔여</th>
                  <th class="grand-total">전체<br>잔여</th>
                </tr>
              </thead>
              <tbody>
      `;

      leagueTeams.forEach(team => {
        let leagueRemaining = 0;
        let interleagueRemaining = 0;
        
        // 리그 내 경기 카운트
        const row = leagueTeams.map(opponent => {
          if (team === opponent) {
            return '<td class="self-cell">-</td>';
          } else {
            const remaining = remainingGames.get(team).get(opponent) || 0;
            leagueRemaining += remaining;
            const cellClass = remaining > 10 ? 'high-remaining' : 
                             remaining > 5 ? 'medium-remaining' : 
                             remaining > 0 ? 'low-remaining' : 'no-remaining';
            return `<td class="matrix-cell ${cellClass}">${remaining}</td>`;
          }
        }).join('');
        
        // 교류전 경기 카운트
        const otherLeagueTeams = teams.filter(t => !leagueTeams.includes(t));
        otherLeagueTeams.forEach(opponent => {
          interleagueRemaining += remainingGames.get(team).get(opponent) || 0;
        });

        const totalRemaining = leagueRemaining + interleagueRemaining;
        
        matrixHtml += `
          <tr>
            <td class="team-name" style="min-width: 100px; width: 100px;"><strong>${team}</strong></td>
            ${row}
            <td class="league-total ${leagueRemaining > 40 ? 'high-count' : ''}">${leagueRemaining}</td>
            <td class="inter-total ${interleagueRemaining > 10 ? 'high-count' : ''}">${interleagueRemaining}</td>
            <td class="grand-total-cell"><strong>${totalRemaining}</strong></td>
          </tr>
        `;
      });

      matrixHtml += `
              </tbody>
            </table>
          </div>
        </div>
      `;
      return matrixHtml;
    };

    // 전체 HTML 구성
    let html = `
      <div class="remaining-games-container">
        <div class="section-header">
          <h3>⏳ 팀간 잔여경기수 분석</h3>
          <p class="section-description">리그 내 팀간 남은 경기수를 한눈에 확인하세요</p>
        </div>
        
        <div class="league-tabs">
          <button class="league-tab-btn active" data-league="both">전체 리그</button>
          <button class="league-tab-btn" data-league="central">🔵 세리그</button>
          <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
        </div>
        
        <div class="matrix-container" id="both-leagues">
          <div class="matrices-grid">
            ${createLeagueMatrix(centralTeams, '🔵 세리그 (Central League)', 'central-matrix')}
            ${createLeagueMatrix(pacificTeams, '🔴 파리그 (Pacific League)', 'pacific-matrix')}
          </div>
        </div>
        
        <div class="matrix-container" id="central-league" style="display: none;">
          ${createLeagueMatrix(centralTeams, '🔵 세리그 (Central League)', 'central-matrix single')}
        </div>
        
        <div class="matrix-container" id="pacific-league" style="display: none;">
          ${createLeagueMatrix(pacificTeams, '🔴 파리그 (Pacific League)', 'pacific-matrix single')}
        </div>
        
        <div class="matrix-legend">
          <h5>잔여경기 범례</h5>
          <div class="legend-items">
            <div class="legend-item"><span class="legend-color high-remaining"></span> 10경기 초과</div>
            <div class="legend-item"><span class="legend-color medium-remaining"></span> 6-10경기</div>
            <div class="legend-item"><span class="legend-color low-remaining"></span> 1-5경기</div>
            <div class="legend-item"><span class="legend-color no-remaining"></span> 완료</div>
          </div>
        </div>
      </div>
    `;

    this.setContent(html);
    
    // 리그 탭 이벤트 리스너 추가
    document.querySelectorAll('.remaining-games-container .league-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // 활성 탭 스타일 변경
        document.querySelectorAll('.remaining-games-container .league-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        // 컨테이너 표시/숨김
        const league = e.target.dataset.league;
        document.querySelectorAll('.remaining-games-container .matrix-container').forEach(container => {
          container.style.display = 'none';
        });
        
        if (league === 'both') {
          document.getElementById('both-leagues').style.display = 'block';
        } else if (league === 'central') {
          document.getElementById('central-league').style.display = 'block';
        } else if (league === 'pacific') {
          document.getElementById('pacific-league').style.display = 'block';
        }
      });
    });
  }
}

// 10) 월별(스캐폴드)
class NPBMonthlyAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '📅 기간별 성적 분석', '월별, 요일별 성적 통계를 한번에'); }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) { 
      this.setContent('<div>seasonData가 필요합니다.</div>'); 
      return; 
    }

    // 데이터 준비
    const teamSet = new Set();
    const monthlyMap = new Map();
    const weekdayMap = new Map();
    
    this.seasonData.forEach(day => {
      (day.games || []).forEach(g => {
        const hs = g.homeScore, as = g.awayScore;
        if (typeof hs !== 'number' || typeof as !== 'number') return;
        
        const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
        const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away);
        teamSet.add(h);
        teamSet.add(a);
        
        // 월별 데이터 (YYYY-MM 형식)
        const ym = day.date.substring(0, 7);
        const ensureMonthly = (t) => {
          if (!monthlyMap.has(t)) monthlyMap.set(t, new Map());
          if (!monthlyMap.get(t).has(ym)) monthlyMap.get(t).set(ym, {W:0,L:0,D:0});
          return monthlyMap.get(t).get(ym);
        };
        
        // 요일별 데이터
        const dow = new Date(day.date).getDay();
        const ensureWeekday = (t) => {
          if (!weekdayMap.has(t)) weekdayMap.set(t, Array.from({length:7}, () => ({W:0,L:0,D:0})));
          return weekdayMap.get(t)[dow];
        };
        
        // 결과 기록
        if (hs === as) {
          ensureMonthly(h).D++; ensureMonthly(a).D++;
          ensureWeekday(h).D++; ensureWeekday(a).D++;
        } else if (hs > as) {
          ensureMonthly(h).W++; ensureMonthly(a).L++;
          ensureWeekday(h).W++; ensureWeekday(a).L++;
        } else {
          ensureMonthly(h).L++; ensureMonthly(a).W++;
          ensureWeekday(h).L++; ensureWeekday(a).W++;
        }
      });
    });
    
    const teams = Array.from(teamSet).sort();
    const months = Array.from(new Set([].concat(...Array.from(monthlyMap.values()).map(m=>Array.from(m.keys()))))).sort();
    const weekdayNames = ['일','월','화','수','목','금','토'];
    
    const html = `
      <div class="period-analysis-sections">
        <!-- 리그 필터 -->
        <div class="league-filter-tabs">
          <button class="league-filter-btn active" data-league="all">전체 리그</button>
          <button class="league-filter-btn" data-league="central">🔵 세리그</button>
          <button class="league-filter-btn" data-league="pacific">🔴 파리그</button>
        </div>
        
        <!-- 월별 분석 -->
        <div class="period-section">
          <h4>📅 월별 성적 분석</h4>
          <div class="period-table-container">
            <table id="monthly-performance-table" class="period-table">
              <thead>
                <tr><th>팀</th>${months.map(m=>`<th>${m}</th>`).join('')}</tr>
              </thead>
              <tbody id="monthly-body"></tbody>
            </table>
          </div>
        </div>
        
        <!-- 요일별 분석 -->
        <div class="period-section">
          <h4>📅 요일별 성적 분석</h4>
          <div class="period-table-container">
            <table id="weekday-performance-table" class="period-table">
              <thead>
                <tr><th>팀</th>${weekdayNames.map(n=>`<th>${n}</th>`).join('')}</tr>
              </thead>
              <tbody id="weekday-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    this.setContent(html);
    
    // 데이터 저장 (렌더링용)
    this._data = { teams, monthlyMap, weekdayMap, months };
    
    // 리그 필터 이벤트
    document.querySelectorAll('.league-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.league-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.renderTables();
      });
    });
    
    this.renderTables();
  }
  
  renderTables() {
    if (!this._data) return;
    
    const activeBtn = document.querySelector('.league-filter-btn.active');
    const selectedLeague = activeBtn ? activeBtn.dataset.league : 'all';
    const { teams, monthlyMap, weekdayMap, months } = this._data;
    
    const filteredTeams = teams.filter(t => 
      selectedLeague === 'all' ? true : NPBUtils.getTeamLeague(t) === selectedLeague
    );
    
    // 월별 테이블 렌더링
    const monthlyBody = document.getElementById('monthly-body');
    if (monthlyBody) {
      monthlyBody.innerHTML = filteredTeams.map(t => {
        const cells = months.map(m => {
          const rec = monthlyMap.get(t)?.get(m) || {W:0,L:0,D:0};
          const pct = (rec.W+rec.L) ? (rec.W/(rec.W+rec.L)) : 0;
          return `${rec.W}-${rec.L}-${rec.D} (${NPBUtils.formatWinPct(pct)})`;
        }).join('</td><td>');
        return `<tr><td>${t}</td><td>${cells}</td></tr>`;
      }).join('');
    }
    
    // 요일별 테이블 렌더링
    const weekdayBody = document.getElementById('weekday-body');
    if (weekdayBody) {
      weekdayBody.innerHTML = filteredTeams.map(t => {
        const records = weekdayMap.get(t) || Array.from({length:7}, () => ({W:0,L:0,D:0}));
        const cells = records.map(rec => {
          const pct = (rec.W+rec.L) ? (rec.W/(rec.W+rec.L)) : 0;
          return `${rec.W}-${rec.L}-${rec.D} (${NPBUtils.formatWinPct(pct)})`;
        }).join('</td><td>');
        return `<tr><td>${t}</td><td>${cells}</td></tr>`;
      }).join('');
    }
  }
}

// 11) 요일별(스캐폴드)
class NPBWeekdayAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '📅 요일별 성적 분석', '요일별 팀 성적'); }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) { this.setContent('<div>seasonData가 필요합니다.</div>'); return; }
    const dow = d => new Date(d).getDay();
    const names = ['일','월','화','수','목','금','토'];
    const teamSet=new Set(); const map=new Map();
    this.seasonData.forEach(day => (day.games||[]).forEach(g=>{
      const hs=g.homeScore, as=g.awayScore; if (typeof hs!=='number'||typeof as!=='number') return;
      const h=NPBUtils.normalizeTeamName(g.homeTeam||g.home), a=NPBUtils.normalizeTeamName(g.awayTeam||g.away);
      teamSet.add(h); teamSet.add(a);
      const id=dow(day.date); const ensure=(t)=>{ if(!map.has(t)) map.set(t,Array.from({length:7},()=>({W:0,L:0,D:0}))); return map.get(t)[id]; };
      if (hs===as){ ensure(h).D++; ensure(a).D++; }
      else if (hs>as){ ensure(h).W++; ensure(a).L++; }
      else { ensure(h).L++; ensure(a).W++; }
    }));
    const teams=Array.from(teamSet).sort();
    const html=`<table id="weekday-analysis-table" class="weekday-table" style="width:100%;"><thead><tr><th>팀</th>${names.map(n=>`<th>${n}</th>`).join('')}</tr></thead><tbody id="weekday-body"></tbody></table>`;
    this.setContent(html);
    const tbody=document.getElementById('weekday-body');
    tbody.innerHTML=teams.map(t=>{
      const cells=(map.get(t)||[]).map(rec=>{ const pct=(rec.W+rec.L)? (rec.W/(rec.W+rec.L)) : 0; return `${rec.W}-${rec.L}-${rec.D} (${NPBUtils.formatWinPct(pct)})`; }).join('</td><td>');
      return `<tr><td>${t}</td><td>${cells}</td></tr>`;
    }).join('');
  }
}

// 12) 주차별(스캐폴드)
class NPBWeeklyAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '📆 주차별 성적 분석', 'ISO 주차 기준 팀 성적'); }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) { this.setContent('<div>seasonData가 필요합니다.</div>'); return; }
    const isoWeek = (d)=>{ const dt=new Date(d); dt.setHours(0,0,0,0); const day=(dt.getDay()+6)%7; dt.setDate(dt.getDate()-day+3); const first=new Date(dt.getFullYear(),0,4); const diff=1+Math.round(((dt-first)/86400000-3+((first.getDay()+6)%7))/7); return `${dt.getFullYear()}-W${String(diff).padStart(2,'0')}`; };
    const teamSet=new Set(); const map=new Map(); const weeks=new Set();
    this.seasonData.forEach(day => (day.games||[]).forEach(g=>{
      const hs=g.homeScore, as=g.awayScore; if (typeof hs!=='number'||typeof as!=='number') return;
      const w=isoWeek(day.date);
      const h=NPBUtils.normalizeTeamName(g.homeTeam||g.home), a=NPBUtils.normalizeTeamName(g.awayTeam||g.away);
      teamSet.add(h); teamSet.add(a); weeks.add(w);
      const ensure=(t)=>{ if(!map.has(t)) map.set(t,new Map()); if(!map.get(t).has(w)) map.get(t).set(w,{W:0,L:0,D:0}); return map.get(t).get(w); };
      if (hs===as){ ensure(h).D++; ensure(a).D++; }
      else if (hs>as){ ensure(h).W++; ensure(a).L++; }
      else { ensure(h).L++; ensure(a).W++; }
    }));
    const weekList=Array.from(weeks).sort();
    // 최근 12주만 표시하여 오버플로우 방지
    const recentWeeks = weekList.slice(-12);
    const teams=Array.from(teamSet).sort();
    
    const html=`
      <div class="weekly-analysis-wrapper">
        <div class="analysis-info">
          <p><strong>주차별 성적 분석</strong> - 최근 ${recentWeeks.length}주 데이터 (전체: ${weekList.length}주)</p>
          <p style="font-size: 13px; color: #6b7280;">좌우로 스크롤하여 모든 주차를 확인할 수 있습니다.</p>
        </div>
        <div class="table-scroll-container">
          <table id="weekly-analysis-table" class="weekly-table">
            <thead>
              <tr>
                <th>팀</th>
                ${recentWeeks.map(w=>`<th>${w}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="weekly-body"></tbody>
          </table>
        </div>
      </div>
    `;
    this.setContent(html);
    const tbody=document.getElementById('weekly-body');
    tbody.innerHTML=teams.map(t=>{
      const row=recentWeeks.map(w=>{ 
        const rec=map.get(t)?.get(w)||{W:0,L:0,D:0}; 
        const pct=(rec.W+rec.L)? (rec.W/(rec.W+rec.L)) : 0; 
        return `${rec.W}-${rec.L}-${rec.D} (${NPBUtils.formatWinPct(pct)})`;
      }).join('</td><td>');
      return `<tr><td>${t}</td><td>${row}</td></tr>`;
    }).join('');
  }
}

// 13) 연승/연패(스캐폴드)
class NPBGameStreaksView extends NPBBaseView {
  constructor(id) { super(id, '🔥 게임별 기록 & 연승/연패', '팀별 현재/최대 연승·연패'); }
  
  shell() {
    return `
      <div class="unified-section">
        <div class="unified-header">
          <h3>${this.title}</h3>
          <p class="unified-description">${this.description}</p>
        </div>
        
        <div class="leagues-container">
          <div class="league-section">
            <div class="league-header">
              <div class="league-title central">🔵 세리그 (Central League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="central-streaks">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="team">팀</th>
                    <th class="sortable center-cell" data-sort="current">현재 스트릭</th>
                    <th class="sortable number-cell center-cell" data-sort="maxWin">최대 연승</th>
                    <th class="sortable number-cell center-cell" data-sort="maxLose">최대 연패</th>
                  </tr>
                </thead>
                <tbody id="central-streaks-body"></tbody>
              </table>
            </div>
          </div>
          
          <div class="league-section">
            <div class="league-header">
              <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="pacific-streaks">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="team">팀</th>
                    <th class="sortable center-cell" data-sort="current">현재 스트릭</th>
                    <th class="sortable number-cell center-cell" data-sort="maxWin">최대 연승</th>
                    <th class="sortable number-cell center-cell" data-sort="maxLose">최대 연패</th>
                  </tr>
                </thead>
                <tbody id="pacific-streaks-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) return;
    
    const teamSet=new Set(); 
    this.seasonData.forEach(day => (day.games||[]).forEach(g => { 
      teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam||g.home)); 
      teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam||g.away)); 
    }));
    const teams=Array.from(teamSet);
    const results=new Map(teams.map(t=>[t,[]]));
    
    const days=[...this.seasonData].sort((a,b)=> new Date(a.date)-new Date(b.date));
    for(const day of days){ 
      for(const g of (day.games||[])){ 
        const hs=g.homeScore,as=g.awayScore; 
        if(typeof hs!=='number'||typeof as!=='number') continue; 
        const h=NPBUtils.normalizeTeamName(g.homeTeam||g.home);
        const a=NPBUtils.normalizeTeamName(g.awayTeam||g.away); 
        const hArr=results.get(h), aArr=results.get(a); 
        if(hs===as){ 
          hArr.push('D'); aArr.push('D'); 
        } else if(hs>as){ 
          hArr.push('W'); aArr.push('L'); 
        } else { 
          hArr.push('L'); aArr.push('W'); 
        } 
      } 
    }
    
    const calc=(arr)=>{ 
      let maxW=0, maxL=0, cur=0, type=null; 
      arr.forEach(r=>{ 
        if(r==='W'){ 
          cur = type==='W'? cur+1 : 1; 
          type='W'; 
          maxW=Math.max(maxW,cur);
        } else if(r==='L'){ 
          cur = type==='L'? cur+1 : 1; 
          type='L'; 
          maxL=Math.max(maxL,cur);
        } else { 
          type=null; 
          cur=0; 
        } 
      }); 
      let currentStreak=0, currentType=null; 
      for(let i=arr.length-1;i>=0;i--){ 
        const r=arr[i]; 
        if(r==='W'||r==='L'){ 
          if(currentType==null){ 
            currentType=r; 
            currentStreak=1; 
          } else if(currentType===r){ 
            currentStreak++; 
          } else break; 
        } else break; 
      } 
      return {maxWin:maxW, maxLose:maxL, currentType, currentStreak}; 
    };
    
    const enrichedData=teams.map(t=>{ 
      const st=calc(results.get(t)); 
      return { 
        team:t, 
        league:NPBUtils.getTeamLeague(t), 
        ...st 
      }; 
    });
    
    // 리그별로 분리
    const centralData = enrichedData.filter(team => team.league === 'central');
    const pacificData = enrichedData.filter(team => team.league === 'pacific');
    
    this.renderLeagueTable('central-streaks-body', centralData);
    this.renderLeagueTable('pacific-streaks-body', pacificData);
    
    // 정렬 기능 초기화
    setTimeout(() => {
      this.initializeSorting();
    }, 100);
  }
  
  renderLeagueTable(bodyId, teams) {
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;
    
    tbody.innerHTML = teams.map(r => `
      <tr>
        <td class="team-cell">${r.team}</td>
        <td class="center-cell ${r.currentType==='W'?'positive':r.currentType==='L'?'negative':''}">
          ${r.currentType? (r.currentType==='W'?'연승 ':'연패 ') + r.currentStreak + 'G' : '-'}
        </td>
        <td class="number-cell center-cell">${r.maxWin}G</td>
        <td class="number-cell center-cell">${r.maxLose}G</td>
      </tr>
    `).join('');
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
      
      // Extract numbers from strings like "연승 5G"
      const aMatch = aValue.match(/(\d+)G/);
      const bMatch = bValue.match(/(\d+)G/);
      
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        return newSort === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      const aNum = parseFloat(aValue.replace(/[+,]/g, ''));
      const bNum = parseFloat(bValue.replace(/[+,]/g, ''));
      
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
}

// 14) 팀별 일정(스캐폴드)
class NPBTeamScheduleView extends NPBBaseView {
  constructor(id) { super(id, '📜 팀별 상세 게임 기록 및 일정', '완료/예정 포함'); }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) { 
      this.setContent('<div class="no-data-message">시즌 데이터를 로딩 중입니다...</div>'); 
      return; 
    }
    
    // 팀 목록 추출
    const teamSet = new Set(); 
    this.seasonData.forEach(day => (day.games || []).forEach(g => { 
      teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home)); 
      teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away)); 
    }));
    const teams = Array.from(teamSet).sort();
    
    // 리그별로 팀 분리
    const centralTeams = teams.filter(team => NPBUtils.getTeamLeague(team) === 'central');
    const pacificTeams = teams.filter(team => NPBUtils.getTeamLeague(team) === 'pacific');
    
    const html = `
      <div class="team-schedule-container">
        <div class="section-header">
          <h3>📜 팀별 상세 게임 기록</h3>
          <p class="section-description">각 팀의 전체 시즌 경기 일정과 결과를 확인하세요</p>
        </div>
        
        <div class="team-tabs-container">
          <div class="team-tabs-section">
            <h4>🔵 세리그</h4>
            <div class="team-tabs central-teams">
              ${centralTeams.map((team, idx) => `
                <button class="team-tab-btn ${idx === 0 ? 'active' : ''}" data-team="${team}">${team}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="team-tabs-section">
            <h4>🔴 파리그</h4>
            <div class="team-tabs pacific-teams">
              ${pacificTeams.map(team => `
                <button class="team-tab-btn" data-team="${team}">${team}</button>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="team-schedule-table-section">
          <div class="fixed-header">
            <div class="header-row">
              <div class="header-cell" style="width: 110px; min-width: 110px; max-width: 110px;">일자</div>
              <div class="header-cell" style="width: 70px; min-width: 70px; max-width: 70px;">H/A</div>
              <div class="header-cell" style="width: 110px; min-width: 110px; max-width: 110px;">상대팀</div>
              <div class="header-cell" style="width: 110px; min-width: 110px; max-width: 110px;">스코어</div>
              <div class="header-cell" style="width: 90px; min-width: 90px; max-width: 90px;">상태</div>
              <div class="header-cell" style="width: calc(100% - 490px); min-width: 110px;">결과</div>
            </div>
          </div>
          <div class="scrollable-body">
            <table class="body-table">
              <tbody id="sched-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `; 
    this.setContent(html);

    const render = (selectedTeam) => {
      const rows = [];
      const days = [...this.seasonData].sort((a, b) => new Date(a.date) - new Date(b.date));
      const today = new Date().toISOString().split('T')[0];
      let hasFutureGames = false;
      
      for (const day of days) { 
        for (const g of (day.games || [])) { 
          const h = NPBUtils.normalizeTeamName(g.homeTeam || g.home);
          const a = NPBUtils.normalizeTeamName(g.awayTeam || g.away); 
          
          if (h !== selectedTeam && a !== selectedTeam) continue; 
          
          const hs = g.homeScore;
          const as = g.awayScore; 
          const isFinal = (typeof hs === 'number' && typeof as === 'number'); 
          const isHome = h === selectedTeam;
          const ha = isHome ? '홈' : '원정'; 
          const opp = isHome ? a : h; 
          
          let score = '-';
          let result = '-';
          
          if (isFinal) {
            score = isHome ? `${hs}-${as}` : `${as}-${hs}`;
            const teamScore = isHome ? hs : as;
            const oppScore = isHome ? as : hs;
            
            if (teamScore > oppScore) {
              result = '<span style="color: #16a34a; font-weight: 600;">승</span>';
            } else if (teamScore < oppScore) {
              result = '<span style="color: #dc2626; font-weight: 600;">패</span>';
            } else {
              result = '<span style="color: #6b7280; font-weight: 600;">무</span>';
            }
          } else {
            score = g.gameTime || '-';
          }
          
          const status = g.status || g.gameType || (isFinal ? '완료' : '예정'); 
          const isFuture = !isFinal && day.date >= today;
          
          // Add separator before first future game
          if (!hasFutureGames && isFuture) {
            hasFutureGames = true;
            rows.push({
              isSeparator: true,
              separatorText: '━━━ 예정된 경기 ━━━'
            });
          }
          
          rows.push({
            date: day.date,
            ha,
            opp,
            score,
            status,
            result,
            isHome,
            isFuture
          }); 
        } 
      }
      
      const tbody = document.getElementById('sched-body');
      tbody.innerHTML = rows.map(r => {
        if (r.isSeparator) {
          return `
            <tr class="game-separator">
              <td colspan="6" style="text-align: center; background: #e5e7eb; color: #374151; font-weight: 600; padding: 12px 8px; border: 1px solid #e5e7eb;">
                ${r.separatorText}
              </td>
            </tr>
          `;
        }
        return `
          <tr class="${r.isFuture ? 'future-game' : (r.isHome ? 'home-game' : 'away-game')}">
            <td style="width: 110px; min-width: 110px; max-width: 110px; padding: 8px; border: 1px solid #e5e7eb;">${r.date}</td>
            <td style="width: 70px; min-width: 70px; max-width: 70px; padding: 8px; border: 1px solid #e5e7eb; text-align: center;"><span class="${r.isFuture ? 'future-badge' : (r.isHome ? 'home-badge' : 'away-badge')}">${r.ha}</span></td>
            <td style="width: 110px; min-width: 110px; max-width: 110px; padding: 8px; border: 1px solid #e5e7eb;">${r.opp}</td>
            <td style="width: 110px; min-width: 110px; max-width: 110px; padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${r.score}</td>
            <td style="width: 90px; min-width: 90px; max-width: 90px; padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${r.status}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${r.result}</td>
          </tr>
        `;
      }).join('');
    };
    
    // 탭 클릭 이벤트 리스너
    document.querySelectorAll('.team-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.team-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        render(e.target.dataset.team);
      });
    });
    
    // 첫 번째 팀으로 초기 렌더링
    if (centralTeams.length > 0) {
      render(centralTeams[0]);
    }
  }
}

// 15) 시리즈 분석(스캐폴드)
class NPBSeriesAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '🧩 위닝/루징 시리즈 분석', '연속 동일 상대를 하나의 시리즈로 집계'); this._data=null; }
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) { this.setContent('<div>seasonData가 필요합니다.</div>'); return; }
    if (!this._data) this._data = this.buildSeries();

    // UI: 리그 필터 + 팀 선택
    const teams = this._data.teams; // sorted
    const html = `
      <div class="league-tabs">
        <button class="league-tab-btn active" data-league="all">전체</button>
        <button class="league-tab-btn" data-league="central">🔵 세리그</button>
        <button class="league-tab-btn" data-league="pacific">🔴 파리그</button>
      </div>
      <div class="analysis-controls" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;">
        <label>팀:</label>
        <select id="series-team">
          <option value="all">전체</option>
          ${teams.map(t=>`<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <table id="series-summary-table" class="series-summary-table" style="width:100%;margin-top:10px;">
        <thead><tr><th>팀</th><th>리그</th><th>위닝 시리즈</th><th>루징 시리즈</th><th>스플릿</th><th>승률(시리즈)</th></tr></thead>
        <tbody id="series-summary-body"></tbody>
      </table>
      <div style="margin-top:12px;">
        <h4>상대별 시리즈 결과</h4>
        <table id="series-opponent-table" class="series-opponent-table" style="width:100%;">
          <thead><tr><th>팀</th><th>상대</th><th>시리즈 수</th><th>위닝</th><th>루징</th><th>스플릿</th></tr></thead>
          <tbody id="series-opponent-body"></tbody>
        </table>
      </div>`;
    this.setContent(html);

    const render = () => {
      const activeBtn = document.querySelector('.league-tab-btn.active');
      const lg = activeBtn ? activeBtn.dataset.league : 'all';
      const selTeam = document.getElementById('series-team').value;
      const { perTeam, perOpponent, leagueOf } = this._data;
      const teamsFiltered = teams.filter(t => (lg==='all' ? true : leagueOf(t)===lg) && (selTeam==='all' ? true : t===selTeam));

      // Summary
      const tbody = document.getElementById('series-summary-body');
      tbody.innerHTML = teamsFiltered.map(t => {
        const s = perTeam.get(t) || { win:0, lose:0, split:0 };
        const total = s.win + s.lose + s.split;
        const wp = total ? (s.win/total) : 0;
        return `<tr><td>${t}</td><td>${leagueOf(t)==='central'?'세리그':'파리그'}</td><td>${s.win}</td><td>${s.lose}</td><td>${s.split}</td><td>${NPBUtils.formatWinPct(wp)}</td></tr>`;
      }).join('');

      // Opponent detail (if team selected single, else empty)
      const oppBody = document.getElementById('series-opponent-body');
      if (selTeam !== 'all') {
        const rows = Array.from((perOpponent.get(selTeam) || new Map()).entries())
          .map(([opp, s]) => ({ opp, ...s, total: s.win + s.lose + s.split }))
          .sort((a,b)=> b.win - a.win || b.total - a.total);
        oppBody.innerHTML = rows.map(r => `<tr><td>${selTeam}</td><td>${r.opp}</td><td>${r.total}</td><td>${r.win}</td><td>${r.lose}</td><td>${r.split}</td></tr>`).join('');
      } else {
        oppBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#6b7280;">팀을 선택하면 상대별 시리즈 결과가 표시됩니다</td></tr>';
      }
    };
    document.querySelectorAll('.league-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.league-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        render();
      });
    });
    document.getElementById('series-team').addEventListener('change', render);
    render();
  }

  buildSeries() {
    // Build per-team chronological results
    const teamSet = new Set();
    this.seasonData.forEach(day => (day.games||[]).forEach(g => {
      teamSet.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
      teamSet.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
    }));
    const teams = Array.from(teamSet).sort();
    const leagueOf = t => NPBUtils.getTeamLeague(t);

    const schedule = new Map(teams.map(t => [t, []]));
    const days = [...this.seasonData].sort((a,b)=> new Date(a.date)-new Date(b.date));
    for (const day of days) {
      for (const g of (day.games || [])) {
        const hs=g.homeScore, as=g.awayScore;
        const final = (typeof hs==='number' && typeof as==='number');
        if (!final) continue; // only completed games
        const h=NPBUtils.normalizeTeamName(g.homeTeam||g.home), a=NPBUtils.normalizeTeamName(g.awayTeam||g.away);
        const hRes = hs===as? 'D' : (hs>as? 'W':'L');
        const aRes = hs===as? 'D' : (hs>as? 'L':'W');
        schedule.get(h).push({ date: day.date, opp: a, res: hRes });
        schedule.get(a).push({ date: day.date, opp: h, res: aRes });
      }
    }

    // Slice into series: consecutive games vs same opponent
    const perTeamSeries = new Map(teams.map(t => [t, []]));
    for (const t of teams) {
      const games = schedule.get(t).sort((x,y)=> new Date(x.date)-new Date(y.date));
      let current = null;
      for (const g of games) {
        if (!current || current.opp !== g.opp) {
          if (current) perTeamSeries.get(t).push(current);
          current = { opp: g.opp, W:0, L:0, D:0 };
        }
        if (g.res==='W') current.W++; else if (g.res==='L') current.L++; else current.D++;
      }
      if (current) perTeamSeries.get(t).push(current);
    }

    // Aggregate to summary and opponent breakdown
    const perTeam = new Map(teams.map(t => [t, { win:0, lose:0, split:0 }]));
    const perOpponent = new Map(teams.map(t => [t, new Map()]));
    const addOpp = (t, opp, k) => {
      const m = perOpponent.get(t);
      if (!m.has(opp)) m.set(opp, { win:0, lose:0, split:0 });
      m.get(opp)[k] += 1;
    };

    for (const t of teams) {
      for (const s of perTeamSeries.get(t)) {
        let k = 'split';
        if (s.W > s.L) k='win'; else if (s.L > s.W) k='lose';
        perTeam.get(t)[k] += 1;
        addOpp(t, s.opp, k);
      }
    }

    return { teams, leagueOf, perTeam, perOpponent, perTeamSeries };
  }
}

// 16) 경기장별 분석(스캐폴드)
class NPBStadiumAnalysisView extends NPBBaseView {
  constructor(id) { super(id, '🏟️ 경기장별 성적 분석', '홈팀 구장을 기준으로 집계'); }
  
  shell() {
    return `
      <div class="unified-section">
        <div class="unified-header">
          <h3>${this.title}</h3>
          <p class="unified-description">${this.description}</p>
        </div>
        
        <div class="leagues-container">
          <div class="league-section">
            <div class="league-header">
              <div class="league-title central">🔵 세리그 (Central League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="central-stadium">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="stadium">경기장(홈)</th>
                    <th class="sortable number-cell center-cell" data-sort="games">경기</th>
                    <th class="sortable center-cell" data-sort="record">홈 기록</th>
                    <th class="sortable number-cell center-cell" data-sort="winRate">홈 승률</th>
                    <th class="sortable center-cell" data-sort="bestVisitor">원정 강팀</th>
                  </tr>
                </thead>
                <tbody id="central-stadium-body"></tbody>
              </table>
            </div>
          </div>
          
          <div class="league-section">
            <div class="league-header">
              <div class="league-title pacific">🔴 파리그 (Pacific League)</div>
            </div>
            <div class="league-content">
              <table class="unified-table" id="pacific-stadium">
                <thead>
                  <tr>
                    <th class="sortable team-cell" data-sort="stadium">경기장(홈)</th>
                    <th class="sortable number-cell center-cell" data-sort="games">경기</th>
                    <th class="sortable center-cell" data-sort="record">홈 기록</th>
                    <th class="sortable number-cell center-cell" data-sort="winRate">홈 승률</th>
                    <th class="sortable center-cell" data-sort="bestVisitor">원정 강팀</th>
                  </tr>
                </thead>
                <tbody id="pacific-stadium-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  render() {
    if (!this.seasonData || !Array.isArray(this.seasonData)) return;
    
    // 구장=홈팀 기준으로 집계
    const stat = new Map();
    const ensure = (home, team, scope='home') => {
      if (!stat.has(home)) stat.set(home, { home:{W:0,L:0,D:0}, visitors:new Map() });
      if (scope==='visitor') {
        const m = stat.get(home).visitors; 
        if (!m.has(team)) m.set(team, {W:0,L:0,D:0}); 
        return m.get(team);
      }
      return stat.get(home).home;
    };
    
    const days=[...this.seasonData].sort((a,b)=> new Date(a.date)-new Date(b.date));
    for (const day of days) {
      for (const g of (day.games||[])) {
        const hs=g.homeScore, as=g.awayScore; 
        if (typeof hs!=='number'||typeof as!=='number') continue;
        const home=NPBUtils.normalizeTeamName(g.homeTeam||g.home);
        const away=NPBUtils.normalizeTeamName(g.awayTeam||g.away);
        const h = ensure(home, null, 'home'); 
        const v=ensure(home, away, 'visitor');
        if (hs===as) { h.D++; v.D++; }
        else if (hs>as) { h.W++; v.L++; }
        else { h.L++; v.W++; }
      }
    }

    const enrichedData = Array.from(stat.entries()).map(([home, obj]) => {
      const homeRec=obj.home; 
      const total=homeRec.W+homeRec.L; 
      const pct= total? (homeRec.W/total):0;
      
      // best visitor by wins at this stadium
      const best = Array.from(obj.visitors.entries())
        .map(([team,rec])=>({team, ...rec, total: rec.W+rec.L+rec.D}))
        .sort((a,b)=> b.W - a.W || b.total - a.total)[0];
      const bestStr = best? `${best.team} (${best.W}-${best.L}-${best.D})` : '-';
      
      return { 
        stadium: `${home} 홈`, 
        homeTeam: home, 
        league: NPBUtils.getTeamLeague(home), 
        total: total + homeRec.D, 
        W:homeRec.W, 
        L:homeRec.L, 
        D:homeRec.D, 
        pct, 
        bestVisitor: bestStr 
      };
    });

    // 리그별로 분리
    const centralData = enrichedData.filter(team => team.league === 'central');
    const pacificData = enrichedData.filter(team => team.league === 'pacific');
    
    this.renderLeagueTable('central-stadium-body', centralData);
    this.renderLeagueTable('pacific-stadium-body', pacificData);
    
    // 정렬 기능 초기화
    setTimeout(() => {
      this.initializeSorting();
    }, 100);
  }
  
  renderLeagueTable(bodyId, teams) {
    const tbody = document.getElementById(bodyId);
    if (!tbody) return;
    
    tbody.innerHTML = teams.map(r => `
      <tr>
        <td class="team-cell">${r.stadium}</td>
        <td class="number-cell center-cell">${r.total}</td>
        <td class="center-cell">${r.W}-${r.L}-${r.D}</td>
        <td class="number-cell center-cell">${NPBUtils.formatWinPct(r.pct)}</td>
        <td class="center-cell">${r.bestVisitor}</td>
      </tr>
    `).join('');
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
      
      const aNum = parseFloat(aValue.replace(/[+,]/g, ''));
      const bNum = parseFloat(bValue.replace(/[+,]/g, ''));
      
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
}

// 전역 등록
if (typeof window !== 'undefined') {
  Object.assign(window, {
    NPBSeasonProgressView,
    NPBDailyTrendsView,
    NPBRankTrendView,
    NPBWinrateTrendView,
    NPBOverallMetricsView,
    NPBHalfSeasonView,
    NPBAdvancedMetricsView,
    NPBLuckAnalysisView,
    NPBClutchAnalysisView,
    NPBRemainingGamesView,
    NPBMonthlyAnalysisView,
    NPBWeekdayAnalysisView,
    NPBWeeklyAnalysisView,
    NPBGameStreaksView,
    NPBTeamScheduleView,
    NPBSeriesAnalysisView,
    NPBStadiumAnalysisView,
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NPBSeasonProgressView,
    NPBDailyTrendsView,
    NPBRankTrendView,
    NPBWinrateTrendView,
    NPBOverallMetricsView,
    NPBHalfSeasonView,
    NPBAdvancedMetricsView,
    NPBLuckAnalysisView,
    NPBClutchAnalysisView,
    NPBRemainingGamesView,
    NPBMonthlyAnalysisView,
    NPBWeekdayAnalysisView,
    NPBWeeklyAnalysisView,
    NPBGameStreaksView,
    NPBTeamScheduleView,
    NPBSeriesAnalysisView,
    NPBStadiumAnalysisView,
  };
}
