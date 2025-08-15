const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class KBODatabase {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, '../data/kbo-2025.db');
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ SQLite 데이터베이스 연결 성공:', this.dbPath);
                    resolve();
                }
            });
        });
    }

    async createTables() {
        const queries = [
            // 경기 테이블
            `CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                home_team TEXT NOT NULL,
                away_team TEXT NOT NULL,
                home_score INTEGER NOT NULL,
                away_score INTEGER NOT NULL,
                winner TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // 팀 통계 테이블
            `CREATE TABLE IF NOT EXISTS team_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_name TEXT UNIQUE NOT NULL,
                games_played INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                win_rate REAL DEFAULT 0,
                runs_scored INTEGER DEFAULT 0,
                runs_allowed INTEGER DEFAULT 0,
                run_differential INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // 상대 전적 테이블
            `CREATE TABLE IF NOT EXISTS head_to_head (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team1 TEXT NOT NULL,
                team2 TEXT NOT NULL,
                team1_wins INTEGER DEFAULT 0,
                team2_wins INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                total_games INTEGER DEFAULT 0,
                UNIQUE(team1, team2)
            )`,
            
            // 인덱스 생성
            `CREATE INDEX IF NOT EXISTS idx_games_date ON games(date)`,
            `CREATE INDEX IF NOT EXISTS idx_games_teams ON games(home_team, away_team)`,
            `CREATE INDEX IF NOT EXISTS idx_team_stats_name ON team_stats(team_name)`
        ];

        for (const query of queries) {
            await this.run(query);
        }
        console.log('✅ 테이블 생성 완료');
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async importGamesFromJSON() {
        // JSON 파일 읽기
        const jsonPath = path.join(__dirname, '../data/2025-season-games.json');
        
        if (!fs.existsSync(jsonPath)) {
            // JSON 파일이 없으면 먼저 파싱 실행
            const { parseSeasonData } = require('./parse-season-data');
            parseSeasonData();
        }
        
        const games = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        
        // 기존 데이터 삭제
        await this.run('DELETE FROM games');
        
        // 경기 데이터 삽입
        const insertGame = `INSERT INTO games 
            (date, home_team, away_team, home_score, away_score, winner) 
            VALUES (?, ?, ?, ?, ?, ?)`;
        
        for (const game of games) {
            await this.run(insertGame, [
                game.date,
                game.home_team,
                game.away_team,
                game.home_score,
                game.away_score,
                game.winner
            ]);
        }
        
        console.log(`✅ ${games.length}개의 경기 데이터 임포트 완료`);
        
        // 팀 통계 업데이트
        await this.updateTeamStats();
        
        // 상대 전적 업데이트
        await this.updateHeadToHead();
    }

    async updateTeamStats() {
        const teams = ['KIA', 'LG', '삼성', '두산', 'KT', 'SSG', '롯데', '한화', 'NC', '키움'];
        
        // 기존 통계 초기화
        await this.run('DELETE FROM team_stats');
        
        for (const team of teams) {
            // 홈 경기 통계
            const homeStats = await this.get(`
                SELECT 
                    COUNT(*) as games,
                    SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN winner != ? AND winner != 'draw' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN winner = 'draw' THEN 1 ELSE 0 END) as draws,
                    SUM(home_score) as runs_scored,
                    SUM(away_score) as runs_allowed
                FROM games WHERE home_team = ?
            `, [team, team, team]);
            
            // 원정 경기 통계
            const awayStats = await this.get(`
                SELECT 
                    COUNT(*) as games,
                    SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN winner != ? AND winner != 'draw' THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN winner = 'draw' THEN 1 ELSE 0 END) as draws,
                    SUM(away_score) as runs_scored,
                    SUM(home_score) as runs_allowed
                FROM games WHERE away_team = ?
            `, [team, team, team]);
            
            // 전체 통계 계산
            const totalGames = (homeStats.games || 0) + (awayStats.games || 0);
            const totalWins = (homeStats.wins || 0) + (awayStats.wins || 0);
            const totalLosses = (homeStats.losses || 0) + (awayStats.losses || 0);
            const totalDraws = (homeStats.draws || 0) + (awayStats.draws || 0);
            const totalRunsScored = (homeStats.runs_scored || 0) + (awayStats.runs_scored || 0);
            const totalRunsAllowed = (homeStats.runs_allowed || 0) + (awayStats.runs_allowed || 0);
            const winRate = totalWins + totalLosses > 0 ? 
                totalWins / (totalWins + totalLosses) : 0;
            
            // 팀 통계 삽입
            await this.run(`
                INSERT INTO team_stats 
                (team_name, games_played, wins, losses, draws, win_rate, 
                 runs_scored, runs_allowed, run_differential)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                team,
                totalGames,
                totalWins,
                totalLosses,
                totalDraws,
                winRate,
                totalRunsScored,
                totalRunsAllowed,
                totalRunsScored - totalRunsAllowed
            ]);
        }
        
        console.log('✅ 팀 통계 업데이트 완료');
    }

    async updateHeadToHead() {
        const teams = ['KIA', 'LG', '삼성', '두산', 'KT', 'SSG', '롯데', '한화', 'NC', '키움'];
        
        // 기존 상대 전적 초기화
        await this.run('DELETE FROM head_to_head');
        
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const team1 = teams[i];
                const team2 = teams[j];
                
                // team1 vs team2 경기 결과
                const results = await this.all(`
                    SELECT winner, COUNT(*) as count
                    FROM games 
                    WHERE (home_team = ? AND away_team = ?) 
                       OR (home_team = ? AND away_team = ?)
                    GROUP BY winner
                `, [team1, team2, team2, team1]);
                
                let team1Wins = 0;
                let team2Wins = 0;
                let draws = 0;
                
                results.forEach(result => {
                    if (result.winner === team1) {
                        team1Wins = result.count;
                    } else if (result.winner === team2) {
                        team2Wins = result.count;
                    } else if (result.winner === 'draw') {
                        draws = result.count;
                    }
                });
                
                const totalGames = team1Wins + team2Wins + draws;
                
                if (totalGames > 0) {
                    await this.run(`
                        INSERT INTO head_to_head 
                        (team1, team2, team1_wins, team2_wins, draws, total_games)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [team1, team2, team1Wins, team2Wins, draws, totalGames]);
                }
            }
        }
        
        console.log('✅ 상대 전적 업데이트 완료');
    }

    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ 데이터베이스 연결 종료');
                    resolve();
                }
            });
        });
    }
}

// 메인 실행 함수
async function main() {
    const db = new KBODatabase();
    
    try {
        await db.connect();
        await db.createTables();
        await db.importGamesFromJSON();
        
        // 샘플 쿼리 실행
        console.log('\n📊 현재 순위표:');
        const standings = await db.all(`
            SELECT team_name, games_played, wins, losses, draws, 
                   printf('%.3f', win_rate) as win_rate,
                   runs_scored, runs_allowed, run_differential
            FROM team_stats
            ORDER BY win_rate DESC, wins DESC
        `);
        
        console.table(standings);
        
        await db.close();
    } catch (error) {
        console.error('❌ 오류 발생:', error);
        await db.close();
    }
}

// 실행
if (require.main === module) {
    main();
}

module.exports = { KBODatabase };