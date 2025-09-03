-- NPB Database Schema
-- Drop existing tables if they exist
DROP TABLE IF EXISTS game_innings CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;

-- Create seasons table
CREATE TABLE seasons (
    season_id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE,
    total_games INTEGER DEFAULT 143,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    team_name_jp VARCHAR(100) NOT NULL,
    team_name_en VARCHAR(100),
    team_abbr VARCHAR(10) NOT NULL UNIQUE,
    league VARCHAR(20) NOT NULL CHECK (league IN ('Central', 'Pacific')),
    city VARCHAR(50),
    founded_year INTEGER,
    stadium VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create games table
CREATE TABLE games (
    game_id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(season_id),
    game_date DATE NOT NULL,
    game_number INTEGER, -- For doubleheaders
    home_team_id INTEGER REFERENCES teams(team_id),
    away_team_id INTEGER REFERENCES teams(team_id),
    home_score INTEGER,
    away_score INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    is_draw BOOLEAN DEFAULT FALSE,
    is_extra_innings BOOLEAN DEFAULT FALSE,
    total_innings INTEGER DEFAULT 9,
    stadium VARCHAR(100),
    attendance INTEGER,
    game_duration_minutes INTEGER,
    weather VARCHAR(50),
    temperature INTEGER,
    start_time TIME,
    end_time TIME,
    winning_pitcher VARCHAR(100),
    losing_pitcher VARCHAR(100),
    save_pitcher VARCHAR(100),
    home_hits INTEGER,
    away_hits INTEGER,
    home_errors INTEGER,
    away_errors INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_date, home_team_id, away_team_id, game_number)
);

-- Create game_innings table for inning-by-inning scores
CREATE TABLE game_innings (
    inning_id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(game_id) ON DELETE CASCADE,
    inning_number INTEGER NOT NULL,
    home_runs INTEGER DEFAULT 0,
    away_runs INTEGER DEFAULT 0,
    home_hits INTEGER DEFAULT 0,
    away_hits INTEGER DEFAULT 0,
    home_errors INTEGER DEFAULT 0,
    away_errors INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_game_innings_game ON game_innings(game_id);

-- Insert 2025 season
INSERT INTO seasons (year, start_date, end_date, total_games)
VALUES (2025, '2025-03-28', '2025-10-31', 143);

-- Insert teams data
INSERT INTO teams (team_name_jp, team_name_en, team_abbr, league, city, founded_year, stadium) VALUES
-- Central League
('読売ジャイアンツ', 'Yomiuri Giants', 'YOG', 'Central', '東京', 1934, '東京ドーム'),
('阪神タイガース', 'Hanshin Tigers', 'HAN', 'Central', '西宮', 1935, '阪神甲子園球場'),
('中日ドラゴンズ', 'Chunichi Dragons', 'CHU', 'Central', '名古屋', 1936, 'バンテリンドーム ナゴヤ'),
('横浜DeNAベイスターズ', 'Yokohama DeNA BayStars', 'YDB', 'Central', '横浜', 1950, '横浜スタジアム'),
('広島東洋カープ', 'Hiroshima Toyo Carp', 'HIR', 'Central', '広島', 1950, 'MAZDA Zoom-Zoom スタジアム広島'),
('東京ヤクルトスワローズ', 'Tokyo Yakult Swallows', 'YAK', 'Central', '東京', 1950, '明治神宮野球場'),
-- Pacific League
('福岡ソフトバンクホークス', 'Fukuoka SoftBank Hawks', 'SOF', 'Pacific', '福岡', 1938, '福岡PayPayドーム'),
('千葉ロッテマリーンズ', 'Chiba Lotte Marines', 'LOT', 'Pacific', '千葉', 1950, 'ZOZOマリンスタジアム'),
('埼玉西武ライオンズ', 'Saitama Seibu Lions', 'SEI', 'Pacific', '所沢', 1950, 'ベルーナドーム'),
('オリックスバファローズ', 'Orix Buffaloes', 'ORI', 'Pacific', '大阪', 1936, '京セラドーム大阪'),
('北海道日本ハムファイターズ', 'Hokkaido Nippon-Ham Fighters', 'NIP', 'Pacific', '札幌', 1946, 'エスコンフィールドHOKKAIDO'),
('東北楽天ゴールデンイーグルス', 'Tohoku Rakuten Golden Eagles', 'RAK', 'Pacific', '仙台', 2005, '楽天モバイルパーク宮城');