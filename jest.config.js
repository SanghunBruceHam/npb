module.exports = {
    // 테스트 환경 설정
    testEnvironment: 'node',
    
    // 테스트 파일 패턴
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    
    // 테스트 제외 패턴
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '/frontend/dist/'
    ],
    
    // 커버리지 설정
    collectCoverageFrom: [
        'server/**/*.js',
        'frontend/js/**/*.js',
        '!server/index.js',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**',
        '!**/*.test.js',
        '!**/*.spec.js'
    ],
    
    // 커버리지 임계값
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80
        },
        // 핵심 비즈니스 로직은 더 높은 커버리지 요구
        'server/services/': {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90
        },
        'server/controllers/': {
            branches: 80,
            functions: 85,
            lines: 85,
            statements: 85
        }
    },
    
    // 커버리지 리포터
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json-summary'
    ],
    
    // 커버리지 디렉토리
    coverageDirectory: 'coverage',
    
    // 모듈 경로 매핑
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/server/$1',
        '^@frontend/(.*)$': '<rootDir>/frontend/$1',
        '^@utils/(.*)$': '<rootDir>/server/utils/$1',
        '^@services/(.*)$': '<rootDir>/server/services/$1',
        '^@models/(.*)$': '<rootDir>/server/models/$1'
    },
    
    // 테스트 설정 파일
    setupFilesAfterEnv: [
        '<rootDir>/tests/setup.js'
    ],
    
    // 환경 변수 설정
    testEnvironment: 'node',
    testEnvironmentOptions: {
        NODE_ENV: 'test'
    },
    
    // 글로벌 변수 설정
    globals: {
        'process.env.NODE_ENV': 'test',
        'process.env.DB_NAME': 'npb_dashboard_test'
    },
    
    // 테스트 실행 전 정리
    clearMocks: true,
    restoreMocks: true,
    
    // 타임아웃 설정
    testTimeout: 10000,
    
    // 병렬 실행 설정
    maxWorkers: '50%',
    
    // 에러 출력 설정
    verbose: true,
    
    // 실패한 테스트만 재실행
    onlyFailures: false,
    
    // 테스트 결과 리포터
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: './coverage',
            outputName: 'junit.xml'
        }]
    ],
    
    // 변환 설정 (ES6+ 모듈 사용 시)
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // 모듈 파일 확장자
    moduleFileExtensions: ['js', 'json'],
    
    // 테스트 순서 설정 (알파벳 순)
    testSequencer: 'jest-runner-groups',
    
    // 스냅샷 설정
    snapshotSerializers: []
};