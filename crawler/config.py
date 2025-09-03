"""
NPB Crawler Configuration
크롤러 설정 파일
"""

import os
from typing import Dict, List

# NPB 팀 정보 (완전한 매핑)
NPB_TEAMS = {
    # Central League - 센트럴 리그
    'central': {
        'giants': {
            'abbr': 'YOG',
            'name_kr': '요미우리 자이언츠',
            'name_en': 'Yomiuri Giants', 
            'name_jp': '読売ジャイアンツ',
            'keywords': ['巨人', 'ジャイアンツ', 'Giants', 'G'],
            'color': '#FF6600'
        },
        'tigers': {
            'abbr': 'HAN',
            'name_kr': '한신 타이거스',
            'name_en': 'Hanshin Tigers',
            'name_jp': '阪神タイガース', 
            'keywords': ['阪神', 'タイガース', 'Tigers', 'T'],
            'color': '#FFE500'
        },
        'baystars': {
            'abbr': 'YDB',
            'name_kr': '요코하마 DeNA 베이스타즈',
            'name_en': 'Yokohama DeNA BayStars',
            'name_jp': '横浜DeNAベイスターズ',
            'keywords': ['DeNA', 'ＤｅＮＡ', 'ベイスターズ', 'BayStars', 'DB'],
            'color': '#0066CC'
        },
        'carp': {
            'abbr': 'HIR', 
            'name_kr': '히로시마 도요 카프',
            'name_en': 'Hiroshima Toyo Carp',
            'name_jp': '広島東洋カープ',
            'keywords': ['広島', 'カープ', 'Carp', 'C'],
            'color': '#FF0000'
        },
        'dragons': {
            'abbr': 'CHU',
            'name_kr': '주니치 드래곤스', 
            'name_en': 'Chunichi Dragons',
            'name_jp': '中日ドラゴンズ',
            'keywords': ['中日', 'ドラゴンズ', 'Dragons', 'D'],
            'color': '#0066FF'
        },
        'swallows': {
            'abbr': 'YAK',
            'name_kr': '도쿄 야쿠르트 스왈로우즈',
            'name_en': 'Tokyo Yakult Swallows', 
            'name_jp': '東京ヤクルトスワローズ',
            'keywords': ['ヤクルト', 'スワローズ', 'Swallows', 'S'],
            'color': '#00AA00'
        }
    },
    
    # Pacific League - 퍼시픽 리그
    'pacific': {
        'hawks': {
            'abbr': 'SOF',
            'name_kr': '후쿠오카 소프트뱅크 호크스',
            'name_en': 'Fukuoka SoftBank Hawks',
            'name_jp': '福岡ソフトバンクホークス', 
            'keywords': ['ソフトバンク', 'ホークス', 'Hawks', 'H'],
            'color': '#FFFF00'
        },
        'marines': {
            'abbr': 'LOT',
            'name_kr': '지바 롯데 마린즈',
            'name_en': 'Chiba Lotte Marines',
            'name_jp': '千葉ロッテマリーンズ',
            'keywords': ['ロッテ', 'マリーンズ', 'Marines', 'M'],
            'color': '#000080'
        },
        'eagles': {
            'abbr': 'RAK',
            'name_kr': '도호쿠 라쿠텐 골든이글스', 
            'name_en': 'Tohoku Rakuten Golden Eagles',
            'name_jp': '東北楽天ゴールデンイーグルス',
            'keywords': ['楽天', 'イーグルス', 'Eagles', 'E'],
            'color': '#990000'
        },
        'buffaloes': {
            'abbr': 'ORI',
            'name_kr': '오릭스 버팔로즈',
            'name_en': 'Orix Buffaloes', 
            'name_jp': 'オリックス・バファローズ',
            'keywords': ['オリックス', 'バファローズ', 'Buffaloes', 'B'],
            'color': '#000000'
        },
        'lions': {
            'abbr': 'SEI',
            'name_kr': '사이타마 세이부 라이온즈',
            'name_en': 'Saitama Seibu Lions',
            'name_jp': '埼玉西武ライオンズ',
            'keywords': ['西武', 'ライオンズ', 'Lions', 'L'],
            'color': '#0066CC'
        },
        'fighters': {
            'abbr': 'NIP',
            'name_kr': '홋카이도 니혼햄 파이터즈',
            'name_en': 'Hokkaido Nippon-Ham Fighters',
            'name_jp': '北海道日本ハムファイターズ',
            'keywords': ['日本ハム', 'ファイターズ', 'Fighters', 'F'],
            'color': '#0099CC'
        }
    }
}

# 데이터 소스 URL 설정 (니칸스포츠 중심)
DATA_SOURCES = {
    'nikkansports': {
        'base_url': 'https://www.nikkansports.com/baseball/professional',
        'score_pattern': 'https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date}.html',
        'standings_pattern': 'https://www.nikkansports.com/baseball/professional/score/{year}/pf-score-{date}.html',
        'rate_limit': 1,  # seconds between requests
        'timeout': 30,
        'encoding': 'utf-8',
        'stable': True,  # 안정적인 URL 패턴
        'description': '일관된 URL 패턴으로 안정적인 데이터 수집'
    },
    
    # 백업 소스들 (필요시 사용)
    'npb_official': {
        'base_url': 'https://npb.jp',
        'standings': 'https://npb.jp/standings/',
        'games': 'https://npb.jp/games/',
        'rate_limit': 2,
        'timeout': 30,
        'stable': False,
        'description': '공식 사이트 (구조 변경 가능성)'
    },
    'yahoo_sports': {
        'base_url': 'https://baseball.yahoo.co.jp/npb',
        'schedule': 'https://baseball.yahoo.co.jp/npb/schedule/',
        'rate_limit': 1,
        'timeout': 20,
        'stable': False,
        'description': '야후 스포츠 (구조 변경 가능성)'
    }
}

# 크롤러 설정
CRAWLER_CONFIG = {
    'user_agent': 'NPB-Dashboard-Bot/1.0 (+https://github.com/npb-dashboard)',
    'max_retries': 3,
    'retry_delay': 5,  # seconds
    'request_timeout': 30,
    'concurrent_requests': 2,
    
    # 크롤링 스케줄
    'schedule': {
        'full_update': '0 */6 * * *',     # 6시간마다
        'standings_update': '0 * * * *',   # 1시간마다  
        'games_update': '*/30 * * * *'     # 30분마다
    },
    
    # 데이터 검증
    'validation': {
        'min_teams_per_league': 6,
        'max_games_per_day': 12,
        'valid_score_range': (0, 30),
        'current_season_year': 2025
    }
}

# 로깅 설정
LOG_CONFIG = {
    'level': os.getenv('LOG_LEVEL', 'INFO'),
    'format': '{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}',
    'rotation': '10 MB',
    'retention': '30 days',
    'file_path': 'logs/crawler.log'
}

# 데이터베이스 설정
DATABASE_CONFIG = {
    'connection_pool_size': 5,
    'max_overflow': 10,
    'pool_timeout': 30,
    'pool_recycle': 3600,
    
    # 테이블 매핑
    'tables': {
        'teams': 'teams',
        'games': 'games', 
        'standings': 'standings',
        'crawl_logs': 'crawl_logs'
    }
}

def get_team_by_keyword(keyword: str) -> Dict:
    """키워드로 팀 정보 찾기"""
    keyword = keyword.strip()
    
    for league_teams in NPB_TEAMS.values():
        for team_data in league_teams.values():
            if keyword in team_data['keywords']:
                return team_data
            # 팀명 부분 매칭
            if (keyword in team_data['name_jp'] or 
                keyword in team_data['name_en'] or
                keyword in team_data['name_kr']):
                return team_data
    
    return None

def get_all_team_abbreviations() -> List[str]:
    """모든 팀 약어 리스트 반환"""
    abbrs = []
    for league_teams in NPB_TEAMS.values():
        for team_data in league_teams.values():
            abbrs.append(team_data['abbr'])
    return abbrs

def validate_team_abbr(abbr: str) -> bool:
    """팀 약어 유효성 검사"""
    return abbr in get_all_team_abbreviations()