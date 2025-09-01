const express = require('express');
const router = express.Router();
const { query, cache } = require('../database/connection');

// GET /api/v1/teams - 모든 팀 목록
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'teams:all';
        
        // Check cache first
        let cachedData = await cache.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                source: 'cache',
                timestamp: new Date().toISOString()
            });
        }

        const teamsQuery = `
            SELECT 
                team_id,
                team_name,
                team_name_en,
                team_name_jp,
                team_abbreviation,
                league,
                city,
                stadium,
                established_year,
                team_color,
                logo_url,
                website_url,
                is_active
            FROM teams 
            WHERE is_active = true
            ORDER BY league, team_name
        `;

        const result = await query(teamsQuery);
        
        // Group by league
        const teams = {
            central: result.rows.filter(team => team.league === 'central'),
            pacific: result.rows.filter(team => team.league === 'pacific'),
            total: result.rows.length
        };

        // Cache for 1 hour (teams data doesn't change often)
        await cache.set(cacheKey, teams, 3600);

        res.json({
            success: true,
            data: teams,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Teams API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch teams data',
            code: 'TEAMS_FETCH_ERROR'
        });
    }
});

// GET /api/v1/teams/:league - 특정 리그 팀 목록
router.get('/:league', async (req, res) => {
    try {
        const { league } = req.params;
        
        if (!['central', 'pacific'].includes(league)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid league. Must be "central" or "pacific"',
                code: 'INVALID_LEAGUE'
            });
        }

        const cacheKey = `teams:league:${league}`;
        
        // Check cache first
        let cachedData = await cache.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                source: 'cache',
                timestamp: new Date().toISOString()
            });
        }

        const teamsQuery = `
            SELECT 
                team_id,
                team_name,
                team_name_en,
                team_name_jp,
                team_abbreviation,
                league,
                city,
                stadium,
                established_year,
                team_color,
                logo_url,
                website_url,
                is_active
            FROM teams 
            WHERE league = $1 AND is_active = true
            ORDER BY team_name
        `;

        const result = await query(teamsQuery, [league]);
        
        const teams = {
            league: league,
            teams: result.rows,
            count: result.rows.length
        };

        // Cache for 1 hour
        await cache.set(cacheKey, teams, 3600);

        res.json({
            success: true,
            data: teams,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('League teams API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch league teams data',
            code: 'LEAGUE_TEAMS_FETCH_ERROR'
        });
    }
});

// GET /api/v1/teams/team/:teamId - 특정 팀 상세 정보
router.get('/team/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        if (!teamId || isNaN(teamId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid team ID',
                code: 'INVALID_TEAM_ID'
            });
        }

        const cacheKey = `teams:detail:${teamId}`;
        
        // Check cache first
        let cachedData = await cache.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                source: 'cache',
                timestamp: new Date().toISOString()
            });
        }

        // Get team details with current season stats
        const currentYear = new Date().getFullYear();
        const teamDetailQuery = `
            SELECT 
                t.*,
                s.rank,
                s.wins,
                s.losses,
                s.draws,
                s.games_played,
                s.win_percentage,
                s.games_behind,
                s.runs_scored,
                s.runs_allowed,
                s.run_differential,
                s.streak_type,
                s.streak_count,
                s.home_wins,
                s.home_losses,
                s.home_draws,
                s.away_wins,
                s.away_losses,
                s.away_draws,
                s.last10_wins,
                s.last10_losses,
                s.last10_draws,
                s.magic_number,
                s.elimination_number,
                s.last_updated as standings_updated
            FROM teams t
            LEFT JOIN standings s ON t.team_id = s.team_id AND s.season = $2
            WHERE t.team_id = $1 AND t.is_active = true
        `;

        const result = await query(teamDetailQuery, [teamId, currentYear]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found',
                code: 'TEAM_NOT_FOUND'
            });
        }

        const teamData = result.rows[0];

        // Get recent games (last 5)
        const recentGamesQuery = `
            SELECT 
                g.game_id,
                g.game_date,
                g.game_status,
                g.home_score,
                g.away_score,
                g.innings,
                g.is_extra_innings,
                CASE 
                    WHEN g.home_team_id = $1 THEN 'home'
                    ELSE 'away'
                END as venue,
                CASE 
                    WHEN g.home_team_id = $1 THEN away_team.team_name
                    ELSE home_team.team_name
                END as opponent_name,
                CASE 
                    WHEN g.home_team_id = $1 THEN away_team.team_abbreviation
                    ELSE home_team.team_abbreviation
                END as opponent_abbr,
                CASE 
                    WHEN g.home_team_id = $1 THEN away_team.team_color
                    ELSE home_team.team_color
                END as opponent_color,
                CASE 
                    WHEN g.game_status = 'completed' THEN
                        CASE 
                            WHEN (g.home_team_id = $1 AND g.home_score > g.away_score) OR
                                 (g.away_team_id = $1 AND g.away_score > g.home_score) THEN 'W'
                            WHEN g.home_score = g.away_score THEN 'T'
                            ELSE 'L'
                        END
                    ELSE null
                END as result
            FROM games g
            JOIN teams home_team ON g.home_team_id = home_team.team_id
            JOIN teams away_team ON g.away_team_id = away_team.team_id
            WHERE (g.home_team_id = $1 OR g.away_team_id = $1)
                AND g.game_date <= CURRENT_DATE
            ORDER BY g.game_date DESC, g.game_id DESC
            LIMIT 5
        `;

        const recentGamesResult = await query(recentGamesQuery, [teamId]);

        // Calculate additional metrics
        const teamDetail = {
            ...teamData,
            season: currentYear,
            recent_games: recentGamesResult.rows,
            calculated_metrics: {
                home_win_percentage: teamData.home_wins + teamData.home_losses > 0 ? 
                    Math.round((teamData.home_wins / (teamData.home_wins + teamData.home_losses)) * 1000) / 1000 : 0,
                away_win_percentage: teamData.away_wins + teamData.away_losses > 0 ? 
                    Math.round((teamData.away_wins / (teamData.away_wins + teamData.away_losses)) * 1000) / 1000 : 0,
                last10_win_percentage: teamData.last10_wins + teamData.last10_losses > 0 ? 
                    Math.round((teamData.last10_wins / (teamData.last10_wins + teamData.last10_losses)) * 1000) / 1000 : 0,
                runs_per_game: teamData.games_played > 0 ? 
                    Math.round((teamData.runs_scored / teamData.games_played) * 100) / 100 : 0,
                runs_allowed_per_game: teamData.games_played > 0 ? 
                    Math.round((teamData.runs_allowed / teamData.games_played) * 100) / 100 : 0,
                pythagorean_expectation: teamData.runs_scored > 0 && teamData.runs_allowed > 0 ? 
                    Math.round((Math.pow(teamData.runs_scored, 2) / (Math.pow(teamData.runs_scored, 2) + Math.pow(teamData.runs_allowed, 2))) * 1000) / 1000 : 0
            },
            current_streak: teamData.streak_type && teamData.streak_count > 0 ? 
                `${teamData.streak_type}${teamData.streak_count}` : null
        };

        // Cache for 10 minutes
        await cache.set(cacheKey, teamDetail, 600);

        res.json({
            success: true,
            data: teamDetail,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Team detail API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team detail data',
            code: 'TEAM_DETAIL_FETCH_ERROR'
        });
    }
});

module.exports = router;