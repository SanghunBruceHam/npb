/**
 * NPB 구조화된 TXT 파일을 JavaScript로 파싱해서 JSON으로 변환
 * 크롤링 → TXT → JS 처리 → JSON 저장
 */

class NPBTxtProcessor {
    constructor() {
        this.baseUrl = 'data/structured_txt/';
    }

    /**
     * 텍스트 파일 로드
     */
    async loadTxtFile(filename) {
        try {
            const response = await fetch(`${this.baseUrl}${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${filename}: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
        }
    }

    /**
     * 순위표 TXT 파싱
     */
    parseStandingsTxt(txtData) {
        const lines = txtData.split('\n');
        const standings = [];
        
        for (const line of lines) {
            // 주석이나 빈 줄 무시
            if (line.startsWith('#') || !line.trim()) continue;
            
            const parts = line.split('|');
            if (parts.length >= 13) {
                standings.push({
                    position_rank: parseInt(parts[0]),
                    team_id: parseInt(parts[1]),
                    team_abbreviation: parts[2],
                    team_name: parts[3],
                    league: parts[4],
                    games_played: parseInt(parts[5]),
                    wins: parseInt(parts[6]),
                    losses: parseInt(parts[7]),
                    draws: parseInt(parts[8]),
                    win_percentage: parseFloat(parts[9]),
                    games_behind: parseFloat(parts[10]),
                    runs_scored: parseInt(parts[11]),
                    runs_allowed: parseInt(parts[12])
                });
            }
        }
        
        // 리그별로 분리
        const central = standings.filter(team => team.league === 'Central');
        const pacific = standings.filter(team => team.league === 'Pacific');
        
        return {
            updated_at: new Date().toISOString(),
            central_league: { standings: central },
            pacific_league: { standings: pacific }
        };
    }

    /**
     * 최근 경기 TXT 파싱
     */
    parseRecentGamesTxt(txtData) {
        const lines = txtData.split('\n');
        const games = [];
        
        for (const line of lines) {
            if (line.startsWith('#') || !line.trim()) continue;
            
            const parts = line.split('|');
            if (parts.length >= 10) {
                games.push({
                    game_id: parseInt(parts[0]),
                    game_date: parts[1],
                    home_team_name: parts[2],
                    away_team_name: parts[3],
                    home_score: parseInt(parts[4]),
                    away_score: parseInt(parts[5]),
                    game_status: parts[6],
                    is_extra_innings: parts[7] === '1',
                    home_team_abbr: parts[8],
                    away_team_abbr: parts[9]
                });
            }
        }
        
        return games;
    }

    /**
     * 팀 정보 TXT 파싱
     */
    parseTeamsTxt(txtData) {
        const lines = txtData.split('\n');
        const teams = [];
        
        for (const line of lines) {
            if (line.startsWith('#') || !line.trim()) continue;
            
            const parts = line.split('|');
            if (parts.length >= 4) {
                teams.push({
                    team_id: parseInt(parts[0]),
                    team_abbreviation: parts[1],
                    team_name: parts[2],
                    league: parts[3],
                    city: parts[4] || '',
                    stadium: parts[5] || ''
                });
            }
        }
        
        return teams;
    }

    /**
     * 모든 TXT 파일 처리해서 JSON 생성
     */
    async processAllTxtToJson() {
        console.log('🔄 Processing TXT files to JSON...');
        
        const results = {
            standings: null,
            games: null,
            teams: null,
            errors: []
        };

        // 순위표 처리
        try {
            const standingsTxt = await this.loadTxtFile('standings_latest.txt');
            if (standingsTxt) {
                results.standings = this.parseStandingsTxt(standingsTxt);
                console.log('✅ Standings processed');
            }
        } catch (error) {
            results.errors.push(`Standings error: ${error.message}`);
        }

        // 경기 결과 처리
        try {
            const gamesTxt = await this.loadTxtFile('recent_games_latest.txt');
            if (gamesTxt) {
                results.games = this.parseRecentGamesTxt(gamesTxt);
                console.log('✅ Games processed');
            }
        } catch (error) {
            results.errors.push(`Games error: ${error.message}`);
        }

        // 팀 정보 처리
        try {
            const teamsTxt = await this.loadTxtFile('teams_latest.txt');
            if (teamsTxt) {
                results.teams = this.parseTeamsTxt(teamsTxt);
                console.log('✅ Teams processed');
            }
        } catch (error) {
            results.errors.push(`Teams error: ${error.message}`);
        }

        return results;
    }

    /**
     * JSON 파일로 저장 (Node.js 환경에서만 가능)
     */
    async saveJsonFiles(data) {
        // 브라우저 환경에서는 다운로드로 처리
        if (typeof window !== 'undefined') {
            this.downloadJsonFiles(data);
            return;
        }

        // Node.js 환경에서만 실행
        const fs = require('fs');
        const path = require('path');
        
        const dataDir = path.join(__dirname, '..', 'data');
        
        if (data.standings) {
            fs.writeFileSync(
                path.join(dataDir, 'standings.json'), 
                JSON.stringify(data.standings, null, 2), 
                'utf8'
            );
            console.log('📄 standings.json saved');
        }

        if (data.games) {
            fs.writeFileSync(
                path.join(dataDir, 'games.json'), 
                JSON.stringify(data.games, null, 2), 
                'utf8'
            );
            console.log('📄 games.json saved');
        }

        if (data.teams) {
            fs.writeFileSync(
                path.join(dataDir, 'teams.json'), 
                JSON.stringify(data.teams, null, 2), 
                'utf8'
            );
            console.log('📄 teams.json saved');
        }
    }

    /**
     * 브라우저에서 JSON 파일 다운로드
     */
    downloadJsonFiles(data) {
        const downloads = [
            { name: 'standings.json', data: data.standings },
            { name: 'games.json', data: data.games },
            { name: 'teams.json', data: data.teams }
        ];

        downloads.forEach(({ name, data }) => {
            if (data) {
                const blob = new Blob([JSON.stringify(data, null, 2)], 
                    { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log(`📄 ${name} downloaded`);
            }
        });
    }

    /**
     * 대시보드 데이터 생성
     */
    generateDashboardData(standings, games) {
        if (!standings || !games) return null;

        // 오늘 경기 찾기
        const today = new Date().toISOString().split('T')[0];
        const todayGames = games.filter(game => game.game_date === today);

        // 최근 고득점 경기
        const highScoringGames = games
            .map(game => ({
                ...game,
                total_score: game.home_score + game.away_score
            }))
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 5);

        return {
            generated_at: new Date().toISOString(),
            today_games: todayGames,
            high_scoring_games: highScoringGames,
            leagues: {
                central: standings.central_league.standings,
                pacific: standings.pacific_league.standings
            }
        };
    }
}

// 브라우저와 Node.js 모두에서 사용 가능
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBTxtProcessor;
} else if (typeof window !== 'undefined') {
    window.NPBTxtProcessor = NPBTxtProcessor;
}