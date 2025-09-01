const express = require('express');
const router = express.Router();
const { query, cache } = require('../database/connection');

// GET /api/v1/head-to-head - 전체 상대전적 매트릭스
router.get('/', async (req, res) => {
    try {
        const cacheKey = 'head-to-head:current:matrix';
        
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

        // Get all teams
        const teamsQuery = `
            SELECT team_id, team_name, team_name_en, team_abbreviation, league, team_color, logo_url
            FROM teams 
            WHERE is_active = true 
            ORDER BY league, team_name
        `;
        const teamsResult = await query(teamsQuery);
        const teams = teamsResult.rows;

        // Get head-to-head records
        const h2hQuery = `
            SELECT 
                h.*,
                ta.team_name as team_a_name,
                ta.team_abbreviation as team_a_abbr,
                ta.league as team_a_league,
                tb.team_name as team_b_name,
                tb.team_abbreviation as team_b_abbr,
                tb.league as team_b_league
            FROM head_to_head h
            JOIN teams ta ON h.team_a_id = ta.team_id
            JOIN teams tb ON h.team_b_id = tb.team_id
            WHERE h.season = $1
        `;
        const h2hResult = await query(h2hQuery, [currentYear]);

        // Build matrix
        const matrix = buildHeadToHeadMatrix(teams, h2hResult.rows);

        const responseData = {
            matrix: matrix,
            teams: teams,
            season: currentYear,
            lastUpdated: h2hResult.rows[0]?.last_updated || null,
            summary: calculateLeagueSummary(h2hResult.rows)
        };

        // Cache for 15 minutes
        await cache.set(cacheKey, responseData, 900);

        res.json({
            success: true,
            data: responseData,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Head-to-head API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch head-to-head data',
            code: 'HEAD_TO_HEAD_FETCH_ERROR'
        });
    }
});

// GET /api/v1/head-to-head/:teamId - 특정 팀 상대전적
router.get('/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        
        if (!teamId || isNaN(teamId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid team ID',
                code: 'INVALID_TEAM_ID'
            });
        }

        const cacheKey = `head-to-head:team:${teamId}`;
        
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

        // Get team info
        const teamQuery = `
            SELECT team_id, team_name, team_name_en, team_abbreviation, league, team_color, logo_url
            FROM teams 
            WHERE team_id = $1 AND is_active = true
        `;
        const teamResult = await query(teamQuery, [teamId]);

        if (teamResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Team not found',
                code: 'TEAM_NOT_FOUND'
            });
        }

        const team = teamResult.rows[0];

        // Get head-to-head records for this team
        const h2hQuery = `
            (SELECT 
                h.team_b_id as opponent_id,
                h.team_a_wins as wins,
                h.team_a_losses as losses,
                h.draws,
                h.games_played,
                h.team_a_home_wins as home_wins,
                h.team_a_home_losses as home_losses,
                h.team_a_home_draws as home_draws,
                h.team_a_away_wins as away_wins,
                h.team_a_away_losses as away_losses,
                h.team_a_away_draws as away_draws,
                h.last_game_date,
                t.team_name as opponent_name,
                t.team_abbreviation as opponent_abbr,
                t.league as opponent_league,
                t.team_color as opponent_color
            FROM head_to_head h
            JOIN teams t ON h.team_b_id = t.team_id
            WHERE h.season = $1 AND h.team_a_id = $2)
            UNION ALL
            (SELECT 
                h.team_a_id as opponent_id,
                h.team_a_losses as wins,
                h.team_a_wins as losses,
                h.draws,
                h.games_played,
                h.team_a_away_losses as home_wins,
                h.team_a_away_wins as home_losses,
                h.team_a_away_draws as home_draws,
                h.team_a_home_losses as away_wins,
                h.team_a_home_wins as away_losses,
                h.team_a_home_draws as away_draws,
                h.last_game_date,
                t.team_name as opponent_name,
                t.team_abbreviation as opponent_abbr,
                t.league as opponent_league,
                t.team_color as opponent_color
            FROM head_to_head h
            JOIN teams t ON h.team_a_id = t.team_id
            WHERE h.season = $1 AND h.team_b_id = $2)
            ORDER BY opponent_league, opponent_name
        `;

        const h2hResult = await query(h2hQuery, [currentYear, teamId]);

        // Calculate summary statistics
        const summary = calculateTeamSummary(h2hResult.rows, team.league);

        const responseData = {
            team: team,
            opponents: h2hResult.rows.map(row => ({
                ...row,
                win_percentage: row.wins + row.losses > 0 ? 
                    Math.round((row.wins / (row.wins + row.losses)) * 1000) / 1000 : 0,
                home_win_percentage: row.home_wins + row.home_losses > 0 ? 
                    Math.round((row.home_wins / (row.home_wins + row.home_losses)) * 1000) / 1000 : 0,
                away_win_percentage: row.away_wins + row.away_losses > 0 ? 
                    Math.round((row.away_wins / (row.away_wins + row.away_losses)) * 1000) / 1000 : 0
            })),
            summary: summary,
            season: currentYear
        };

        // Cache for 15 minutes
        await cache.set(cacheKey, responseData, 900);

        res.json({
            success: true,
            data: responseData,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Team head-to-head API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch team head-to-head data',
            code: 'TEAM_HEAD_TO_HEAD_FETCH_ERROR'
        });
    }
});

// GET /api/v1/head-to-head/:teamAId/:teamBId - 두 팀간 직접 대결
router.get('/:teamAId/:teamBId', async (req, res) => {
    try {
        const { teamAId, teamBId } = req.params;
        
        if (!teamAId || isNaN(teamAId) || !teamBId || isNaN(teamBId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid team IDs',
                code: 'INVALID_TEAM_IDS'
            });
        }

        if (teamAId === teamBId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot compare team with itself',
                code: 'SAME_TEAM_COMPARISON'
            });
        }

        const cacheKey = `head-to-head:direct:${teamAId}:${teamBId}`;
        
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

        // Get direct matchup
        const directQuery = `
            SELECT 
                h.*,
                ta.team_name as team_a_name,
                ta.team_abbreviation as team_a_abbr,
                ta.league as team_a_league,
                ta.team_color as team_a_color,
                tb.team_name as team_b_name,
                tb.team_abbreviation as team_b_abbr,
                tb.league as team_b_league,
                tb.team_color as team_b_color
            FROM head_to_head h
            JOIN teams ta ON h.team_a_id = ta.team_id
            JOIN teams tb ON h.team_b_id = tb.team_id
            WHERE h.season = $1 
                AND ((h.team_a_id = $2 AND h.team_b_id = $3) OR (h.team_a_id = $3 AND h.team_b_id = $2))
        `;

        const result = await query(directQuery, [currentYear, teamAId, teamBId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No head-to-head data found for these teams',
                code: 'NO_MATCHUP_DATA'
            });
        }

        const matchup = result.rows[0];
        
        // Normalize data so teamAId is always team_a in response
        let normalizedMatchup = matchup;
        if (matchup.team_a_id != teamAId) {
            normalizedMatchup = {
                ...matchup,
                team_a_id: matchup.team_b_id,
                team_b_id: matchup.team_a_id,
                team_a_wins: matchup.team_a_losses,
                team_a_losses: matchup.team_a_wins,
                team_a_home_wins: matchup.team_a_away_losses,
                team_a_home_losses: matchup.team_a_away_wins,
                team_a_home_draws: matchup.team_a_away_draws,
                team_a_away_wins: matchup.team_a_home_losses,
                team_a_away_losses: matchup.team_a_home_wins,
                team_a_away_draws: matchup.team_a_home_draws,
                team_a_name: matchup.team_b_name,
                team_a_abbr: matchup.team_b_abbr,
                team_a_league: matchup.team_b_league,
                team_a_color: matchup.team_b_color,
                team_b_name: matchup.team_a_name,
                team_b_abbr: matchup.team_a_abbr,
                team_b_league: matchup.team_a_league,
                team_b_color: matchup.team_a_color
            };
        }

        // Add calculated metrics
        const responseData = {
            ...normalizedMatchup,
            team_a_win_percentage: normalizedMatchup.team_a_wins + normalizedMatchup.team_a_losses > 0 ? 
                Math.round((normalizedMatchup.team_a_wins / (normalizedMatchup.team_a_wins + normalizedMatchup.team_a_losses)) * 1000) / 1000 : 0,
            is_interleague: normalizedMatchup.team_a_league !== normalizedMatchup.team_b_league,
            series_leader: normalizedMatchup.team_a_wins > normalizedMatchup.team_a_losses ? 'team_a' :
                          normalizedMatchup.team_a_wins < normalizedMatchup.team_a_losses ? 'team_b' : 'tied',
            season: currentYear
        };

        // Cache for 15 minutes
        await cache.set(cacheKey, responseData, 900);

        res.json({
            success: true,
            data: responseData,
            source: 'database',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Direct head-to-head API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch direct head-to-head data',
            code: 'DIRECT_HEAD_TO_HEAD_FETCH_ERROR'
        });
    }
});

// Helper function to build head-to-head matrix
function buildHeadToHeadMatrix(teams, h2hRecords) {
    const matrix = {};
    
    teams.forEach(team => {
        matrix[team.team_id] = {};
        teams.forEach(opponent => {
            if (team.team_id === opponent.team_id) {
                matrix[team.team_id][opponent.team_id] = null; // Same team
            } else {
                matrix[team.team_id][opponent.team_id] = {
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    games_played: 0,
                    win_percentage: 0
                };
            }
        });
    });

    h2hRecords.forEach(record => {
        // Team A vs Team B
        matrix[record.team_a_id][record.team_b_id] = {
            wins: record.team_a_wins,
            losses: record.team_a_losses,
            draws: record.draws,
            games_played: record.games_played,
            win_percentage: record.team_a_wins + record.team_a_losses > 0 ? 
                Math.round((record.team_a_wins / (record.team_a_wins + record.team_a_losses)) * 1000) / 1000 : 0
        };

        // Team B vs Team A (reverse)
        matrix[record.team_b_id][record.team_a_id] = {
            wins: record.team_a_losses,
            losses: record.team_a_wins,
            draws: record.draws,
            games_played: record.games_played,
            win_percentage: record.team_a_wins + record.team_a_losses > 0 ? 
                Math.round((record.team_a_losses / (record.team_a_wins + record.team_a_losses)) * 1000) / 1000 : 0
        };
    });

    return matrix;
}

// Helper function to calculate league summary
function calculateLeagueSummary(h2hRecords) {
    const summary = {
        interleague: { games: 0, central_wins: 0, pacific_wins: 0, draws: 0 },
        central_internal: { games: 0, total_wins: 0, total_draws: 0 },
        pacific_internal: { games: 0, total_wins: 0, total_draws: 0 }
    };

    h2hRecords.forEach(record => {
        if (record.team_a_league !== record.team_b_league) {
            // Interleague game
            summary.interleague.games += record.games_played;
            summary.interleague.draws += record.draws;
            
            if (record.team_a_league === 'central') {
                summary.interleague.central_wins += record.team_a_wins;
                summary.interleague.pacific_wins += record.team_a_losses;
            } else {
                summary.interleague.pacific_wins += record.team_a_wins;
                summary.interleague.central_wins += record.team_a_losses;
            }
        } else {
            // Internal league game
            const leagueKey = record.team_a_league === 'central' ? 'central_internal' : 'pacific_internal';
            summary[leagueKey].games += record.games_played;
            summary[leagueKey].total_wins += record.team_a_wins;
            summary[leagueKey].total_draws += record.draws;
        }
    });

    return summary;
}

// Helper function to calculate team summary
function calculateTeamSummary(opponents, teamLeague) {
    const summary = {
        overall: { wins: 0, losses: 0, draws: 0, games: 0 },
        vs_central: { wins: 0, losses: 0, draws: 0, games: 0 },
        vs_pacific: { wins: 0, losses: 0, draws: 0, games: 0 },
        home: { wins: 0, losses: 0, draws: 0, games: 0 },
        away: { wins: 0, losses: 0, draws: 0, games: 0 }
    };

    opponents.forEach(opp => {
        summary.overall.wins += opp.wins;
        summary.overall.losses += opp.losses;
        summary.overall.draws += opp.draws;
        summary.overall.games += opp.games_played;

        summary.home.wins += opp.home_wins;
        summary.home.losses += opp.home_losses;
        summary.home.draws += opp.home_draws;
        summary.home.games += opp.home_wins + opp.home_losses + opp.home_draws;

        summary.away.wins += opp.away_wins;
        summary.away.losses += opp.away_losses;
        summary.away.draws += opp.away_draws;
        summary.away.games += opp.away_wins + opp.away_losses + opp.away_draws;

        const vsLeagueKey = opp.opponent_league === 'central' ? 'vs_central' : 'vs_pacific';
        summary[vsLeagueKey].wins += opp.wins;
        summary[vsLeagueKey].losses += opp.losses;
        summary[vsLeagueKey].draws += opp.draws;
        summary[vsLeagueKey].games += opp.games_played;
    });

    // Calculate win percentages
    Object.keys(summary).forEach(key => {
        const category = summary[key];
        category.win_percentage = category.wins + category.losses > 0 ? 
            Math.round((category.wins / (category.wins + category.losses)) * 1000) / 1000 : 0;
    });

    return summary;
}

module.exports = router;