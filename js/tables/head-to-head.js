/**
 * 간단한 NPB 상대전적 매트릭스
 */
class NPBHeadToHeadTable {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.standings = null;
        this.gameRecords = null;
        this.seasonData = null;
        this.currentLeague = 'all';
        this.init();
    }

    init() {
        // 데이터 구독
        if (window.npbDataManager) {
            window.npbDataManager.subscribe('standings', (data) => {
                this.standings = data;
                this.render();
            });
            window.npbDataManager.subscribe('gameRecords', (data) => {
                this.gameRecords = data;
                this.render();
            });
            window.npbDataManager.subscribe('seasonData', (data) => {
                this.seasonData = data;
                this.render();
            });
        }
        this.createHTML();
    }

    createHTML() {
        const uniqueId = 'h2h-' + Math.random().toString(36).substr(2, 9);
        this.contentId = uniqueId + '-content';
        
        this.container.innerHTML = `
            <div>
                <h3>🤝 상대전적 매트릭스</h3>
                <div id="${this.contentId}"></div>
            </div>
        `;
    }


    render() {
        const content = document.getElementById(this.contentId || 'h2h-content');
        if (!content) {
            console.log('❌ Content 요소를 찾을 수 없음:', this.contentId || 'h2h-content');
            return;
        }

        if (!this.standings || (!this.gameRecords && !this.seasonData)) {
            content.innerHTML = '<p>데이터 로딩 중...</p>';
            return;
        }

        console.log('🔄 Head-to-head render 호출됨');

        // 팀 목록
        // 팀 목록: standings 우선, 없으면 seasonData에서 추출
        let allTeamsFromData = (this.standings || []).map(t => t.name);
        if (!allTeamsFromData || allTeamsFromData.length === 0) {
            const set = new Set();
            (this.seasonData || []).forEach(day => (day.games||[]).forEach(g => {
                set.add(NPBUtils.normalizeTeamName(g.homeTeam || g.home));
                set.add(NPBUtils.normalizeTeamName(g.awayTeam || g.away));
            }));
            allTeamsFromData = Array.from(set);
        }
        
        // 리그 → 순위 순서로 정렬
        const centralTeams = (this.standings || [])
            .filter(t => NPBUtils.getTeamLeague(t.name) === 'central')
            .sort((a,b) => b.winPct - a.winPct || (b.wins - a.wins))
            .map(t => t.name);
        const pacificTeams = (this.standings || [])
            .filter(t => NPBUtils.getTeamLeague(t.name) === 'pacific')
            .sort((a,b) => b.winPct - a.winPct || (b.wins - a.wins))
            .map(t => t.name);
        // standings가 비어있다면 데이터에서 리그만 분리
        const centralFallback = allTeamsFromData.filter(t => NPBUtils.getTeamLeague(t) === 'central');
        const pacificFallback = allTeamsFromData.filter(t => NPBUtils.getTeamLeague(t) === 'pacific');
        const centralList = centralTeams.length ? centralTeams : centralFallback;
        const pacificList = pacificTeams.length ? pacificTeams : pacificFallback;
        const allTeams = [...centralList, ...pacificList];
        
        console.log('All teams (league→rank order):', allTeams);

        console.log('Central teams:', centralList);
        console.log('Pacific teams:', pacificList);
        
        // 각 리그별 매트릭스 계산
        const allMatrix = this.calculateMatrix(allTeams);
        const centralMatrix = this.calculateMatrix(centralList);
        const pacificMatrix = this.calculateMatrix(pacificList);

        // 인터리그 전적(팀별) 계산
        const interleagueCentral = this.computeInterleagueForTeams(centralList);
        const interleaguePacific = this.computeInterleagueForTeams(pacificList);
        
        // 모든 테이블 생성
        let html = '';
        
        // 전체 매트릭스
        html += `<div style="margin-bottom: 40px;">
            <h4 style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #374151;">📊 전체 리그 (12×12)</h4>
            ${this.createTable(allTeams, allMatrix)}
        </div>`;
        
        // 세리그 매트릭스 (교류전 컬럼 포함: 파리그 팀들)
        html += `<div style="margin-bottom: 40px;">
            <h4 style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #dc2626;">🏟️ 세리그 (6×6)</h4>
            ${this.createTable(centralList, centralMatrix, pacificList, '교류전(PL)')}
        </div>`;
        
        // 파리그 매트릭스 (교류전 컬럼 포함: 세리그 팀들)
        html += `<div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 16px 0; font-size: 18px; font-weight: bold; color: #2563eb;">🌊 파리그 (6×6)</h4>
            ${this.createTable(pacificList, pacificMatrix, centralList, '교류전(CL)')}
        </div>`;
        
        content.innerHTML = html;
        
        console.log('✅ Head-to-head 전체/세리그/파리그 테이블 렌더링 완료');
    }

    // filterTeamsByLeague는 NPBUtils.getTeamLeague 사용으로 대체

    normalizeTeamName(name) {
        if (!name) return '';
        
        // 팀명 정규화 - 공통 키워드로 단순화
        const normalized = name
            .replace(/タイガース|Tigers/gi, '阪神')
            .replace(/ジャイアンツ|Giants/gi, '巨人')
            .replace(/カープ|Carp/gi, '広島')
            .replace(/ベイスターズ|BayStars/gi, 'DeNA')
            .replace(/ドラゴンズ|Dragons/gi, '中日')
            .replace(/スワローズ|Swallows/gi, 'ヤクルト')
            .replace(/ホークス|Hawks/gi, 'ソフトバンク')
            .replace(/ファイターズ|Fighters/gi, '日本ハム')
            .replace(/バファローズ|Buffaloes/gi, 'オリックス')
            .replace(/マリーンズ|Marines/gi, 'ロッテ')
            .replace(/ライオンズ|Lions/gi, '西武')
            .replace(/イーグルス|Eagles/gi, '楽天')
            .replace(/福岡|北海道|埼玉|千葉|横浜|東京|東北|広島東洋|読売/gi, '')
            .replace(/\s+/g, '');
            
        return normalized;
    }

    calculateMatrix(teams) {
        const size = teams.length;
        const matrix = Array(size).fill().map(() => Array(size).fill().map(() => ({ 
            total: { W: 0, L: 0, D: 0 },
            home: { W: 0, L: 0, D: 0 },
            away: { W: 0, L: 0, D: 0 }
        })));
        
        // 게임 데이터: seasonData 우선(완료 경기만), 없으면 gameRecords 사용
        let games = [];
        if (Array.isArray(this.seasonData)) {
            this.seasonData.forEach(day => {
                (day.games || []).forEach(g => {
                    if (typeof g.homeScore === 'number' && typeof g.awayScore === 'number') {
                        games.push({
                            homeTeam: g.homeTeam || g.home,
                            awayTeam: g.awayTeam || g.away,
                            homeScore: g.homeScore,
                            awayScore: g.awayScore
                        });
                    }
                });
            });
        } else {
            games = this.gameRecords?.games || this.gameRecords || [];
        }
                      
        console.log('🎮 게임 데이터:', games.length, '경기');
        console.log('📋 매트릭스 계산 중, 팀 목록:', teams);
        console.log('🔍 gameRecords 전체 구조:', this.gameRecords);
        
        let matchedGames = 0;
        
        // 첫 번째 게임 샘플 확인
        if (games.length > 0) {
            console.log('🎯 첫 번째 게임 샘플:', games[0]);
        } else {
            console.log('❌ 게임 데이터가 없습니다. gameRecords:', this.gameRecords);
        }
        
        games.forEach((game, index) => {
            const home = game.homeTeam || game.home || game.홈팀 || game['home-team'];
            const away = game.awayTeam || game.away || game.원정팀 || game['away-team'];
            const homeScore = game.homeScore || game.home_score || game.홈점수;
            const awayScore = game.awayScore || game.away_score || game.원정점수;
            
            // 더 유연한 팀명 매칭
            const normHome = NPBUtils.normalizeTeamName(home);
            const normAway = NPBUtils.normalizeTeamName(away);
            const homeIdx = teams.findIndex(t => NPBUtils.normalizeTeamName(t) === normHome || t === home || t === normHome);
            const awayIdx = teams.findIndex(t => NPBUtils.normalizeTeamName(t) === normAway || t === away || t === normAway);
            
            // 첫 10경기 팀명 매칭 상태 확인
            if (index < 10) {
                console.log(`게임 ${index + 1}: ${home} vs ${away} (점수: ${homeScore}-${awayScore}) | homeIdx: ${homeIdx}, awayIdx: ${awayIdx}`);
            }
            
            if (homeIdx >= 0 && awayIdx >= 0 && typeof homeScore === 'number' && typeof awayScore === 'number') {
                matchedGames++;
                if (homeScore > awayScore) {
                    // 홈팀 승리
                    matrix[homeIdx][awayIdx].total.W++;
                    matrix[homeIdx][awayIdx].home.W++;
                    matrix[awayIdx][homeIdx].total.L++;
                    matrix[awayIdx][homeIdx].away.L++;
                } else if (homeScore < awayScore) {
                    // 어웨이팀 승리
                    matrix[homeIdx][awayIdx].total.L++;
                    matrix[homeIdx][awayIdx].home.L++;
                    matrix[awayIdx][homeIdx].total.W++;
                    matrix[awayIdx][homeIdx].away.W++;
                } else {
                    // 무승부
                    matrix[homeIdx][awayIdx].total.D++;
                    matrix[homeIdx][awayIdx].home.D++;
                    matrix[awayIdx][homeIdx].total.D++;
                    matrix[awayIdx][homeIdx].away.D++;
                }
            }
        });
        
        console.log('✅ 매칭된 게임:', matchedGames, '/ 전체:', games.length);
        
        // 첫 번째 팀의 데이터 샘플 확인
        if (teams.length > 0 && matrix[0] && matrix[0][1]) {
            console.log('📊 샘플 데이터 (', teams[0], 'vs', teams[1], '):', matrix[0][1]);
        }
        
        return matrix;
    }

    // 완료 경기 목록 (seasonData 우선)
    getCompletedGames() {
        let games = [];
        if (Array.isArray(this.seasonData)) {
            this.seasonData.forEach(day => {
                (day.games || []).forEach(g => {
                    if (typeof g.homeScore === 'number' && typeof g.awayScore === 'number') {
                        games.push({
                            home: NPBUtils.normalizeTeamName(g.homeTeam || g.home),
                            away: NPBUtils.normalizeTeamName(g.awayTeam || g.away),
                            hs: g.homeScore,
                            as: g.awayScore
                        });
                    }
                });
            });
        } else if (this.gameRecords && Array.isArray(this.gameRecords.games)) {
            games = this.gameRecords.games.map(g => ({
                home: NPBUtils.normalizeTeamName(g.homeTeam || g.home),
                away: NPBUtils.normalizeTeamName(g.awayTeam || g.away),
                hs: g.homeScore,
                as: g.awayScore
            })).filter(g => typeof g.hs === 'number' && typeof g.as === 'number');
        }
        return games;
    }

    // 팀 리스트에 대해 인터리그 성적 요약 계산
    computeInterleagueForTeams(teamList) {
        const games = this.getCompletedGames();
        const map = new Map(teamList.map(t => [t, { W:0, L:0, D:0 }]));
        const isInterleague = (a, b) => NPBUtils.getTeamLeague(a) !== NPBUtils.getTeamLeague(b);
        games.forEach(g => {
            if (!isInterleague(g.home, g.away)) return;
            const hIn = map.has(g.home), aIn = map.has(g.away);
            if (!hIn && !aIn) return; // only count for teams in this list
            if (g.hs === g.as) {
                if (hIn) map.get(g.home).D++;
                if (aIn) map.get(g.away).D++;
            } else if (g.hs > g.as) {
                if (hIn) map.get(g.home).W++;
                if (aIn) map.get(g.away).L++;
            } else {
                if (hIn) map.get(g.home).L++;
                if (aIn) map.get(g.away).W++;
            }
        });
        return map;
    }

    // 두 팀 간(팀 관점) W/L/D(총합 + 홈/원정) 계산
    computePairCell(team, opponent) {
        const t = NPBUtils.normalizeTeamName(team);
        const o = NPBUtils.normalizeTeamName(opponent);
        const games = this.getCompletedGames();
        const cell = {
            total: { W:0, L:0, D:0 },
            home: { W:0, L:0, D:0 },
            away: { W:0, L:0, D:0 }
        };
        games.forEach(g => {
            if (g.home === t && g.away === o) {
                if (g.hs === g.as) { cell.total.D++; cell.home.D++; }
                else if (g.hs > g.as) { cell.total.W++; cell.home.W++; }
                else { cell.total.L++; cell.home.L++; }
            } else if (g.home === o && g.away === t) {
                if (g.hs === g.as) { cell.total.D++; cell.away.D++; }
                else if (g.hs > g.as) { cell.total.L++; cell.away.L++; }
                else { cell.total.W++; cell.away.W++; }
            }
        });
        return cell;
    }

    // 인터리그 요약 테이블 렌더링
    createInterleagueSummaryTable(teamList, recordMap) {
        // 합계 계산
        let totalW=0,totalL=0,totalD=0;
        const rows = teamList.map(t => {
            const r = recordMap.get(t) || {W:0,L:0,D:0};
            totalW += r.W; totalL += r.L; totalD += r.D;
            const pct = (r.W + r.L) ? (r.W / (r.W + r.L)) : 0;
            return `<tr>
                <td style="padding:6px; border:1px solid #ddd; background:#fff; font-size:13px;">${t}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center; font-size:13px;">${r.W}-${r.L}${r.D?`-${r.D}`:''}</td>
                <td style="padding:6px; border:1px solid #ddd; text-align:center; color:#555; font-size:12px;">${pct.toFixed(3)}</td>
            </tr>`;
        }).join('');
        const leagueTotalPct = (totalW + totalL) ? (totalW / (totalW + totalL)) : 0;
        return `
            <div style="overflow-x:auto;">
                <table style="border-collapse:collapse; min-width:420px;">
                    <thead>
                        <tr>
                            <th style="padding:6px; border:1px solid #ddd; background:#f3f4f6; font-weight:600; font-size:13px;">팀</th>
                            <th style="padding:6px; border:1px solid #ddd; background:#f3f4f6; font-weight:600; font-size:13px;">인터리그 W-L-D</th>
                            <th style="padding:6px; border:1px solid #ddd; background:#f3f4f6; font-weight:600; font-size:13px;">승률</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        <tr>
                            <td style="padding:6px; border:1px solid #ddd; background:#fafafa; font-weight:600;">리그 합계</td>
                            <td style="padding:6px; border:1px solid #ddd; background:#fafafa; text-align:center; font-weight:600;">${totalW}-${totalL}${totalD?`-${totalD}`:''}</td>
                            <td style="padding:6px; border:1px solid #ddd; background:#fafafa; text-align:center; font-weight:600;">${leagueTotalPct.toFixed(3)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    createTable(teams, matrix, interOpponents = null, interleagueLabel = null) {
        const size = teams.length;
        console.log('📋 createTable 호출됨, teams:', teams.length, 'matrix 크기:', matrix.length);
        
        // 헤더 생성 (인터리그 열이 있으면 2단 헤더: [리그 내][교류전])
        let headerGroupRow = '';
        let headerRow = '';
        const leftHeaderStyle = 'position:sticky;left:0;z-index:2; padding:6px; border:1px solid #ddd; background:#f8fafc; font-weight:bold; font-size:14px; min-width: 180px; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        if (Array.isArray(interOpponents) && interOpponents.length) {
            headerGroupRow = `<tr>
                <th style="${leftHeaderStyle}">팀</th>
                <th style="padding:6px; border:1px solid #ddd; background:#f3f4f6; font-weight:700; font-size:13px; text-align:center;" colspan="${teams.length}">리그 내</th>
                <th style="padding:6px; border:1px solid #ddd; background:#e0e7ff; font-weight:700; font-size:13px; text-align:center;" colspan="${interOpponents.length}">${interleagueLabel || '교류전'}</th>
            </tr>`;
            headerRow = `<tr>
                <th style="${leftHeaderStyle}">상대</th>
                ${teams.map(team => `<th style=\"padding:4px; border:1px solid #ddd; background:#f8fafc; text-align:center; font-weight:bold; font-size:12px; min-width:110px;\">${team}</th>`).join('')}
                ${interOpponents.map(opp => `<th style=\"padding:4px; border:1px solid #ddd; background:#eef2ff; text-align:center; font-weight:bold; font-size:12px; min-width:110px;\">${opp}</th>`).join('')}
            </tr>`;
        } else {
            headerRow = `<tr>
                <th style="${leftHeaderStyle}">팀</th>
                ${teams.map(team => `<th style=\"padding:4px; border:1px solid #ddd; background:#f8fafc; text-align:center; font-weight:bold; font-size:12px; min-width:110px;\">${team}</th>`).join('')}
            </tr>`;
        }
        
        // 데이터 행 생성
        let dataRows = '';
        teams.forEach((team, i) => {
            // 팀명 셀을 좌측 고정 + 충분한 폭 + 말줄임 처리
            let row = `<tr><td style="position:sticky;left:0;z-index:1; padding:6px; border:1px solid #ddd; background:#f9f9f9; font-weight:bold; font-size:14px; min-width:180px; max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${team}</td>`;
            
            teams.forEach((opponent, j) => {
                if (i === j) {
                    row += '<td style="padding:4px; border:1px solid #ddd; text-align:center; background:#f5f5f5; font-size:16px; min-width:90px;">—</td>';
                } else {
                    const record = matrix[i][j];
                    
                    // 전체 성적
                    const totalGames = record.total.W + record.total.L + record.total.D;
                    const totalWinRate = totalGames > 0 ? (record.total.W / totalGames) : 0;
                    
                    // 홈 성적
                    const homeGames = record.home.W + record.home.L + record.home.D;
                    const homeWinRate = homeGames > 0 ? (record.home.W / homeGames) : 0;
                    
                    // 어웨이 성적
                    const awayGames = record.away.W + record.away.L + record.away.D;
                    const awayWinRate = awayGames > 0 ? (record.away.W / awayGames) : 0;
                    
                    // 색상 결정
                    let bgColor = '#ffffff';
                    const diff = record.total.W - record.total.L;
                    if (diff > 0) bgColor = '#e8f5e8';
                    else if (diff < 0) bgColor = '#ffe8e8';
                    
                    row += `<td style="padding:4px; border:1px solid #ddd; text-align:center; background:${bgColor}; min-width:90px;">
                        <div style="font-size:14px; line-height:1.2; margin-bottom:2px;">
                            <strong>${record.total.W}-${record.total.L}${record.total.D > 0 ? `-${record.total.D}` : ''}</strong>
                            <span style="color:#666; font-size:12px;">(${totalWinRate.toFixed(3)})</span>
                        </div>
                        <div style="font-size:11px; color:#666; line-height:1.1; margin-bottom:1px;">
                            홈: ${record.home.W}-${record.home.L}${record.home.D > 0 ? `-${record.home.D}` : ''}
                            <span style="color:#888; font-size:10px;">(${homeWinRate.toFixed(3)})</span>
                        </div>
                        <div style="font-size:11px; color:#666; line-height:1.1;">
                            원정: ${record.away.W}-${record.away.L}${record.away.D > 0 ? `-${record.away.D}` : ''}
                            <span style="color:#888; font-size:10px;">(${awayWinRate.toFixed(3)})</span>
                        </div>
                    </td>`;
                }
            });

            // 교류전 상대별 컬럼 추가
            if (Array.isArray(interOpponents) && interOpponents.length) {
                interOpponents.forEach(opp => {
                    const cell = this.computePairCell(team, opp);
                    const totalGames = cell.total.W + cell.total.L + cell.total.D;
                    const pct = totalGames ? (cell.total.W / totalGames) : 0;
                    row += `<td style="padding:4px; border:1px solid #ddd; text-align:center; background:#eef2ff; min-width:110px;">
                        <div style="font-size:14px; line-height:1.2; margin-bottom:2px;">
                            <strong>${cell.total.W}-${cell.total.L}${cell.total.D ? `-${cell.total.D}` : ''}</strong>
                            <span style="color:#666; font-size:12px;">(${pct.toFixed(3)})</span>
                        </div>
                    </td>`;
                });
            }
            
            row += '</tr>';
            dataRows += row;
        });
        
        return `
            <div style="overflow-x:auto; margin-top:10px;">
                <table style="border-collapse:collapse; min-width:100%; font-family:Arial;">
                    <thead>${headerRow}</thead>
                    <tbody>${dataRows}</tbody>
                </table>
            </div>
        `;
    }

    async refresh() {
        if (window.npbApiClient && window.npbDataManager) {
            try {
                const records = await window.npbApiClient.getGameRecords();
                window.npbDataManager.updateData('gameRecords', records);
            } catch (e) {
                console.error('새로고침 실패:', e);
            }
        }
    }
}

// 전역 등록
if (typeof window !== 'undefined') {
    window.NPBHeadToHeadTable = NPBHeadToHeadTable;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBHeadToHeadTable;
}
