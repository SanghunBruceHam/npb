const path = require('path');
const fs = require('fs');

/**
 * 환경변수 기반 설정 관리
 * .env 파일과 시스템 환경변수를 통합 관리
 */
class EnvironmentManager {
    constructor() {
        this.loadEnvFile();
    }

    /**
     * .env 파일을 로드합니다 (dotenv 없이 구현)
     */
    loadEnvFile() {
        const envPath = path.join(process.cwd(), '.env');
        
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const lines = envContent.split('\n');
                
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine && !trimmedLine.startsWith('#')) {
                        const [key, ...valueParts] = trimmedLine.split('=');
                        if (key && valueParts.length > 0) {
                            const value = valueParts.join('=').trim();
                            // 시스템 환경변수가 우선순위를 가짐
                            if (!process.env[key]) {
                                process.env[key] = value;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ .env 파일 로드 실패:', error.message);
            }
        }
    }

    /**
     * 환경변수 값을 가져옵니다
     */
    get(key, defaultValue = null) {
        return process.env[key] || defaultValue;
    }

    /**
     * Boolean 환경변수를 가져옵니다
     */
    getBoolean(key, defaultValue = false) {
        const value = this.get(key);
        if (!value) return defaultValue;
        
        const lowerValue = value.toLowerCase();
        return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
    }

    /**
     * 숫자 환경변수를 가져옵니다
     */
    getNumber(key, defaultValue = 0) {
        const value = this.get(key);
        if (!value) return defaultValue;
        
        const num = parseInt(value, 10);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * 현재 환경을 확인합니다
     */
    isProduction() {
        return this.get('NODE_ENV') === 'production';
    }

    isDevelopment() {
        return this.get('NODE_ENV') === 'development' || !this.get('NODE_ENV');
    }

    isGitHubActions() {
        return this.getBoolean('GITHUB_ACTIONS');
    }

    /**
     * 프로젝트 관련 경로 설정
     */
    getProjectRoot() {
        // 1. 환경변수 우선
        const envRoot = this.get('KBO_PROJECT_ROOT');
        if (envRoot && fs.existsSync(envRoot)) {
            return envRoot;
        }
        
        // 2. GitHub Actions 환경
        if (this.isGitHubActions()) {
            const workspace = this.get('GITHUB_WORKSPACE');
            if (workspace) return workspace;
        }
        
        // 3. 기본값 - package.json 기준 자동 감지
        return null; // PathManager가 자동 감지
    }

    getDataDir() {
        const customDir = this.get('KBO_DATA_DIR');
        if (customDir && fs.existsSync(customDir)) {
            return customDir;
        }
        return null; // PathManager 기본 경로 사용
    }

    /**
     * 크롤링 설정
     */
    getCrawlingConfig() {
        return {
            delay: this.getNumber('KBO_CRAWLING_DELAY', 2),
            timeout: this.getNumber('KBO_CRAWLING_TIMEOUT', 30),
            retries: this.getNumber('KBO_CRAWLING_RETRIES', 3)
        };
    }

    /**
     * 로그 설정
     */
    getLogLevel() {
        return this.get('KBO_LOG_LEVEL', 'INFO').toUpperCase();
    }

    /**
     * 플랫폼 정보
     */
    getPlatform() {
        if (this.isGitHubActions()) {
            return this.get('RUNNER_OS', process.platform);
        }
        return process.platform;
    }

    /**
     * 환경 정보 출력 (디버깅용)
     */
    printEnvironment() {
        console.log('🌍 Environment Configuration:');
        console.log(`  NODE_ENV: ${this.get('NODE_ENV', 'not set')}`);
        console.log(`  Platform: ${this.getPlatform()}`);
        console.log(`  GitHub Actions: ${this.isGitHubActions()}`);
        console.log(`  Project Root: ${this.getProjectRoot() || 'auto-detect'}`);
        console.log(`  Data Dir: ${this.getDataDir() || 'default'}`);
        console.log(`  Log Level: ${this.getLogLevel()}`);
        
        const crawlingConfig = this.getCrawlingConfig();
        console.log(`  Crawling Config:`);
        console.log(`    - Delay: ${crawlingConfig.delay}s`);
        console.log(`    - Timeout: ${crawlingConfig.timeout}s`);
        console.log(`    - Retries: ${crawlingConfig.retries}`);
    }
}

// 싱글톤 인스턴스로 export
module.exports = new EnvironmentManager();