-- NPB Dashboard Database Schema
-- PostgreSQL 15+ Required
-- Encoding: UTF-8

-- Create database (run manually as superuser)
-- CREATE DATABASE npb_dashboard_dev ENCODING 'UTF8';
-- CREATE DATABASE npb_dashboard_test ENCODING 'UTF8';

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table (NPB 12 teams)
CREATE TABLE teams (
    team_id SERIAL PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_name_en VARCHAR(100) NOT NULL,
    team_name_jp VARCHAR(100) NOT NULL,
    team_abbreviation CHAR(3) NOT NULL UNIQUE,
    league VARCHAR(20) NOT NULL CHECK (league IN ('central', 'pacific')),
    city VARCHAR(50) NOT NULL,
    stadium VARCHAR(100) NOT NULL,
    established_year INTEGER,
    team_color CHAR(7), -- HEX color code
    logo_url VARCHAR(255),
    website_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
    game_id SERIAL PRIMARY KEY,
    game_date DATE NOT NULL,
    game_time TIME,
    home_team_id INTEGER NOT NULL REFERENCES teams(team_id),
    away_team_id INTEGER NOT NULL REFERENCES teams(team_id),
    stadium VARCHAR(100),
    game_status VARCHAR(20) DEFAULT 'scheduled' CHECK (
        game_status IN ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')
    ),
    home_score INTEGER DEFAULT 0 CHECK (home_score >= 0),
    away_score INTEGER DEFAULT 0 CHECK (away_score >= 0),
    innings INTEGER DEFAULT 9 CHECK (innings >= 9),
    is_extra_innings BOOLEAN DEFAULT FALSE,
    game_type VARCHAR(20) DEFAULT 'regular' CHECK (
        game_type IN ('regular', 'interleague', 'playoff', 'japan_series')
    ),
    weather VARCHAR(50),
    temperature INTEGER,
    attendance INTEGER CHECK (attendance >= 0),
    game_duration_minutes INTEGER,
    winning_pitcher VARCHAR(100),
    losing_pitcher VARCHAR(100),
    save_pitcher VARCHAR(100),
    home_runs_home INTEGER DEFAULT 0,
    home_runs_away INTEGER DEFAULT 0,
    errors_home INTEGER DEFAULT 0,
    errors_away INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT different_teams CHECK (home_team_id != away_team_id),
    CONSTRAINT valid_score_when_completed CHECK (
        game_status != 'completed' OR (home_score != away_score)
    )
);

-- Standings table (current season standings)
CREATE TABLE standings (
    standing_id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(team_id),
    season INTEGER NOT NULL,
    league VARCHAR(20) NOT NULL CHECK (league IN ('central', 'pacific')),
    rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 6),
    games_played INTEGER DEFAULT 0 CHECK (games_played >= 0),
    wins INTEGER DEFAULT 0 CHECK (wins >= 0),
    losses INTEGER DEFAULT 0 CHECK (losses >= 0),
    draws INTEGER DEFAULT 0 CHECK (draws >= 0),
    win_percentage DECIMAL(5,3) DEFAULT 0.000 CHECK (win_percentage BETWEEN 0 AND 1),
    games_behind DECIMAL(4,1) DEFAULT 0.0 CHECK (games_behind >= 0),
    runs_scored INTEGER DEFAULT 0 CHECK (runs_scored >= 0),
    runs_allowed INTEGER DEFAULT 0 CHECK (runs_allowed >= 0),
    run_differential INTEGER DEFAULT 0,
    streak_type VARCHAR(1) CHECK (streak_type IN ('W', 'L', 'T')),
    streak_count INTEGER DEFAULT 0 CHECK (streak_count >= 0),
    home_wins INTEGER DEFAULT 0 CHECK (home_wins >= 0),
    home_losses INTEGER DEFAULT 0 CHECK (home_losses >= 0),
    home_draws INTEGER DEFAULT 0 CHECK (home_draws >= 0),
    away_wins INTEGER DEFAULT 0 CHECK (away_wins >= 0),
    away_losses INTEGER DEFAULT 0 CHECK (away_losses >= 0),
    away_draws INTEGER DEFAULT 0 CHECK (away_draws >= 0),
    last10_wins INTEGER DEFAULT 0 CHECK (last10_wins BETWEEN 0 AND 10),
    last10_losses INTEGER DEFAULT 0 CHECK (last10_losses BETWEEN 0 AND 10),
    last10_draws INTEGER DEFAULT 0 CHECK (last10_draws BETWEEN 0 AND 10),
    magic_number INTEGER CHECK (magic_number > 0),
    elimination_number INTEGER CHECK (elimination_number > 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(team_id, season),
    CONSTRAINT valid_games_calculation CHECK (
        games_played = wins + losses + draws
    ),
    CONSTRAINT valid_home_games CHECK (
        home_wins + home_losses + home_draws <= games_played
    ),
    CONSTRAINT valid_away_games CHECK (
        away_wins + away_losses + away_draws <= games_played
    ),
    CONSTRAINT valid_last10 CHECK (
        last10_wins + last10_losses + last10_draws <= 10
    )
);

-- Magic Numbers table (historical magic number calculations)
CREATE TABLE magic_numbers (
    magic_id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(team_id),
    season INTEGER NOT NULL,
    calculation_date DATE NOT NULL,
    league VARCHAR(20) NOT NULL CHECK (league IN ('central', 'pacific')),
    current_rank INTEGER NOT NULL CHECK (current_rank BETWEEN 1 AND 6),
    magic_number_championship INTEGER CHECK (magic_number_championship > 0),
    magic_number_playoff INTEGER CHECK (magic_number_playoff > 0),
    championship_probability DECIMAL(5,2) DEFAULT 0.00 CHECK (
        championship_probability BETWEEN 0 AND 100
    ),
    playoff_probability DECIMAL(5,2) DEFAULT 0.00 CHECK (
        playoff_probability BETWEEN 0 AND 100
    ),
    scenarios_total INTEGER DEFAULT 0 CHECK (scenarios_total >= 0),
    scenarios_championship INTEGER DEFAULT 0 CHECK (scenarios_championship >= 0),
    scenarios_playoff INTEGER DEFAULT 0 CHECK (scenarios_playoff >= 0),
    is_eliminated_championship BOOLEAN DEFAULT FALSE,
    is_eliminated_playoff BOOLEAN DEFAULT FALSE,
    is_clinched_championship BOOLEAN DEFAULT FALSE,
    is_clinched_playoff BOOLEAN DEFAULT FALSE,
    remaining_games INTEGER DEFAULT 0 CHECK (remaining_games >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(team_id, calculation_date),
    CONSTRAINT valid_scenarios CHECK (
        scenarios_championship <= scenarios_total AND
        scenarios_playoff <= scenarios_total
    )
);

-- Head to Head records
CREATE TABLE head_to_head (
    h2h_id SERIAL PRIMARY KEY,
    team_a_id INTEGER NOT NULL REFERENCES teams(team_id),
    team_b_id INTEGER NOT NULL REFERENCES teams(team_id),
    season INTEGER NOT NULL,
    games_played INTEGER DEFAULT 0 CHECK (games_played >= 0),
    team_a_wins INTEGER DEFAULT 0 CHECK (team_a_wins >= 0),
    team_a_losses INTEGER DEFAULT 0 CHECK (team_a_losses >= 0),
    draws INTEGER DEFAULT 0 CHECK (draws >= 0),
    team_a_home_wins INTEGER DEFAULT 0 CHECK (team_a_home_wins >= 0),
    team_a_home_losses INTEGER DEFAULT 0 CHECK (team_a_home_losses >= 0),
    team_a_home_draws INTEGER DEFAULT 0 CHECK (team_a_home_draws >= 0),
    team_a_away_wins INTEGER DEFAULT 0 CHECK (team_a_away_wins >= 0),
    team_a_away_losses INTEGER DEFAULT 0 CHECK (team_a_away_losses >= 0),
    team_a_away_draws INTEGER DEFAULT 0 CHECK (team_a_away_draws >= 0),
    last_game_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(team_a_id, team_b_id, season),
    CONSTRAINT different_teams_h2h CHECK (team_a_id != team_b_id),
    CONSTRAINT valid_h2h_games CHECK (
        games_played = team_a_wins + team_a_losses + draws
    ),
    CONSTRAINT valid_h2h_home_games CHECK (
        team_a_home_wins + team_a_home_losses + team_a_home_draws <= games_played
    ),
    CONSTRAINT valid_h2h_away_games CHECK (
        team_a_away_wins + team_a_away_losses + team_a_away_draws <= games_played
    )
);

-- Data sources tracking (for crawler management)
CREATE TABLE data_sources (
    source_id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL UNIQUE,
    base_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_crawl_time TIMESTAMP,
    last_success_time TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    rate_limit_per_hour INTEGER DEFAULT 3600,
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crawl logs (for monitoring and debugging)
CREATE TABLE crawl_logs (
    log_id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES data_sources(source_id),
    crawl_type VARCHAR(50) NOT NULL, -- 'standings', 'games', 'schedule' etc.
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout')),
    records_processed INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    error_message TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API usage tracking (for rate limiting and monitoring)
CREATE TABLE api_usage (
    usage_id SERIAL PRIMARY KEY,
    client_ip INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    user_agent TEXT,
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for rate limiting queries
    INDEX idx_api_usage_ip_time (client_ip, request_timestamp),
    INDEX idx_api_usage_endpoint (endpoint)
);

-- Performance metrics
CREATE TABLE performance_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'ms', 'mb', 'count' etc.
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_performance_name_time (metric_name, recorded_at)
);

-- Create indexes for performance
CREATE INDEX idx_games_date ON games (game_date);
CREATE INDEX idx_games_teams ON games (home_team_id, away_team_id);
CREATE INDEX idx_games_status ON games (game_status);
CREATE INDEX idx_games_season ON games (EXTRACT(YEAR FROM game_date));

CREATE INDEX idx_standings_league_season ON standings (league, season);
CREATE INDEX idx_standings_rank ON standings (season, league, rank);
CREATE INDEX idx_standings_win_pct ON standings (season, league, win_percentage DESC);

CREATE INDEX idx_magic_date ON magic_numbers (calculation_date DESC);
CREATE INDEX idx_magic_team_season ON magic_numbers (team_id, season);

CREATE INDEX idx_h2h_teams ON head_to_head (team_a_id, team_b_id);
CREATE INDEX idx_h2h_season ON head_to_head (season);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at 
    BEFORE UPDATE ON data_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial team data
INSERT INTO teams (
    team_name, team_name_en, team_name_jp, team_abbreviation, 
    league, city, stadium, established_year, team_color
) VALUES 
-- Central League
('요미우리 자이언츠', 'Yomiuri Giants', '読売ジャイアンツ', 'YOG', 'central', '도쿄', '도쿄 돔', 1934, '#FF6600'),
('한신 타이거스', 'Hanshin Tigers', '阪神タイガース', 'HAN', 'central', '니시노미야', '한신 고시엔 구장', 1935, '#FFE500'),
('요코하마 DeNA 베이스타스', 'Yokohama DeNA BayStars', '横浜DeNAベイスターズ', 'YDB', 'central', '요코하마', '요코하마 스타디움', 1950, '#0066CC'),
('히로시마 카프', 'Hiroshima Carp', '広島東洋カープ', 'HIR', 'central', '히로시마', '마쓰다 줌줌 스타디움', 1950, '#FF0000'),
('주니치 드래곤스', 'Chunichi Dragons', '中日ドラゴンズ', 'CHU', 'central', '나고야', '반텔린 돔 나고야', 1936, '#0066FF'),
('야쿠르트 스왈로우즈', 'Yakult Swallows', 'ヤクルトスワローズ', 'YAK', 'central', '도쿄', '메이지 진구 야구장', 1950, '#00AA00'),

-- Pacific League  
('소프트뱅크 호크스', 'SoftBank Hawks', 'ソフトバンクホークス', 'SOF', 'pacific', '후쿠오카', 'PayPay 돔', 1938, '#FFFF00'),
('롯데 마린즈', 'Lotte Marines', 'ロッテマリーンズ', 'LOT', 'pacific', '치바', 'ZOZO 마린 스타디움', 1950, '#000080'),
('라쿠텐 이글스', 'Rakuten Eagles', '楽天ゴールデンイーグルス', 'RAK', 'pacific', '센다이', '라쿠텐 생명파크 미야기', 2005, '#990000'),
('오릭스 버팔로즈', 'ORIX Buffaloes', 'オリックス・バファローズ', 'ORI', 'pacific', '오사카', '교세라 돔 오사카', 1936, '#000000'),
('세이부 라이온즈', 'Seibu Lions', '埼玉西武ライオンズ', 'SEI', 'pacific', '사이타마', '벨루나 돔', 1950, '#0066CC'),
('니혼햄 파이터즈', 'Nippon-Ham Fighters', '北海道日本ハムファイターズ', 'NIP', 'pacific', 'ES콘 필드 홋카이도', '삿포로', 1946, '#0099CC');

-- Insert initial data sources
INSERT INTO data_sources (source_name, base_url, rate_limit_per_hour, user_agent) VALUES
('NPB Official', 'https://npb.jp', 1000, 'NPB-Dashboard-Bot/1.0'),
('Yahoo Sports JP', 'https://baseball.yahoo.co.jp', 500, 'NPB-Dashboard-Bot/1.0'),
('Sports Navi', 'https://sports.yahoo.co.jp', 300, 'NPB-Dashboard-Bot/1.0');

-- Create views for common queries
CREATE VIEW current_standings AS
SELECT 
    s.*,
    t.team_name,
    t.team_name_en,
    t.team_abbreviation,
    t.team_color
FROM standings s
JOIN teams t ON s.team_id = t.team_id
WHERE s.season = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY s.league, s.rank;

CREATE VIEW team_head_to_head_matrix AS
SELECT 
    h.*,
    ta.team_name as team_a_name,
    ta.team_abbreviation as team_a_abbr,
    tb.team_name as team_b_name,
    tb.team_abbreviation as team_b_abbr,
    ROUND(
        CASE 
            WHEN h.team_a_wins + h.team_a_losses > 0 
            THEN h.team_a_wins::DECIMAL / (h.team_a_wins + h.team_a_losses)
            ELSE 0 
        END, 3
    ) as team_a_win_pct
FROM head_to_head h
JOIN teams ta ON h.team_a_id = ta.team_id
JOIN teams tb ON h.team_b_id = tb.team_id
WHERE h.season = EXTRACT(YEAR FROM CURRENT_DATE);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO npb_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO npb_user;