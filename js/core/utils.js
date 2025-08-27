/**
 * NPB 대시보드 공통 유틸리티 함수들
 */
const NPBUtils = {
    
    /**
     * 승률 계산
     * @param {number} wins - 승수
     * @param {number} losses - 패수
     * @param {number} draws - 무승부 (기본값: 0)
     * @returns {number} 승률 (0.000 형태)
     */
    calculateWinPct(wins, losses, draws = 0) {
        const totalGames = wins + losses + draws;
        return totalGames === 0 ? 0 : wins / totalGames;
    },
    
    /**
     * 승률을 백분율로 포맷팅
     * @param {number} winPct - 승률
     * @param {number} decimals - 소수점 자릿수 (기본값: 3)
     * @returns {string} 포맷된 승률 (예: "0.625")
     */
    formatWinPct(winPct, decimals = 3) {
        if (isNaN(winPct) || winPct == null) return '-.---';
        return winPct.toFixed(decimals);
    },
    
    /**
     * 피타고리안 승률 계산
     * @param {number} runsScored - 득점
     * @param {number} runsAllowed - 실점
     * @param {number} exponent - 지수 (기본값: 2)
     * @returns {number} 피타고리안 승률
     */
    calculatePythagoreanWinPct(runsScored, runsAllowed, exponent = 2) {
        if (runsScored === 0 && runsAllowed === 0) return 0.5;
        
        const scoredPower = Math.pow(runsScored, exponent);
        const allowedPower = Math.pow(runsAllowed, exponent);
        
        return scoredPower / (scoredPower + allowedPower);
    },
    
    /**
     * 게임차 계산
     * @param {Object} team - 팀 데이터
     * @param {Object} leader - 선두팀 데이터
     * @returns {number} 게임차
     */
    calculateGamesBehind(team, leader) {
        const teamPct = team.wins / (team.wins + team.losses);
        const leaderPct = leader.wins / (leader.wins + leader.losses);
        const teamGames = team.wins + team.losses;
        const leaderGames = leader.wins + leader.losses;
        
        return ((leaderPct * leaderGames) - (teamPct * teamGames)) / 2;
    },
    
    /**
     * 매직 넘버 계산
     * @param {Object} team - 팀 데이터
     * @param {number} totalGames - 총 경기 수
     * @param {Array} otherTeams - 다른 팀들 데이터
     * @returns {number|string} 매직 넘버 또는 'E' (eliminated)
     */
    calculateMagicNumber(team, totalGames, otherTeams) {
        const teamMaxWins = team.wins + (totalGames - team.wins - team.losses);
        
        for (const other of otherTeams) {
            if (other.name === team.name) continue;
            
            const otherMaxWins = other.wins + (totalGames - other.wins - other.losses);
            if (otherMaxWins >= teamMaxWins) {
                return 'E'; // Eliminated
            }
        }
        
        const secondBestMaxWins = Math.max(...otherTeams
            .filter(t => t.name !== team.name)
            .map(t => t.wins + (totalGames - t.wins - t.losses)));
            
        return Math.max(1, secondBestMaxWins + 1 - team.wins);
    },
    
    /**
     * 날짜 포맷팅
     * @param {Date|string} date - 날짜
     * @param {string} locale - 로케일 (기본값: 'ja-JP')
     * @returns {string} 포맷된 날짜
     */
    formatDate(date, locale = 'ja-JP') {
        const d = new Date(date);
        return d.toLocaleDateString(locale, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    },
    
    /**
     * 시간 포맷팅 (상대시간)
     * @param {Date|string} date - 날짜
     * @returns {string} 상대시간 (예: "3분 전")
     */
    formatRelativeTime(date) {
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        
        return this.formatDate(target);
    },
    
    /**
     * 숫자에 천단위 구분자 추가
     * @param {number} number - 숫자
     * @returns {string} 포맷된 숫자
     */
    formatNumber(number) {
        if (number == null || isNaN(number)) return '0';
        return number.toLocaleString('ja-JP');
    },
    
    /**
     * 팀명 표준화 (일본어 팀명 처리)
     * @param {string} teamName - 팀명
     * @returns {string} 표준화된 팀명
     */
    normalizeTeamName(teamName) {
        const nameMap = {
            '巨人': '読売ジャイアンツ',
            'ジャイアンツ': '読売ジャイアンツ',
            '阪神': '阪神タイガース',
            'タイガース': '阪神タイガース',
            '広島': '広島東洋カープ',
            'カープ': '広島東洋カープ',
            'DeNA': '横浜DeNAベイスターズ',
            'ベイスターズ': '横浜DeNAベイスターズ',
            '中日': '中日ドラゴンズ',
            'ドラゴンズ': '中日ドラゴンズ',
            'ヤクルト': 'ヤクルトスワローズ',
            'スワローズ': 'ヤクルトスワローズ',
            'ソフトバンク': '福岡ソフトバンクホークス',
            'ホークス': '福岡ソフトバンクホークス',
            'ロッテ': '千葉ロッテマリーンズ',
            'マリーンズ': '千葉ロッテマリーンズ',
            '西武': '埼玉西武ライオンズ',
            'ライオンズ': '埼玉西武ライオンズ',
            '楽天': '東北楽天ゴールデンイーグルス',
            'イーグルス': '東北楽天ゴールデンイーグルス',
            'ハム': '北海道日本ハムファイターズ',
            'ファイターズ': '北海道日本ハムファイターズ',
            'オリックス': 'オリックスバファローズ',
            'バファローズ': 'オリックスバファローズ'
        };
        
        return nameMap[teamName] || teamName;
    },
    
    /**
     * 팀 로고 파일명 생성
     * @param {string} teamName - 팀명
     * @returns {string} 로고 파일명
     */
    getTeamLogoFileName(teamName) {
        const logoMap = {
            '読売ジャイアンツ': 'giants.png',
            '阪神タイガース': 'tigers.png',
            '広島東洋カープ': 'carp.png',
            '横浜DeNAベイスターズ': 'baystars.png',
            '中日ドラゴンズ': 'dragons.png',
            'ヤクルトスワローズ': 'swallows.png',
            '福岡ソフトバンクホークス': 'hawks.png',
            '千葉ロッテマリーンズ': 'marines.png',
            '埼玉西武ライオンズ': 'lions.png',
            '東北楽天ゴールデンイーグルス': 'eagles.png',
            '北海道日本ハムファイターズ': 'fighters.png',
            'オリックスバファローズ': 'buffaloes.png'
        };
        
        return logoMap[this.normalizeTeamName(teamName)] || 'default.png';
    },
    
    /**
     * 리그 구분
     * @param {string} teamName - 팀명
     * @returns {string} 리그명 ('central' 또는 'pacific')
     */
    getTeamLeague(teamName) {
        const centralTeams = [
            '読売ジャイアンツ', '阪神タイガース', '広島東洋カープ',
            '横浜DeNAベイスターズ', '中日ドラゴンズ', 'ヤクルトスワローズ'
        ];
        
        const normalizedName = this.normalizeTeamName(teamName);
        return centralTeams.includes(normalizedName) ? 'central' : 'pacific';
    },
    
    /**
     * HTML 엘리먼트 생성 헬퍼
     * @param {string} tag - HTML 태그명
     * @param {Object} attributes - 속성들
     * @param {string} content - 내용
     * @returns {HTMLElement} 생성된 엘리먼트
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            element.innerHTML = content;
        }
        
        return element;
    },
    
    /**
     * 디바운스 함수
     * @param {Function} func - 실행할 함수
     * @param {number} wait - 지연 시간 (ms)
     * @returns {Function} 디바운스된 함수
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * 로컬 스토리지 헬퍼
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(`npb_${key}`);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('로컬 스토리지 읽기 오류:', error);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(`npb_${key}`, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('로컬 스토리지 쓰기 오류:', error);
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(`npb_${key}`);
                return true;
            } catch (error) {
                console.error('로컬 스토리지 삭제 오류:', error);
                return false;
            }
        }
    }
};

// 전역 유틸리티 함수로 등록
if (typeof window !== 'undefined') {
    window.NPBUtils = NPBUtils;
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBUtils;
}