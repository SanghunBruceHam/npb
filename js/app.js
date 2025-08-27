/**
 * NPB 대시보드 메인 애플리케이션
 * 모든 테이블 모듈을 초기화하고 데이터를 로드
 */
class NPBDashboardApp {
    constructor() {
        this.initialized = false;
        this.tables = {};
        this.refreshInterval = null;
        this.refreshIntervalTime = 5 * 60 * 1000; // 5분마다 자동 새로고침
    }
    
    /**
     * 애플리케이션 초기화
     */
    async init() {
        if (this.initialized) {
            console.log('NPB 대시보드가 이미 초기화되었습니다.');
            return;
        }
        
        console.log('🏗️ NPB 대시보드 초기화 시작...');
        
        try {
            // 1. 핵심 모듈들이 로드되었는지 확인
            this.checkCoreModules();
            
            // 2. 테이블 인스턴스 생성
            this.initializeTables();
            
            // 3. 초기 데이터 로드
            await this.loadInitialData();
            
            // 4. 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 5. 자동 새로고침 설정
            this.setupAutoRefresh();
            
            // 6. 에러 핸들링 설정
            this.setupErrorHandling();
            
            this.initialized = true;
            console.log('✅ NPB 대시보드 초기화 완료!');
            
            // 초기화 완료 이벤트 발생
            this.dispatchEvent('npb-dashboard-ready');
            
        } catch (error) {
            console.error('❌ NPB 대시보드 초기화 실패:', error);
            this.handleInitializationError(error);
        }
    }
    
    /**
     * 핵심 모듈 존재 확인
     */
    checkCoreModules() {
        const requiredModules = [
            'npbDataManager',
            'npbApiClient', 
            'NPBUtils'
        ];
        
        const missingModules = requiredModules.filter(module => 
            !window[module]
        );
        
        if (missingModules.length > 0) {
            throw new Error(`필수 모듈이 로드되지 않았습니다: ${missingModules.join(', ')}`);
        }
        
        console.log('✅ 모든 핵심 모듈이 로드되었습니다.');
    }
    
    /**
     * 테이블 인스턴스들 초기화
     */
    initializeTables() {
        const tableConfigs = [
            { name: 'standings', class: 'NPBStandingsTable', container: 'standings-container' },
            { name: 'pythagorean', class: 'NPBPythagoreanTable', container: 'pythagorean-container' },
            { name: 'homeAway', class: 'NPBHomeAwayTable', container: 'home-away-container' },
            { name: 'magicNumber', class: 'NPBMagicNumberTable', container: 'magic-number-container' }
        ];
        
        tableConfigs.forEach(config => {
            const TableClass = window[config.class];
            const container = document.getElementById(config.container);
            
            if (!TableClass) {
                console.warn(`⚠️ ${config.class} 클래스를 찾을 수 없습니다.`);
                return;
            }
            
            if (!container) {
                console.warn(`⚠️ ${config.container} 컨테이너를 찾을 수 없습니다.`);
                return;
            }
            
            try {
                this.tables[config.name] = new TableClass(config.container);
                console.log(`✅ ${config.name} 테이블 초기화 완료`);
            } catch (error) {
                console.error(`❌ ${config.name} 테이블 초기화 실패:`, error);
            }
        });
        
        console.log(`📊 총 ${Object.keys(this.tables).length}개 테이블 초기화됨`);
    }
    
    /**
     * 초기 데이터 로드
     */
    async loadInitialData() {
        console.log('📡 초기 데이터 로딩 시작...');
        
        try {
            // 로딩 상태 설정
            window.npbDataManager.setLoading(true);
            
            // 모든 데이터 로드
            const allData = await window.npbApiClient.loadAllData();
            
            // 데이터 매니저에 데이터 업데이트
            if (allData.standings) {
                window.npbDataManager.updateData('standings', allData.standings);
            }
            
            if (allData.teamStats) {
                window.npbDataManager.updateData('teamStats', allData.teamStats);
            }
            
            if (allData.gameRecords) {
                window.npbDataManager.updateData('gameRecords', allData.gameRecords);
            }
            
            if (allData.seasonData) {
                window.npbDataManager.updateData('seasonData', allData.seasonData);
            }
            
            console.log('✅ 초기 데이터 로딩 완료');
            
        } catch (error) {
            console.error('❌ 초기 데이터 로딩 실패:', error);
            // 목업 데이터라도 로드
            this.loadFallbackData();
        } finally {
            window.npbDataManager.setLoading(false);
        }
    }
    
    /**
     * 폴백 데이터 로드 (목업 데이터 사용)
     */
    loadFallbackData() {
        console.log('🔄 폴백 데이터 로딩...');
        
        try {
            const mockStandings = window.npbApiClient.getMockStandings();
            const mockTeamStats = window.npbApiClient.getMockTeamStats();
            const mockGameRecords = window.npbApiClient.getMockGameRecords();
            
            window.npbDataManager.updateData('standings', mockStandings);
            window.npbDataManager.updateData('teamStats', mockTeamStats);
            window.npbDataManager.updateData('gameRecords', mockGameRecords);
            
            console.log('✅ 폴백 데이터 로딩 완료');
        } catch (error) {
            console.error('❌ 폴백 데이터 로딩도 실패:', error);
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 새로고침 버튼
        const refreshButton = document.getElementById('refresh-button');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshData();
            });
        }
        
        // 테마 토글 버튼
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // 테이블 탭 네비게이션
        const tabButtons = document.querySelectorAll('.tab-nav .tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleDebugMode();
                        break;
                }
            }
        });
        
        console.log('✅ 이벤트 리스너 설정 완료');
    }
    
    /**
     * 자동 새로고침 설정
     */
    setupAutoRefresh() {
        // 기존 인터벌 정리
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // 새로운 인터벌 설정
        this.refreshInterval = setInterval(() => {
            console.log('🔄 자동 새로고침 실행...');
            this.refreshData();
        }, this.refreshIntervalTime);
        
        console.log(`⏰ 자동 새로고침 설정 완료 (${this.refreshIntervalTime / 1000}초마다)`);
    }
    
    /**
     * 에러 핸들링 설정
     */
    setupErrorHandling() {
        // 전역 에러 핸들러
        window.addEventListener('error', (e) => {
            console.error('전역 에러:', e.error);
            this.showError('예기치 않은 오류가 발생했습니다.');
        });
        
        // Promise 거부 핸들러
        window.addEventListener('unhandledrejection', (e) => {
            console.error('처리되지 않은 Promise 거부:', e.reason);
            this.showError('데이터 처리 중 오류가 발생했습니다.');
        });
        
        console.log('✅ 에러 핸들링 설정 완료');
    }
    
    /**
     * 데이터 새로고침
     */
    async refreshData() {
        const refreshButton = document.getElementById('refresh-button');
        
        try {
            // 버튼 비활성화
            if (refreshButton) {
                refreshButton.disabled = true;
                refreshButton.textContent = '새로고침 중...';
            }
            
            // 모든 테이블 새로고침
            const refreshPromises = Object.values(this.tables)
                .filter(table => table && typeof table.refresh === 'function')
                .map(table => table.refresh());
            
            await Promise.allSettled(refreshPromises);
            
            console.log('✅ 데이터 새로고침 완료');
            this.showSuccess('데이터가 성공적으로 새로고침되었습니다.');
            
        } catch (error) {
            console.error('❌ 데이터 새로고침 실패:', error);
            this.showError('데이터 새로고침에 실패했습니다.');
        } finally {
            // 버튼 복원
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = '새로고침';
            }
        }
    }
    
    /**
     * 테마 토글
     */
    toggleTheme() {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        NPBUtils.storage.set('theme', newTheme);
        
        console.log(`🎨 테마 변경: ${newTheme}`);
    }
    
    /**
     * 탭 전환
     */
    switchTab(tabName) {
        // 모든 탭 컨텐츠 숨김
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.style.display = 'none');
        
        // 모든 탭 버튼 비활성화
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => button.classList.remove('active'));
        
        // 선택된 탭 활성화
        const targetContent = document.getElementById(`${tabName}-tab`);
        const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (targetContent) targetContent.style.display = 'block';
        if (targetButton) targetButton.classList.add('active');
        
        console.log(`📋 탭 전환: ${tabName}`);
    }
    
    /**
     * 디버그 모드 토글
     */
    toggleDebugMode() {
        const debugPanel = document.getElementById('debug-panel');
        if (!debugPanel) return;
        
        const isVisible = debugPanel.style.display !== 'none';
        debugPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.updateDebugInfo();
        }
        
        console.log(`🐛 디버그 모드: ${isVisible ? 'OFF' : 'ON'}`);
    }
    
    /**
     * 디버그 정보 업데이트
     */
    updateDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        if (!debugInfo) return;
        
        const stats = window.npbDataManager.getStats();
        const tableCount = Object.keys(this.tables).length;
        
        debugInfo.innerHTML = `
            <h4>🔍 디버그 정보</h4>
            <div class="debug-section">
                <h5>데이터 매니저</h5>
                <p>캐시된 데이터: ${stats.cachedDataTypes.join(', ')}</p>
                <p>구독자 수: ${JSON.stringify(stats.subscriberCounts)}</p>
                <p>마지막 업데이트: ${stats.lastUpdate || 'N/A'}</p>
                <p>로딩 중: ${stats.isLoading ? 'YES' : 'NO'}</p>
            </div>
            <div class="debug-section">
                <h5>테이블</h5>
                <p>초기화된 테이블: ${tableCount}개</p>
                <p>테이블 목록: ${Object.keys(this.tables).join(', ')}</p>
            </div>
            <div class="debug-section">
                <h5>시스템</h5>
                <p>초기화 상태: ${this.initialized ? 'YES' : 'NO'}</p>
                <p>자동 새로고침: ${this.refreshInterval ? 'ON' : 'OFF'}</p>
            </div>
        `;
    }
    
    /**
     * 성공 메시지 표시
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    /**
     * 에러 메시지 표시
     */
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    /**
     * 알림 표시
     */
    showNotification(message, type = 'info') {
        // 간단한 토스트 알림 구현
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;
        
        document.body.appendChild(notification);
        
        // 3초 후 제거
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * 커스텀 이벤트 발생
     */
    dispatchEvent(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }
    
    /**
     * 초기화 오류 처리
     */
    handleInitializationError(error) {
        const errorContainer = document.getElementById('initialization-error');
        if (errorContainer) {
            errorContainer.style.display = 'block';
            errorContainer.innerHTML = `
                <h3>⚠️ 초기화 오류</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()">페이지 새로고침</button>
            `;
        }
        
        this.showError('대시보드 초기화에 실패했습니다. 페이지를 새로고침해 주세요.');
    }
    
    /**
     * 애플리케이션 정리
     */
    destroy() {
        // 자동 새로고침 정리
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // 테이블 인스턴스들 정리
        Object.values(this.tables).forEach(table => {
            if (table && typeof table.destroy === 'function') {
                table.destroy();
            }
        });
        
        this.tables = {};
        this.initialized = false;
        
        console.log('🗑️ NPB 대시보드 정리 완료');
    }
}

// DOM 로드 완료 후 자동 초기화
document.addEventListener('DOMContentLoaded', async () => {
    // 전역 앱 인스턴스 생성
    window.npbDashboard = new NPBDashboardApp();
    
    // 저장된 테마 복원
    const savedTheme = NPBUtils.storage.get('theme', 'light');
    document.body.setAttribute('data-theme', savedTheme);
    
    // 앱 초기화
    try {
        await window.npbDashboard.init();
    } catch (error) {
        console.error('NPB 대시보드 자동 초기화 실패:', error);
    }
});

// 페이지 언로드시 정리
window.addEventListener('beforeunload', () => {
    if (window.npbDashboard) {
        window.npbDashboard.destroy();
    }
});

// CSS 애니메이션 추가
if (!document.getElementById('notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
    styles.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification {
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
    `;
    document.head.appendChild(styles);
}