// NPB Dashboard Main Application
class NPBDashboard {
    constructor() {
        this.initialized = false;
        this.components = {};
        this.isOnline = navigator.onLine;
        this.updateInterval = null;
    }

    // Initialize the dashboard
    async init() {
        if (this.initialized) return;

        try {
            console.log('🚀 Initializing NPB Dashboard...');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize components in order
            await this.initializeComponents();
            
            // Set up auto-update
            this.startGlobalUpdates();
            
            // Update status indicators
            this.updateStatusIndicators();
            
            this.initialized = true;
            console.log('✅ NPB Dashboard initialized successfully');
            
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.showGlobalError('대시보드 초기화 중 오류가 발생했습니다.');
        }
    }

    // Set up global event listeners
    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnlineStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOnlineStatusChange(false);
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update active nav link
                    this.updateActiveNavLink(link);
                }
            });
        });

        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showGlobalError('예기치 못한 오류가 발생했습니다.');
        });

        // Global unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.showGlobalError('데이터 처리 중 오류가 발생했습니다.');
        });

        // Refresh button if exists
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshAllData());
        }

        // Settings button if exists
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
    }

    // Initialize all components
    async initializeComponents() {
        const initPromises = [];

        // Initialize standings table
        if (typeof standingsTable !== 'undefined') {
            initPromises.push(this.initComponent('standings', () => standingsTable.init()));
        }

        // Initialize magic numbers (when available)
        if (typeof magicNumbers !== 'undefined') {
            initPromises.push(this.initComponent('magicNumbers', () => magicNumbers.init()));
        }

        // Initialize head-to-head matrix (when available) 
        if (typeof headToHeadMatrix !== 'undefined') {
            initPromises.push(this.initComponent('headToHead', () => headToHeadMatrix.init()));
        }

        // Initialize charts (when available)
        if (typeof charts !== 'undefined') {
            initPromises.push(this.initComponent('charts', () => charts.init()));
        }

        // Wait for all components to initialize
        const results = await Promise.allSettled(initPromises);
        
        // Log initialization results
        results.forEach((result, index) => {
            const componentName = Object.keys(this.components)[index];
            if (result.status === 'rejected') {
                console.error(`Failed to initialize ${componentName}:`, result.reason);
            } else {
                console.log(`✅ ${componentName} initialized`);
            }
        });
    }

    // Initialize individual component with error handling
    async initComponent(name, initFunction) {
        try {
            await initFunction();
            this.components[name] = { status: 'initialized', lastUpdate: new Date() };
        } catch (error) {
            this.components[name] = { status: 'error', error: error.message };
            throw error;
        }
    }

    // Handle online/offline status changes
    handleOnlineStatusChange(isOnline) {
        const statusIndicator = document.getElementById('connection-status');
        
        if (statusIndicator) {
            if (isOnline) {
                statusIndicator.className = 'badge bg-success';
                statusIndicator.textContent = '온라인';
                
                // Refresh data when coming back online
                this.refreshAllData();
            } else {
                statusIndicator.className = 'badge bg-danger';
                statusIndicator.textContent = '오프라인';
            }
        }

        // Show toast notification
        const message = isOnline ? '온라인 상태가 복구되었습니다.' : '오프라인 상태입니다.';
        const type = isOnline ? 'success' : 'warning';
        this.showToast(message, type);
    }

    // Update active navigation link
    updateActiveNavLink(activeLink) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked link
        activeLink.classList.add('active');
    }

    // Start global update timer
    startGlobalUpdates() {
        this.stopGlobalUpdates(); // Clear any existing timer
        
        this.updateInterval = setInterval(() => {
            if (this.isOnline) {
                this.updateStatusIndicators();
                
                // Refresh standings every 5 minutes
                if (this.components.standings && this.components.standings.status === 'initialized') {
                    const lastUpdate = new Date(this.components.standings.lastUpdate);
                    const now = new Date();
                    if (now - lastUpdate > 5 * 60 * 1000) { // 5 minutes
                        this.refreshStandings();
                    }
                }
            }
        }, 60000); // Check every minute
    }

    // Stop global update timer
    stopGlobalUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Update status indicators
    async updateStatusIndicators() {
        // Update current date
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
            const now = new Date();
            const dateString = now.toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric'
            });
            currentDateElement.textContent = dateString;
        }

        // Update season progress
        const progressElement = document.getElementById('season-progress');
        if (progressElement) {
            const progress = this.calculateSeasonProgress();
            progressElement.textContent = `${progress}%`;
        }

        // Check API health
        try {
            const isHealthy = await apiClient.healthCheck();
            const apiStatus = document.getElementById('api-status');
            if (apiStatus) {
                apiStatus.className = isHealthy ? 'badge bg-success' : 'badge bg-danger';
                apiStatus.textContent = isHealthy ? '정상' : '오류';
            }
        } catch (error) {
            console.error('Health check failed:', error);
        }
    }

    // Calculate season progress percentage
    calculateSeasonProgress() {
        const now = new Date();
        const seasonStart = new Date(CONFIG.SEASON.START_DATE);
        const seasonEnd = new Date(CONFIG.SEASON.END_DATE);
        
        if (now < seasonStart) return 0;
        if (now > seasonEnd) return 100;
        
        const totalDuration = seasonEnd - seasonStart;
        const elapsed = now - seasonStart;
        
        return Math.round((elapsed / totalDuration) * 100);
    }

    // Refresh all data
    async refreshAllData() {
        console.log('🔄 Refreshing all data...');
        
        const refreshPromises = [];
        
        // Refresh standings
        if (typeof standingsTable !== 'undefined') {
            refreshPromises.push(standingsTable.refresh());
        }

        // Refresh other components as they become available
        if (typeof magicNumbers !== 'undefined') {
            refreshPromises.push(magicNumbers.refresh());
        }

        if (typeof headToHeadMatrix !== 'undefined') {
            refreshPromises.push(headToHeadMatrix.refresh());
        }

        try {
            await Promise.all(refreshPromises);
            this.showToast('모든 데이터가 업데이트되었습니다.', 'success');
        } catch (error) {
            console.error('Data refresh failed:', error);
            this.showToast('일부 데이터 업데이트에 실패했습니다.', 'warning');
        }
    }

    // Refresh only standings
    async refreshStandings() {
        if (typeof standingsTable !== 'undefined') {
            try {
                await standingsTable.refresh();
                this.components.standings.lastUpdate = new Date();
            } catch (error) {
                console.error('Standings refresh failed:', error);
            }
        }
    }

    // Show global error message
    showGlobalError(message) {
        // Show error in modal if available
        const errorModal = document.getElementById('errorModal');
        if (errorModal) {
            const messageElement = document.getElementById('error-message');
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            const modal = new bootstrap.Modal(errorModal);
            modal.show();
        } else {
            // Fallback to alert
            alert(message);
        }
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 3000) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast position-fixed top-0 end-0 m-3 bg-${type} text-white`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-body d-flex align-items-center">
                <i class="bi bi-${this.getToastIcon(type)} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close btn-close-white ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(toast);

        // Show toast with animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto-remove toast
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    // Get appropriate icon for toast type
    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'danger': case 'error': return 'exclamation-triangle';
            case 'warning': return 'exclamation-triangle';
            case 'info': default: return 'info-circle';
        }
    }

    // Show settings modal (placeholder for future implementation)
    showSettings() {
        console.log('Settings modal would open here');
        this.showToast('설정 기능은 곧 제공될 예정입니다.', 'info');
    }

    // Get application status
    getStatus() {
        return {
            initialized: this.initialized,
            isOnline: this.isOnline,
            components: this.components,
            uptime: this.initialized ? Date.now() - this.initTime : 0
        };
    }

    // Cleanup method
    destroy() {
        this.stopGlobalUpdates();
        
        // Destroy all components
        Object.values(this.components).forEach(component => {
            if (component.destroy && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        this.components = {};
        this.initialized = false;
    }
}

// Create global dashboard instance
const dashboard = new NPBDashboard();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => dashboard.init());
} else {
    // DOM is already loaded
    dashboard.init();
}

// Make dashboard globally available
window.dashboard = dashboard;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NPBDashboard;
}