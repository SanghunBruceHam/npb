/**
 * NPB 데이터 중앙 관리자
 * Observer 패턴을 사용하여 여러 테이블에서 같은 데이터를 공유
 */
class NPBDataManager {
    constructor() {
        this.cache = new Map();
        this.subscribers = new Map();
        this.lastUpdate = null;
        this.isLoading = false;
    }
    
    /**
     * 데이터 타입 구독
     * @param {string} dataType - 데이터 타입 (standings, teamStats, gameRecords 등)
     * @param {Function} callback - 데이터 업데이트시 호출될 콜백 함수
     */
    subscribe(dataType, callback) {
        if (!this.subscribers.has(dataType)) {
            this.subscribers.set(dataType, []);
        }
        this.subscribers.get(dataType).push(callback);
        
        // 이미 캐시된 데이터가 있으면 즉시 콜백 호출
        const cachedData = this.cache.get(dataType);
        if (cachedData) {
            callback(cachedData);
        }
    }
    
    /**
     * 구독 해제
     */
    unsubscribe(dataType, callback) {
        const callbacks = this.subscribers.get(dataType);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * 데이터 업데이트 및 구독자들에게 알림
     * @param {string} dataType - 데이터 타입
     * @param {any} data - 업데이트할 데이터
     */
    updateData(dataType, data) {
        this.cache.set(dataType, data);
        this.lastUpdate = new Date();
        
        // 모든 구독자에게 알림
        const callbacks = this.subscribers.get(dataType) || [];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`데이터 콜백 오류 [${dataType}]:`, error);
            }
        });
        
        console.log(`📊 [NPB DataManager] ${dataType} 데이터 업데이트 완료 (구독자: ${callbacks.length}개)`);
    }
    
    /**
     * 캐시된 데이터 반환
     */
    getData(dataType) {
        return this.cache.get(dataType);
    }
    
    /**
     * 데이터 존재 여부 확인
     */
    hasData(dataType) {
        return this.cache.has(dataType) && this.cache.get(dataType) !== null;
    }
    
    /**
     * 캐시 클리어
     */
    clearCache(dataType = null) {
        if (dataType) {
            this.cache.delete(dataType);
        } else {
            this.cache.clear();
        }
        console.log(`🗑️ [NPB DataManager] 캐시 클리어: ${dataType || 'ALL'}`);
    }
    
    /**
     * 로딩 상태 관리
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.updateData('loading', isLoading);
    }
    
    /**
     * 데이터 통계 정보
     */
    getStats() {
        return {
            cachedDataTypes: Array.from(this.cache.keys()),
            subscriberCounts: Object.fromEntries(
                Array.from(this.subscribers.entries()).map(([key, value]) => [key, value.length])
            ),
            lastUpdate: this.lastUpdate,
            isLoading: this.isLoading
        };
    }
}

// 전역 데이터 매니저 인스턴스
if (typeof window !== 'undefined') {
    window.npbDataManager = new NPBDataManager();
    
    // 개발용 디버그 함수
    window.npbDebug = {
        getStats: () => window.npbDataManager.getStats(),
        clearCache: (type) => window.npbDataManager.clearCache(type),
        getData: (type) => window.npbDataManager.getData(type)
    };
}

// Node.js 환경 지원
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBDataManager;
}