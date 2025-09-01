const express = require('express');
const router = express.Router();
const { query, cache } = require('../database/connection');

// GET /api/v1/games - 경기 목록 (쿼리 파라미터로 필터링)
router.get('/', async (req, res) => {
    try {
        const {
            date,
            team_id,
            league,
            status = 'all',
            limit = 50,
            offset = 0
        } = req.query;

        // Build cache key based on parameters
        const cacheKey = `games:list:${date || 'all'}:${team_id || 'all'}:${league || 'all'}:${status}:${limit}:${offset}`;
        
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

        // Build query
        let whereClause = '1 = 1';
        let params = [];
        let paramCount = 0;

        if (date) {
            paramCount++;
            whereClause += ` AND g.game_date = $${paramCount}`;
            params.push(date);
        }

        if (team_id) {
            paramCount++;
            whereClause += ` AND (g.home_team_id = $${paramCount} OR g.away_team_id = $${paramCount})`;
            params.push(team_id);
        }

        if (league && ['central', 'pacific'].includes(league)) {
            paramCount++;
            whereClause += ` AND (ht.league = $${paramCount} OR at.league = $${paramCount})`;
            params.push(league);
        }

        if (status && status !== 'all') {
            paramCount++;
            whereClause += ` AND g.game_status = $${paramCount}`;
            params.push(status);
        }

        paramCount++;
        const limitParam = paramCount;
        params.push(parseInt(limit));

        paramCount++;
        const offsetParam = paramCount;
        params.push(parseInt(offset));

        const gamesQuery = `
            SELECT 
                g.*,
                ht.team_name as home_team_name,
                ht.team_name_en as home_team_name_en,
                ht.team_abbreviation as home_team_abbr,
                ht.team_color as home_team_color,
                ht.league as home_team_league,
                at.team_name as away_team_name,
                at.team_name_en as away_team_name_en,
                at.team_abbreviation as away_team_abbr,
                at.team_color as away_team_color,
                at.league as away_team_league,
                CASE 
                    WHEN g.game_status = 'completed' THEN
                        CASE 
                            WHEN g.home_score > g.away_score THEN ht.team_abbreviation
                            WHEN g.away_score > g.home_score THEN at.team_abbreviation
                            ELSE 'TIE'
                        END
                    ELSE null
                END as winner
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE ${whereClause}
            ORDER BY g.game_date DESC, g.game_id DESC
            LIMIT $${limitParam} OFFSET $${offsetParam}
        `;

        const result = await query(gamesQuery, params);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE ${whereClause}
        `;

        const countResult = await query(countQuery, params.slice(0, -2)); // Remove limit and offset params

        const responseData = {
            games: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                has_more: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
            },
            filters: {
                date,
                team_id,
                league,
                status
            }
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
        console.error('Games list API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch games data',
            code: 'GAMES_FETCH_ERROR'
        });
    }
});

// GET /api/v1/games/today - 오늘 경기
router.get('/today', async (req, res) => {
    try {
        const cacheKey = 'games:today';
        
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

        const today = new Date().toISOString().split('T')[0];

        const todayGamesQuery = `
            SELECT 
                g.*,
                ht.team_name as home_team_name,
                ht.team_name_en as home_team_name_en,
                ht.team_abbreviation as home_team_abbr,
                ht.team_color as home_team_color,
                ht.league as home_team_league,
                at.team_name as away_team_name,
                at.team_name_en as away_team_name_en,
                at.team_abbreviation as away_team_abbr,
                at.team_color as away_team_color,
                at.league as away_team_league,
                CASE 
                    WHEN g.game_status = 'completed' THEN
                        CASE 
                            WHEN g.home_score > g.away_score THEN ht.team_abbreviation
                            WHEN g.away_score > g.home_score THEN at.team_abbreviation
                            ELSE 'TIE'
                        END
                    ELSE null
                END as winner,
                CASE 
                    WHEN ht.league != at.league THEN true
                    ELSE false
                END as is_interleague
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date = $1
            ORDER BY 
                g.game_status = 'in_progress' DESC,
                g.game_status = 'scheduled' DESC,
                g.game_time ASC NULLS LAST,
                g.game_id ASC
        `;

        const result = await query(todayGamesQuery, [today]);

        // Group games by status
        const games = {
            date: today,
            games: result.rows,
            summary: {
                total: result.rows.length,
                scheduled: result.rows.filter(g => g.game_status === 'scheduled').length,
                in_progress: result.rows.filter(g => g.game_status === 'in_progress').length,
                completed: result.rows.filter(g => g.game_status === 'completed').length,
                postponed: result.rows.filter(g => g.game_status === 'postponed').length,
                cancelled: result.rows.filter(g => g.game_status === 'cancelled').length,
                interleague: result.rows.filter(g => g.is_interleague).length
            }
        };

        // Cache for 2 minutes (frequently updated)
        await cache.set(cacheKey, games, 120);

        res.json({
            success: true,
            data: games,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Today games API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch today games data',
            code: 'TODAY_GAMES_FETCH_ERROR'
        });
    }
});

// GET /api/v1/games/:gameId - 특정 경기 상세 정보
router.get('/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        
        if (!gameId || isNaN(gameId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid game ID',
                code: 'INVALID_GAME_ID'
            });
        }

        const cacheKey = `games:detail:${gameId}`;
        
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

        const gameDetailQuery = `
            SELECT 
                g.*,
                ht.team_name as home_team_name,
                ht.team_name_en as home_team_name_en,
                ht.team_name_jp as home_team_name_jp,
                ht.team_abbreviation as home_team_abbr,
                ht.team_color as home_team_color,
                ht.league as home_team_league,
                ht.logo_url as home_team_logo,
                ht.city as home_city,
                at.team_name as away_team_name,
                at.team_name_en as away_team_name_en,
                at.team_name_jp as away_team_name_jp,
                at.team_abbreviation as away_team_abbr,
                at.team_color as away_team_color,
                at.league as away_team_league,
                at.logo_url as away_team_logo,
                at.city as away_city,
                CASE 
                    WHEN g.game_status = 'completed' THEN
                        CASE 
                            WHEN g.home_score > g.away_score THEN 'home'
                            WHEN g.away_score > g.home_score THEN 'away'
                            ELSE 'tie'
                        END
                    ELSE null
                END as result,
                CASE 
                    WHEN ht.league != at.league THEN true
                    ELSE false
                END as is_interleague
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_id = $1
        `;

        const result = await query(gameDetailQuery, [gameId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Game not found',
                code: 'GAME_NOT_FOUND'
            });
        }

        const gameDetail = result.rows[0];

        // Add calculated metrics
        const responseData = {
            ...gameDetail,
            calculated_metrics: {
                total_score: gameDetail.home_score + gameDetail.away_score,
                score_difference: Math.abs(gameDetail.home_score - gameDetail.away_score),
                total_home_runs: gameDetail.home_runs_home + gameDetail.home_runs_away,
                total_errors: gameDetail.errors_home + gameDetail.errors_away,
                game_duration_hours: gameDetail.game_duration_minutes ? 
                    Math.round((gameDetail.game_duration_minutes / 60) * 100) / 100 : null,
                is_high_scoring: (gameDetail.home_score + gameDetail.away_score) >= 10,
                is_extra_innings: gameDetail.is_extra_innings,
                is_blowout: gameDetail.game_status === 'completed' && 
                    Math.abs(gameDetail.home_score - gameDetail.away_score) >= 7
            }
        };

        // Cache duration depends on game status
        let cacheDuration = 300; // 5 minutes default
        if (gameDetail.game_status === 'completed') {
            cacheDuration = 3600; // 1 hour for completed games
        } else if (gameDetail.game_status === 'in_progress') {
            cacheDuration = 60; // 1 minute for live games
        }

        await cache.set(cacheKey, responseData, cacheDuration);

        res.json({
            success: true,
            data: responseData,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Game detail API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game detail data',
            code: 'GAME_DETAIL_FETCH_ERROR'
        });
    }
});

// GET /api/v1/games/schedule/:date - 특정 날짜 경기 일정
router.get('/schedule/:date', async (req, res) => {
    try {
        const { date } = req.params;
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD',
                code: 'INVALID_DATE_FORMAT'
            });
        }

        const cacheKey = `games:schedule:${date}`;
        
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

        const scheduleQuery = `
            SELECT 
                g.*,
                ht.team_name as home_team_name,
                ht.team_abbreviation as home_team_abbr,
                ht.team_color as home_team_color,
                ht.league as home_team_league,
                at.team_name as away_team_name,
                at.team_abbreviation as away_team_abbr,
                at.team_color as away_team_color,
                at.league as away_team_league,
                CASE 
                    WHEN ht.league != at.league THEN true
                    ELSE false
                END as is_interleague
            FROM games g
            JOIN teams ht ON g.home_team_id = ht.team_id
            JOIN teams at ON g.away_team_id = at.team_id
            WHERE g.game_date = $1
            ORDER BY g.game_time ASC NULLS LAST, g.game_id ASC
        `;

        const result = await query(scheduleQuery, [date]);

        const schedule = {
            date: date,
            games: result.rows,
            summary: {
                total: result.rows.length,
                central_games: result.rows.filter(g => 
                    g.home_team_league === 'central' && g.away_team_league === 'central'
                ).length,
                pacific_games: result.rows.filter(g => 
                    g.home_team_league === 'pacific' && g.away_team_league === 'pacific'
                ).length,
                interleague_games: result.rows.filter(g => g.is_interleague).length
            }
        };

        // Cache for 10 minutes
        await cache.set(cacheKey, schedule, 600);

        res.json({
            success: true,
            data: schedule,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Schedule API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch schedule data',
            code: 'SCHEDULE_FETCH_ERROR'
        });
    }
});

module.exports = router;