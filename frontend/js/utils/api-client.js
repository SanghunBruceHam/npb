// NPB Dashboard API Client
class NPBApiClient {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.cache = new Map();
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        
        // Set up online/offline event listeners
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Generic request method with retry logic
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = `${options.method || 'GET'}:${url}`;
        
        // Check cache first for GET requests
        if ((!options.method || options.method === 'GET') && this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < CONFIG.API.CACHE_DURATION.MEDIUM) {
                if (CONFIG.DEBUG.SHOW_CACHE_HITS) {
                    console.log('Cache hit for:', url);
                }
                return cachedData.data;
            } else {
                this.cache.delete(cacheKey);
            }
        }

        // If offline, add to queue
        if (!this.isOnline) {
            return new Promise((resolve, reject) => {
                this.requestQueue.push({ url, options, resolve, reject });
                reject(new Error('오프라인 상태입니다. 연결 후 다시 시도됩니다.'));
            });
        }

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            requestOptions.body = JSON.stringify(options.body);
        }

        let lastError;
        
        for (let attempt = 1; attempt <= CONFIG.API.RETRY.MAX_ATTEMPTS; attempt++) {
            try {
                if (CONFIG.DEBUG.SHOW_API_CALLS) {
                    console.log(`API Request (attempt ${attempt}):`, url, requestOptions);
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.UI.LOADING_TIMEOUT);
                
                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                // Cache successful GET requests
                if ((!options.method || options.method === 'GET') && data.success) {
                    this.cache.set(cacheKey, {
                        data: data,
                        timestamp: Date.now()
                    });
                }

                return data;

            } catch (error) {
                lastError = error;
                
                if (error.name === 'AbortError') {
                    throw new Error(CONFIG.ERRORS.TIMEOUT);
                }

                if (attempt < CONFIG.API.RETRY.MAX_ATTEMPTS) {
                    const delay = CONFIG.API.RETRY.DELAY * Math.pow(CONFIG.API.RETRY.BACKOFF_MULTIPLIER, attempt - 1);
                    await this.sleep(delay);
                } else {
                    console.error(`API request failed after ${attempt} attempts:`, error);
                }
            }
        }

        // Determine error type and throw appropriate message
        if (lastError.message.includes('Failed to fetch')) {
            throw new Error(CONFIG.ERRORS.NETWORK);
        } else if (lastError.message.includes('404')) {
            throw new Error(CONFIG.ERRORS.NOT_FOUND);
        } else if (lastError.message.includes('500')) {
            throw new Error(CONFIG.ERRORS.SERVER);
        } else {
            throw new Error(CONFIG.ERRORS.GENERIC);
        }
    }

    // Process queued requests when back online
    async processQueue() {
        while (this.requestQueue.length > 0) {
            const { url, options, resolve, reject } = this.requestQueue.shift();
            try {
                const result = await this.request(url.replace(this.baseURL, ''), options);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }
    }

    // Utility method for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Health check
    async healthCheck() {
        try {
            const response = await this.request(CONFIG.API.ENDPOINTS.HEALTH);
            return response.success;
        } catch (error) {
            return false;
        }
    }

    // Standings API methods
    async getStandings(league = null) {
        const endpoint = league ? `${CONFIG.API.ENDPOINTS.STANDINGS}/${league}` : CONFIG.API.ENDPOINTS.STANDINGS;
        return await this.request(endpoint);
    }

    async getTeamStanding(teamId) {
        return await this.request(`${CONFIG.API.ENDPOINTS.STANDINGS}/team/${teamId}`);
    }

    // Magic Numbers API methods
    async getMagicNumbers(league = null) {
        const endpoint = league ? `${CONFIG.API.ENDPOINTS.MAGIC_NUMBERS}/${league}` : CONFIG.API.ENDPOINTS.MAGIC_NUMBERS;
        return await this.request(endpoint);
    }

    async getTeamMagicNumbers(teamId) {
        return await this.request(`${CONFIG.API.ENDPOINTS.MAGIC_NUMBERS}/team/${teamId}`);
    }

    // Head-to-Head API methods
    async getHeadToHeadMatrix() {
        return await this.request(CONFIG.API.ENDPOINTS.HEAD_TO_HEAD);
    }

    async getTeamHeadToHead(teamId) {
        return await this.request(`${CONFIG.API.ENDPOINTS.HEAD_TO_HEAD}/${teamId}`);
    }

    async getDirectHeadToHead(teamAId, teamBId) {
        return await this.request(`${CONFIG.API.ENDPOINTS.HEAD_TO_HEAD}/${teamAId}/${teamBId}`);
    }

    // Teams API methods
    async getTeams(league = null) {
        const endpoint = league ? `${CONFIG.API.ENDPOINTS.TEAMS}/${league}` : CONFIG.API.ENDPOINTS.TEAMS;
        return await this.request(endpoint);
    }

    async getTeamDetail(teamId) {
        return await this.request(`${CONFIG.API.ENDPOINTS.TEAMS}/team/${teamId}`);
    }

    // Games API methods
    async getGames(filters = {}) {
        const params = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        });
        
        const queryString = params.toString();
        const endpoint = queryString ? `${CONFIG.API.ENDPOINTS.GAMES}?${queryString}` : CONFIG.API.ENDPOINTS.GAMES;
        
        return await this.request(endpoint);
    }

    async getTodayGames() {
        return await this.request(`${CONFIG.API.ENDPOINTS.GAMES}/today`);
    }

    async getGameDetail(gameId) {
        return await this.request(`${CONFIG.API.ENDPOINTS.GAMES}/${gameId}`);
    }

    async getSchedule(date) {
        return await this.request(`${CONFIG.API.ENDPOINTS.GAMES}/schedule/${date}`);
    }

    // Utility methods
    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }

    getCacheSize() {
        return this.cache.size;
    }

    getCacheKeys() {
        return Array.from(this.cache.keys());
    }

    // Format date for API calls
    formatDate(date) {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return date.toISOString().split('T')[0];
    }

    // Get current season year
    getCurrentSeason() {
        return CONFIG.SEASON.CURRENT;
    }
}

// Create singleton instance
const apiClient = new NPBApiClient();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NPBApiClient, apiClient };
}

// Make available globally
window.apiClient = apiClient;