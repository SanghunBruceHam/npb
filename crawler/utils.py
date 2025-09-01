"""
NPB Crawler Utilities
크롤러용 유틸리티 함수들
"""

import re
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Union
from urllib.parse import urljoin, urlparse
import pytz

def clean_text(text: str) -> str:
    """텍스트 정리"""
    if not text:
        return ""
    
    # 공백 정리
    text = re.sub(r'\s+', ' ', text.strip())
    
    # HTML 엔티티 디코딩
    html_entities = {
        '&amp;': '&',
        '&lt;': '<', 
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&nbsp;': ' '
    }
    
    for entity, char in html_entities.items():
        text = text.replace(entity, char)
    
    return text

def parse_japanese_number(text: str) -> Optional[int]:
    """일본어 숫자 파싱"""
    if not text or text.strip() in ['-', '―', '—']:
        return 0
        
    # 숫자만 추출
    numbers = re.findall(r'\d+', text)
    if numbers:
        return int(numbers[0])
    
    return None

def parse_win_percentage(text: str) -> Optional[float]:
    """승률 파싱 (.000 형식)"""
    if not text or text.strip() in ['-', '―', '—']:
        return 0.0
    
    # 소수점 형식 찾기
    match = re.search(r'(\d?\.\d{3})', text)
    if match:
        return float(match.group(1))
    
    # 정수 형식 (예: 500 -> 0.500)
    match = re.search(r'(\d{1,3})(?!\d)', text)
    if match:
        val = int(match.group(1))
        if val <= 1000:
            return val / 1000.0
    
    return None

def parse_games_behind(text: str) -> Optional[float]:
    """게임차 파싱"""
    if not text or text.strip() in ['-', '―', '—', '0']:
        return 0.0
    
    # 소수점 숫자 찾기
    match = re.search(r'(\d+(?:\.\d+)?)', text)
    if match:
        return float(match.group(1))
    
    return 0.0

def convert_japanese_date(date_str: str) -> Optional[str]:
    """일본어 날짜를 ISO 형식으로 변환"""
    if not date_str:
        return None
    
    # 일본어 월 이름 매핑
    jp_months = {
        '1月': '01', '2月': '02', '3月': '03', '4月': '04',
        '5月': '05', '6月': '06', '7月': '07', '8月': '08', 
        '9月': '09', '10月': '10', '11月': '11', '12月': '12'
    }
    
    # 패턴: 2025年3月15日 -> 2025-03-15
    pattern = r'(\d{4})年(\d{1,2})月(\d{1,2})日'
    match = re.search(pattern, date_str)
    if match:
        year, month, day = match.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    
    # 패턴: 3月15日 -> 2025-03-15 (현재 년도 가정)
    pattern = r'(\d{1,2})月(\d{1,2})日'
    match = re.search(pattern, date_str)
    if match:
        month, day = match.groups()
        current_year = datetime.now().year
        return f"{current_year}-{month.zfill(2)}-{day.zfill(2)}"
    
    return None

def get_jst_now() -> datetime:
    """일본 표준시 현재 시간"""
    jst = pytz.timezone('Asia/Tokyo')
    return datetime.now(jst)

def get_jst_date_range(days_back: int = 7) -> List[str]:
    """JST 기준 날짜 범위 생성"""
    jst_now = get_jst_now()
    dates = []
    
    for i in range(days_back):
        date = jst_now - timedelta(days=i)
        dates.append(date.strftime('%Y-%m-%d'))
    
    return dates

def is_baseball_season() -> bool:
    """야구 시즌 여부 확인 (3월~11월)"""
    now = get_jst_now()
    month = now.month
    return 3 <= month <= 11

def validate_score(score: Union[str, int]) -> bool:
    """야구 점수 유효성 검사"""
    try:
        score_int = int(score)
        return 0 <= score_int <= 30
    except (ValueError, TypeError):
        return False

def validate_team_stats(stats: Dict) -> bool:
    """팀 통계 유효성 검사"""
    required_fields = ['wins', 'losses', 'draws', 'games_played']
    
    for field in required_fields:
        if field not in stats:
            return False
        
        try:
            value = int(stats[field])
            if value < 0:
                return False
        except (ValueError, TypeError):
            return False
    
    # 경기수 일관성 검사
    total = stats['wins'] + stats['losses'] + stats['draws'] 
    if total != stats['games_played']:
        return False
    
    return True

def rate_limit_delay(last_request_time: Optional[float], min_delay: float = 1.0) -> None:
    """요청 간격 제한"""
    if last_request_time is None:
        return
    
    elapsed = time.time() - last_request_time
    if elapsed < min_delay:
        sleep_time = min_delay - elapsed
        time.sleep(sleep_time)

def safe_url_join(base_url: str, path: str) -> str:
    """안전한 URL 결합"""
    if not path:
        return base_url
    
    if path.startswith('http'):
        return path
        
    return urljoin(base_url, path)

def extract_team_from_url(url: str) -> Optional[str]:
    """URL에서 팀 정보 추출"""
    # 일반적인 패턴들
    patterns = [
        r'/team/(\w+)/',
        r'team_id=(\w+)',
        r'/(\w+)/games/',
        r'/(\w+)/standings/'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None

def format_duration(seconds: float) -> str:
    """시간 포맷팅"""
    if seconds < 60:
        return f"{seconds:.1f}초"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f}분"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}시간"

def create_safe_filename(text: str, max_length: int = 100) -> str:
    """안전한 파일명 생성"""
    # 특수문자 제거
    safe_text = re.sub(r'[<>:"/\\|?*]', '_', text)
    safe_text = re.sub(r'\s+', '_', safe_text)
    
    # 길이 제한
    if len(safe_text) > max_length:
        safe_text = safe_text[:max_length]
    
    return safe_text.strip('_')

def detect_encoding(content: bytes) -> str:
    """텍스트 인코딩 감지"""
    # 일본어 사이트에서 자주 사용되는 인코딩들
    encodings = ['utf-8', 'shift_jis', 'euc-jp', 'iso-2022-jp']
    
    for encoding in encodings:
        try:
            content.decode(encoding)
            return encoding
        except (UnicodeDecodeError, LookupError):
            continue
    
    # 기본값
    return 'utf-8'

def normalize_team_name(name: str) -> str:
    """팀명 정규화"""
    if not name:
        return ""
    
    # 공통 정규화
    name = clean_text(name)
    
    # 일반적인 변형 처리
    replacements = {
        'ソフトバンクホークス': 'ソフトバンク',
        'DeNAベイスターズ': 'DeNA',
        'ヤクルトスワローズ': 'ヤクルト',
        '日本ハムファイターズ': '日本ハム'
    }
    
    for old, new in replacements.items():
        if old in name:
            return new
    
    return name

def calculate_win_percentage(wins: int, losses: int, draws: int = 0) -> float:
    """승률 계산 (무승부 제외)"""
    total_decisive = wins + losses
    if total_decisive == 0:
        return 0.0
    return wins / total_decisive

def calculate_games_behind(target_wins: int, target_losses: int, 
                          leader_wins: int, leader_losses: int) -> float:
    """게임차 계산"""
    target_win_pct = calculate_win_percentage(target_wins, target_losses)
    leader_win_pct = calculate_win_percentage(leader_wins, leader_losses)
    
    if leader_win_pct <= target_win_pct:
        return 0.0
    
    # 게임차 = (리더 승수 - 대상 승수 + 대상 패수 - 리더 패수) / 2
    return ((leader_wins - target_wins) + (target_losses - leader_losses)) / 2.0

def validate_game_data(game_data: Dict) -> List[str]:
    """경기 데이터 검증"""
    errors = []
    
    required_fields = ['home_team', 'away_team', 'game_date']
    for field in required_fields:
        if field not in game_data or not game_data[field]:
            errors.append(f"Missing required field: {field}")
    
    # 점수 검증
    if 'home_score' in game_data:
        if not validate_score(game_data['home_score']):
            errors.append("Invalid home score")
    
    if 'away_score' in game_data:
        if not validate_score(game_data['away_score']):
            errors.append("Invalid away score")
    
    # 같은 팀 확인
    if (game_data.get('home_team') == game_data.get('away_team') and
        game_data.get('home_team')):
        errors.append("Home and away teams cannot be the same")
    
    return errors

class RequestTracker:
    """요청 추적 및 제한"""
    
    def __init__(self, min_delay: float = 1.0):
        self.min_delay = min_delay
        self.last_request_times = {}
    
    def wait_if_needed(self, domain: str):
        """필요시 대기"""
        last_time = self.last_request_times.get(domain)
        if last_time:
            elapsed = time.time() - last_time
            if elapsed < self.min_delay:
                time.sleep(self.min_delay - elapsed)
    
    def mark_request(self, domain: str):
        """요청 시간 기록"""
        self.last_request_times[domain] = time.time()

class DataValidator:
    """데이터 검증기"""
    
    @staticmethod
    def is_valid_season_year(year: int) -> bool:
        """시즌 연도 유효성"""
        current_year = datetime.now().year
        return 1950 <= year <= current_year + 1
    
    @staticmethod
    def is_valid_game_date(date_str: str) -> bool:
        """경기 날짜 유효성"""
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d')
            # 1950년 이후, 미래 1년 이내
            now = datetime.now()
            return (datetime(1950, 1, 1) <= date <= now + timedelta(days=365))
        except ValueError:
            return False
    
    @staticmethod
    def is_reasonable_score(score: int) -> bool:
        """합리적인 점수 범위"""
        return 0 <= score <= 25  # 일반적인 야구 점수 범위