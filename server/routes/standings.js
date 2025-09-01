const express = require('express');
const router = express.Router();
const { query, cache } = require('../database/connection');

// GET /api/v1/standings - 현재 시즌 전체 순위표
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'standings:current:all';
        
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

        const currentYear = new Date().getFullYear();
        const standingsQuery = `
            SELECT 
                s.*,
                t.team_name,
                t.team_name_en,
                t.team_name_jp,
                t.team_abbreviation,
                t.team_color,
                t.logo_url,
                CASE 
                    WHEN s.wins + s.losses > 0 
                    THEN ROUND(s.wins::DECIMAL / (s.wins + s.losses), 3)
                    ELSE 0.000 
                END as calculated_win_percentage
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season = $1 AND t.is_active = true
            ORDER BY s.league, s.rank ASC
        `;

        const result = await query(standingsQuery, [currentYear]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No standings data found for current season',
                code: 'NO_DATA_FOUND'
            });
        }

        // Group by league
        const standings = {
            central: result.rows.filter(row => row.league === 'central'),
            pacific: result.rows.filter(row => row.league === 'pacific'),
            season: currentYear,
            lastUpdated: result.rows[0]?.last_updated || null
        };

        // Cache for 5 minutes
        await cache.set(cacheKey, standings, 300);

        res.json({
            success: true,
            data: standings,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Standings API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch standings data',
            code: 'STANDINGS_FETCH_ERROR'
        });
    }
});

// GET /api/v1/standings/:league - 특정 리그 순위표
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

        const cacheKey = `standings:current:${league}`;
        
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

        const currentYear = new Date().getFullYear();
        const standingsQuery = `
            SELECT 
                s.*,
                t.team_name,
                t.team_name_en,
                t.team_name_jp,
                t.team_abbreviation,
                t.team_color,
                t.logo_url,
                CASE 
                    WHEN s.wins + s.losses > 0 
                    THEN ROUND(s.wins::DECIMAL / (s.wins + s.losses), 3)
                    ELSE 0.000 
                END as calculated_win_percentage
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season = $1 AND s.league = $2 AND t.is_active = true
            ORDER BY s.rank ASC
        `;

        const result = await query(standingsQuery, [currentYear, league]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No standings data found for ${league} league`,
                code: 'NO_DATA_FOUND'
            });
        }

        const standings = {
            league: league,
            teams: result.rows,
            season: currentYear,
            lastUpdated: result.rows[0]?.last_updated || null
        };

        // Cache for 5 minutes
        await cache.set(cacheKey, standings, 300);

        res.json({
            success: true,
            data: standings,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('League standings API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch league standings data',
            code: 'LEAGUE_STANDINGS_FETCH_ERROR'
        });
    }
});

// GET /api/v1/standings/team/:teamId - 특정 팀 순위 정보
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

        const cacheKey = `standings:team:${teamId}`;
        
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

        const currentYear = new Date().getFullYear();
        const teamStandingQuery = `
            SELECT 
                s.*,
                t.team_name,
                t.team_name_en,
                t.team_name_jp,
                t.team_abbreviation,
                t.team_color,
                t.logo_url,
                t.city,
                t.stadium,
                CASE 
                    WHEN s.wins + s.losses > 0 
                    THEN ROUND(s.wins::DECIMAL / (s.wins + s.losses), 3)
                    ELSE 0.000 
                END as calculated_win_percentage,
                CASE 
                    WHEN s.runs_scored > 0 AND s.runs_allowed > 0 
                    THEN ROUND((s.runs_scored::DECIMAL / s.runs_allowed) * (s.runs_scored::DECIMAL / s.runs_allowed) * s.wins / s.games_played, 3)
                    ELSE 0.000 
                END as pythagorean_expectation
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season = $1 AND s.team_id = $2 AND t.is_active = true
        `;

        const result = await query(teamStandingQuery, [currentYear, teamId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or no standings data available',
                code: 'TEAM_NOT_FOUND'
            });
        }

        const teamStanding = result.rows[0];

        // Get league context (other teams in same league)
        const leagueContextQuery = `
            SELECT 
                s.team_id,
                s.rank,
                s.wins,
                s.losses,
                s.games_behind,
                t.team_name,
                t.team_abbreviation
            FROM standings s
            JOIN teams t ON s.team_id = t.team_id
            WHERE s.season = $1 AND s.league = $2 AND t.is_active = true
            ORDER BY s.rank ASC
        `;

        const leagueResult = await query(leagueContextQuery, [currentYear, teamStanding.league]);
        
        const responseData = {
            team: teamStanding,
            leagueContext: leagueResult.rows,
            season: currentYear
        };

        // Cache for 5 minutes
        await cache.set(cacheKey, responseData, 300);

        res.json({
            success: true,
            data: responseData,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Team standings API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team standings data',
            code: 'TEAM_STANDINGS_FETCH_ERROR'
        });
    }
});

module.exports = router;