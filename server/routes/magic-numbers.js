const express = require('express');
const router = express.Router();
const { query, cache } = require('../database/connection');

// GET /api/v1/magic-numbers - 현재 시즌 전체 매직넘버
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'magic-numbers:current:all';
        
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
        const today = new Date().toISOString().split('T')[0];

        const magicNumbersQuery = `
            SELECT 
                mn.*,
                s.rank as current_rank,
                s.wins,
                s.losses,
                s.draws,
                s.games_played,
                s.win_percentage,
                s.games_behind,
                t.team_name,
                t.team_name_en,
                t.team_name_jp,
                t.team_abbreviation,
                t.team_color,
                t.logo_url
            FROM magic_numbers mn
            JOIN standings s ON mn.team_id = s.team_id AND mn.season = s.season
            JOIN teams t ON mn.team_id = t.team_id
            WHERE mn.season = $1 
                AND mn.calculation_date = (
                    SELECT MAX(calculation_date) 
                    FROM magic_numbers 
                    WHERE season = $1 AND calculation_date <= $2
                )
                AND t.is_active = true
            ORDER BY mn.league, s.rank ASC
        `;

        const result = await query(magicNumbersQuery, [currentYear, today]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No magic numbers data found for current season',
                code: 'NO_DATA_FOUND'
            });
        }

        // Group by league and calculate additional metrics
        const magicNumbers = {
            central: result.rows
                .filter(row => row.league === 'central')
                .map(calculateAdditionalMetrics),
            pacific: result.rows
                .filter(row => row.league === 'pacific')
                .map(calculateAdditionalMetrics),
            season: currentYear,
            calculationDate: result.rows[0]?.calculation_date || null,
            lastUpdated: result.rows[0]?.created_at || null
        };

        // Cache for 10 minutes
        await cache.set(cacheKey, magicNumbers, 600);

        res.json({
            success: true,
            data: magicNumbers,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Magic numbers API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch magic numbers data',
            code: 'MAGIC_NUMBERS_FETCH_ERROR'
        });
    }
});

// GET /api/v1/magic-numbers/:league - 특정 리그 매직넘버
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

        const cacheKey = `magic-numbers:current:${league}`;
        
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
        const today = new Date().toISOString().split('T')[0];

        const magicNumbersQuery = `
            SELECT 
                mn.*,
                s.rank as current_rank,
                s.wins,
                s.losses,
                s.draws,
                s.games_played,
                s.win_percentage,
                s.games_behind,
                t.team_name,
                t.team_name_en,
                t.team_name_jp,
                t.team_abbreviation,
                t.team_color,
                t.logo_url
            FROM magic_numbers mn
            JOIN standings s ON mn.team_id = s.team_id AND mn.season = s.season
            JOIN teams t ON mn.team_id = t.team_id
            WHERE mn.season = $1 
                AND mn.league = $2
                AND mn.calculation_date = (
                    SELECT MAX(calculation_date) 
                    FROM magic_numbers 
                    WHERE season = $1 AND league = $2 AND calculation_date <= $3
                )
                AND t.is_active = true
            ORDER BY s.rank ASC
        `;

        const result = await query(magicNumbersQuery, [currentYear, league, today]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No magic numbers data found for ${league} league`,
                code: 'NO_DATA_FOUND'
            });
        }

        const magicNumbers = {
            league: league,
            teams: result.rows.map(calculateAdditionalMetrics),
            season: currentYear,
            calculationDate: result.rows[0]?.calculation_date || null,
            lastUpdated: result.rows[0]?.created_at || null
        };

        // Cache for 10 minutes
        await cache.set(cacheKey, magicNumbers, 600);

        res.json({
            success: true,
            data: magicNumbers,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('League magic numbers API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch league magic numbers data',
            code: 'LEAGUE_MAGIC_NUMBERS_FETCH_ERROR'
        });
    }
});

// GET /api/v1/magic-numbers/team/:teamId - 특정 팀 매직넘버
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

        const cacheKey = `magic-numbers:team:${teamId}`;
        
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
        const today = new Date().toISOString().split('T')[0];

        const teamMagicQuery = `
            SELECT 
                mn.*,
                s.rank as current_rank,
                s.wins,
                s.losses,
                s.draws,
                s.games_played,
                s.win_percentage,
                s.games_behind,
                t.team_name,
                t.team_name_en,
                t.team_name_jp,
                t.team_abbreviation,
                t.team_color,
                t.logo_url,
                t.city,
                t.stadium
            FROM magic_numbers mn
            JOIN standings s ON mn.team_id = s.team_id AND mn.season = s.season
            JOIN teams t ON mn.team_id = t.team_id
            WHERE mn.season = $1 
                AND mn.team_id = $2
                AND mn.calculation_date = (
                    SELECT MAX(calculation_date) 
                    FROM magic_numbers 
                    WHERE season = $1 AND team_id = $2 AND calculation_date <= $3
                )
                AND t.is_active = true
        `;

        const result = await query(teamMagicQuery, [currentYear, teamId, today]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found or no magic numbers data available',
                code: 'TEAM_NOT_FOUND'
            });
        }

        const teamMagic = calculateAdditionalMetrics(result.rows[0]);

        // Get historical trend (last 7 calculations)
        const trendQuery = `
            SELECT 
                calculation_date,
                magic_number_championship,
                magic_number_playoff,
                championship_probability,
                playoff_probability
            FROM magic_numbers
            WHERE season = $1 AND team_id = $2
            ORDER BY calculation_date DESC
            LIMIT 7
        `;

        const trendResult = await query(trendQuery, [currentYear, teamId]);
        
        const responseData = {
            team: teamMagic,
            trend: trendResult.rows.reverse(), // Show oldest to newest
            season: currentYear
        };

        // Cache for 10 minutes
        await cache.set(cacheKey, responseData, 600);

        res.json({
            success: true,
            data: responseData,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Team magic numbers API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team magic numbers data',
            code: 'TEAM_MAGIC_NUMBERS_FETCH_ERROR'
        });
    }
});

// Helper function to calculate additional metrics
function calculateAdditionalMetrics(row) {
    const totalGames = 144; // NPB regular season games
    const gamesRemaining = Math.max(0, totalGames - row.games_played);
    
    return {
        ...row,
        games_remaining: gamesRemaining,
        pace: gamesRemaining > 0 ? Math.round((row.wins / row.games_played) * totalGames) : row.wins,
        elimination_status: {
            championship: row.is_eliminated_championship,
            playoff: row.is_eliminated_playoff
        },
        clinched_status: {
            championship: row.is_clinched_championship,
            playoff: row.is_clinched_playoff
        },
        probability_tier: {
            championship: getProbabilityTier(row.championship_probability),
            playoff: getProbabilityTier(row.playoff_probability)
        }
    };
}

// Helper function to categorize probability
function getProbabilityTier(probability) {
    if (probability >= 95) return 'virtually_certain';
    if (probability >= 75) return 'very_likely';
    if (probability >= 50) return 'likely';
    if (probability >= 25) return 'possible';
    if (probability >= 5) return 'unlikely';
    return 'very_unlikely';
}

module.exports = router;