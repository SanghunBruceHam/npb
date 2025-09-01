// NPB Dashboard Configuration
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api/v1'
            : '/api/v1',
        ENDPOINTS: {
            STANDINGS: '/standings',
            MAGIC_NUMBERS: '/magic-numbers',
            HEAD_TO_HEAD: '/head-to-head',
            TEAMS: '/teams',
            GAMES: '/games',
            HEALTH: '/health'
        },
        CACHE_DURATION: {
            SHORT: 60000,      // 1 minute
            MEDIUM: 300000,    // 5 minutes
            LONG: 900000       // 15 minutes
        },
        RETRY: {
            MAX_ATTEMPTS: 3,
            DELAY: 1000,
            BACKOFF_MULTIPLIER: 2
        }
    },

    // NPB League Configuration
    LEAGUES: {
        CENTRAL: {
            name: '센트럴 리그',
            nameEn: 'Central League',
            nameJp: 'セントラル・リーグ',
            color: '#d32f2f',
            teams: 6
        },
        PACIFIC: {
            name: '퍼시픽 리그',
            nameEn: 'Pacific League', 
            nameJp: 'パシフィック・リーグ',
            color: '#1976d2',
            teams: 6
        }
    },

    // NPB Teams Configuration
    TEAMS: {
        // Central League
        YOG: { name: '요미우리 자이언츠', color: '#FF6600', league: 'central' },
        HAN: { name: '한신 타이거스', color: '#FFE500', league: 'central' },
        YDB: { name: '요코하마 DeNA', color: '#0066CC', league: 'central' },
        HIR: { name: '히로시마 카프', color: '#FF0000', league: 'central' },
        CHU: { name: '주니치 드래곤스', color: '#0066FF', league: 'central' },
        YAK: { name: '야쿠르트 스왈로우즈', color: '#00AA00', league: 'central' },
        
        // Pacific League
        SOF: { name: '소프트뱅크 호크스', color: '#FFFF00', league: 'pacific' },
        LOT: { name: '롯데 마린즈', color: '#000080', league: 'pacific' },
        RAK: { name: '라쿠텐 이글스', color: '#990000', league: 'pacific' },
        ORI: { name: '오릭스 버팔로즈', color: '#000000', league: 'pacific' },
        SEI: { name: '세이부 라이온즈', color: '#0066CC', league: 'pacific' },
        NIP: { name: '니혼햄 파이터즈', color: '#0099CC', league: 'pacific' }
    },

    // Season Configuration
    SEASON: {
        CURRENT: new Date().getFullYear(),
        TOTAL_GAMES: 144,
        START_DATE: `${new Date().getFullYear()}-03-15`,
        END_DATE: `${new Date().getFullYear()}-10-15`,
        INTERLEAGUE_START: `${new Date().getFullYear()}-05-15`,
        INTERLEAGUE_END: `${new Date().getFullYear()}-06-15`
    },

    // UI Configuration
    UI: {
        UPDATE_INTERVAL: 60000, // 1 minute
        LOADING_TIMEOUT: 10000, // 10 seconds
        ERROR_DISPLAY_DURATION: 5000, // 5 seconds
        SUCCESS_DISPLAY_DURATION: 3000, // 3 seconds
        ANIMATION: {
            DURATION: 300,
            EASING: 'ease-in-out'
        },
        PAGINATION: {
            DEFAULT_LIMIT: 20,
            MAX_LIMIT: 100
        }
    },

    // Chart Configuration
    CHARTS: {
        COLORS: {
            PRIMARY: '#1976d2',
            SECONDARY: '#dc004e',
            SUCCESS: '#388e3c',
            WARNING: '#f57c00',
            INFO: '#0288d1',
            LIGHT: '#f5f5f5',
            DARK: '#424242'
        },
        DEFAULTS: {
            HEIGHT: 300,
            RESPONSIVE: true,
            MAINTAIN_ASPECT_RATIO: false,
            PLUGINS: {
                LEGEND: {
                    DISPLAY: true,
                    POSITION: 'bottom'
                }
            }
        }
    },

    // Magic Number Configuration
    MAGIC_NUMBERS: {
        PROBABILITY_TIERS: {
            VERY_UNLIKELY: { min: 0, max: 5, color: '#f44336', label: '매우 낮음' },
            UNLIKELY: { min: 5, max: 25, color: '#ff9800', label: '낮음' },
            POSSIBLE: { min: 25, max: 50, color: '#ffeb3b', label: '가능함' },
            LIKELY: { min: 50, max: 75, color: '#8bc34a', label: '높음' },
            VERY_LIKELY: { min: 75, max: 95, color: '#4caf50', label: '매우 높음' },
            VIRTUALLY_CERTAIN: { min: 95, max: 100, color: '#2e7d32', label: '확실함' }
        },
        SCENARIOS: {
            CHAMPIONSHIP: '우승',
            PLAYOFF: '플레이오프'
        }
    },

    // Date/Time Configuration
    DATETIME: {
        TIMEZONE: 'Asia/Tokyo',
        FORMATS: {
            DATE: 'YYYY-MM-DD',
            DATETIME: 'YYYY-MM-DD HH:mm',
            TIME: 'HH:mm',
            DISPLAY_DATE: 'M월 D일',
            DISPLAY_DATETIME: 'M월 D일 HH:mm',
            API_DATETIME: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
        }
    },

    // Storage Configuration
    STORAGE: {
        PREFIX: 'npb_dashboard_',
        KEYS: {
            USER_PREFERENCES: 'user_preferences',
            FAVORITE_TEAMS: 'favorite_teams',
            LAST_UPDATE: 'last_update',
            CACHE: 'cache_'
        },
        EXPIRY: {
            USER_DATA: 30 * 24 * 60 * 60 * 1000, // 30 days
            CACHE: 15 * 60 * 1000 // 15 minutes
        }
    },

    // Error Messages
    ERRORS: {
        NETWORK: '네트워크 연결을 확인해주세요.',
        SERVER: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
        TIMEOUT: '요청 시간이 초과되었습니다.',
        INVALID_RESPONSE: '잘못된 응답을 받았습니다.',
        GENERIC: '오류가 발생했습니다. 다시 시도해주세요.'
    },

    // Success Messages
    MESSAGES: {
        DATA_LOADED: '데이터를 성공적으로 불러왔습니다.',
        DATA_UPDATED: '데이터가 업데이트되었습니다.',
        SETTINGS_SAVED: '설정이 저장되었습니다.'
    },

    // Feature Flags
    FEATURES: {
        REAL_TIME_UPDATES: true,
        PUSH_NOTIFICATIONS: false,
        DARK_MODE: true,
        EXPORT_DATA: true,
        ADVANCED_STATS: true,
        USER_ACCOUNTS: false
    },

    // Debug Configuration
    DEBUG: {
        ENABLED: window.location.hostname === 'localhost',
        LOG_LEVEL: 'info', // 'error', 'warn', 'info', 'debug'
        SHOW_API_CALLS: true,
        SHOW_CACHE_HITS: true
    }
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make CONFIG globally available
window.CONFIG = CONFIG;