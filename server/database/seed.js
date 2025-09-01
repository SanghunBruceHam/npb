#!/usr/bin/env node

// NPB Dashboard Database Seed Script
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseSeeder {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'npb_dashboard_dev',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async seed() {
        const client = await this.pool.connect();
        
        try {
            console.log('🌱 Starting NPB Dashboard database seeding...');
            
            // Clear existing data in correct order (respecting foreign keys)
            await this.clearData(client);
            
            // Insert seed data in correct order
            await this.seedTeams(client);
            await this.seedSampleGames(client);
            await this.seedSampleStandings(client);
            
            console.log('✅ Database seeding completed successfully!');
            
        } catch (error) {
            console.error('❌ Seeding failed:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    async clearData(client) {
        console.log('🧹 Clearing existing data...');
        
        const tables = [
            'magic_numbers',
            'head_to_head', 
            'standings',
            'games',
            'teams'
        ];

        for (const table of tables) {
            try {
                await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
                console.log(`  ✅ Cleared ${table}`);
            } catch (error) {
                if (error.code !== '42P01') { // Table doesn't exist
                    console.warn(`  ⚠️  Could not clear ${table}: ${error.message}`);
                }
            }
        }
    }

    async seedTeams(client) {
        console.log('⚾ Seeding NPB teams data...');
        
        const teams = [
            // Central League
            {
                name: '요미우리 자이언츠',
                name_en: 'Yomiuri Giants',
                name_jp: '読売ジャイアンツ',
                abbreviation: 'YOG',
                league: 'central',
                city: '도쿄',
                stadium: '도쿄돔',
                established: 1934,
                color: '#FF6600'
            },
            {
                name: '한신 타이거스',
                name_en: 'Hanshin Tigers', 
                name_jp: '阪神タイガース',
                abbreviation: 'HAN',
                league: 'central',
                city: '오사카',
                stadium: '한신 고시엔구장',
                established: 1935,
                color: '#FFE500'
            },
            {
                name: '요코하마 DeNA 베이스타즈',
                name_en: 'Yokohama DeNA BayStars',
                name_jp: '横浜DeNAベイスターズ',
                abbreviation: 'YDB',
                league: 'central',
                city: '요코하마',
                stadium: '요코하마 스타디움',
                established: 1950,
                color: '#0066CC'
            },
            {
                name: '히로시마 도요 카프',
                name_en: 'Hiroshima Toyo Carp',
                name_jp: '広島東洋カープ',
                abbreviation: 'HIR',
                league: 'central',
                city: '히로시마',
                stadium: '마쓰다 Zoom-Zoom 스타디움',
                established: 1950,
                color: '#FF0000'
            },
            {
                name: '주니치 드래곤스',
                name_en: 'Chunichi Dragons',
                name_jp: '中日ドラゴンズ',
                abbreviation: 'CHU',
                league: 'central',
                city: '나고야',
                stadium: '반테린 돔 나고야',
                established: 1936,
                color: '#0066FF'
            },
            {
                name: '도쿄 야쿠르트 스왈로우즈',
                name_en: 'Tokyo Yakult Swallows',
                name_jp: '東京ヤクルトスワローズ',
                abbreviation: 'YAK',
                league: 'central',
                city: '도쿄',
                stadium: '메이지진구 야구장',
                established: 1950,
                color: '#00AA00'
            },
            
            // Pacific League
            {
                name: '후쿠오카 소프트뱅크 호크스',
                name_en: 'Fukuoka SoftBank Hawks',
                name_jp: '福岡ソフトバンクホークス',
                abbreviation: 'SOF',
                league: 'pacific',
                city: '후쿠오카',
                stadium: '미즈호 페이페이 돔',
                established: 1938,
                color: '#FFFF00'
            },
            {
                name: '지바 롯데 마린즈',
                name_en: 'Chiba Lotte Marines',
                name_jp: '千葉ロッテマリーンズ',
                abbreviation: 'LOT',
                league: 'pacific',
                city: '지바',
                stadium: 'ZOZO 마린 스타디움',
                established: 1950,
                color: '#000080'
            },
            {
                name: '도호쿠 라쿠텐 골든이글스',
                name_en: 'Tohoku Rakuten Golden Eagles',
                name_jp: '東北楽天ゴールデンイーグルス',
                abbreviation: 'RAK',
                league: 'pacific',
                city: '센다이',
                stadium: '라쿠텐 생명 파크',
                established: 2005,
                color: '#990000'
            },
            {
                name: '오릭스 버팔로즈',
                name_en: 'Orix Buffaloes',
                name_jp: 'オリックス・バファローズ',
                abbreviation: 'ORI',
                league: 'pacific',
                city: '오사카',
                stadium: '교세라 돔 오사카',
                established: 1936,
                color: '#000000'
            },
            {
                name: '사이타마 세이부 라이온즈',
                name_en: 'Saitama Seibu Lions',
                name_jp: '埼玉西武ライオンズ',
                abbreviation: 'SEI',
                league: 'pacific',
                city: '사이타마',
                stadium: '베르나 돔',
                established: 1950,
                color: '#0066CC'
            },
            {
                name: '홋카이도 니혼햄 파이터즈',
                name_en: 'Hokkaido Nippon-Ham Fighters',
                name_jp: '北海道日本ハムファイターズ',
                abbreviation: 'NIP',
                league: 'pacific',
                city: '삿포로',
                stadium: 'ES CON 필드',
                established: 1946,
                color: '#0099CC'
            }
        ];

        for (const team of teams) {
            await client.query(`
                INSERT INTO teams (
                    team_name, team_name_en, team_name_jp, team_abbreviation, 
                    league, city, stadium, established_year, team_color
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                team.name, team.name_en, team.name_jp, team.abbreviation,
                team.league, team.city, team.stadium, team.established, team.color
            ]);
        }

        console.log(`  ✅ Inserted ${teams.length} teams`);
    }


    async seedSampleGames(client) {
        console.log('🎮 Seeding sample games data...');
        
        // Get team IDs for sample games
        const teamsResult = await client.query('SELECT team_id, team_abbreviation FROM teams ORDER BY team_id');
        const teams = teamsResult.rows;
        const currentYear = new Date().getFullYear();

        // Create some sample games
        const sampleGames = [
            {
                home_team_id: teams.find(t => t.team_abbreviation === 'YOG').team_id,
                away_team_id: teams.find(t => t.team_abbreviation === 'HAN').team_id,
                game_date: `${currentYear}-04-01`,
                home_score: 5,
                away_score: 3,
                game_status: 'completed'
            },
            {
                home_team_id: teams.find(t => t.team_abbreviation === 'YDB').team_id,
                away_team_id: teams.find(t => t.team_abbreviation === 'HIR').team_id,
                game_date: `${currentYear}-04-01`,
                home_score: 2,
                away_score: 7,
                game_status: 'completed'
            },
            {
                home_team_id: teams.find(t => t.team_abbreviation === 'SOF').team_id,
                away_team_id: teams.find(t => t.team_abbreviation === 'LOT').team_id,
                game_date: `${currentYear}-04-01`,
                home_score: 6,
                away_score: 4,
                game_status: 'completed'
            }
        ];

        for (const game of sampleGames) {
            await client.query(`
                INSERT INTO games (
                    home_team_id, away_team_id, game_date,
                    home_score, away_score, game_status
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                game.home_team_id, game.away_team_id, game.game_date,
                game.home_score, game.away_score, game.game_status
            ]);
        }

        console.log(`  ✅ Inserted ${sampleGames.length} sample games`);
    }

    async seedSampleStandings(client) {
        console.log('🏆 Seeding sample standings data...');
        
        const teamsResult = await client.query('SELECT team_id, team_abbreviation, league FROM teams ORDER BY league, team_abbreviation');
        const teams = teamsResult.rows;
        const currentYear = new Date().getFullYear();

        // Sample standings data
        const centralStandings = [
            { abbr: 'YOG', wins: 45, losses: 35, draws: 2, rank: 1 },
            { abbr: 'HAN', wins: 42, losses: 38, draws: 2, rank: 2 },
            { abbr: 'YDB', wins: 40, losses: 40, draws: 2, rank: 3 },
            { abbr: 'HIR', wins: 38, losses: 42, draws: 2, rank: 4 },
            { abbr: 'CHU', wins: 36, losses: 44, draws: 2, rank: 5 },
            { abbr: 'YAK', wins: 34, losses: 46, draws: 2, rank: 6 }
        ];

        const pacificStandings = [
            { abbr: 'SOF', wins: 48, losses: 32, draws: 2, rank: 1 },
            { abbr: 'LOT', wins: 44, losses: 36, draws: 2, rank: 2 },
            { abbr: 'RAK', wins: 41, losses: 39, draws: 2, rank: 3 },
            { abbr: 'ORI', wins: 39, losses: 41, draws: 2, rank: 4 },
            { abbr: 'SEI', wins: 37, losses: 43, draws: 2, rank: 5 },
            { abbr: 'NIP', wins: 35, losses: 45, draws: 2, rank: 6 }
        ];

        const allStandings = [...centralStandings, ...pacificStandings];

        for (const standing of allStandings) {
            const team = teams.find(t => t.team_abbreviation === standing.abbr);
            const winPct = standing.wins / (standing.wins + standing.losses);
            const gamesPlayed = standing.wins + standing.losses + standing.draws;

            await client.query(`
                INSERT INTO standings (
                    team_id, season, league, rank, games_played,
                    wins, losses, draws, win_percentage, games_behind,
                    runs_scored, runs_allowed, last_updated
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
            `, [
                team.team_id, currentYear, team.league, standing.rank, gamesPlayed,
                standing.wins, standing.losses, standing.draws, winPct.toFixed(3),
                standing.rank === 1 ? 0 : (standing.rank - 1) * 2.5, // Approximate games behind
                Math.round(standing.wins * 4.5), Math.round(standing.losses * 4.2) // Sample runs
            ]);
        }

        console.log(`  ✅ Inserted ${allStandings.length} standings records`);
    }

    async close() {
        await this.pool.end();
    }
}

// CLI execution
async function main() {
    const seeder = new DatabaseSeeder();
    
    try {
        await seeder.seed();
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('💡 You can now start the server: npm start');
        
    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure PostgreSQL is running');
        } else if (error.code === '3D000') {
            console.error('💡 Database does not exist. Run: npm run db:migrate');
        } else if (error.code === '42P01') {
            console.error('💡 Tables do not exist. Run: npm run db:migrate');
        }
        
        process.exit(1);
    } finally {
        await seeder.close();
    }
}

// Export for testing
module.exports = { DatabaseSeeder };

// Run if called directly
if (require.main === module) {
    main();
}