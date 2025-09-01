module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // 에러 레벨 규칙
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-unused-vars': 'error',
        'no-undef': 'error',
        'no-unreachable': 'error',
        'no-duplicate-keys': 'error',
        
        // 코드 스타일 규칙
        'semi': ['error', 'always'],
        'quotes': ['error', 'single', { avoidEscape: true }],
        'comma-dangle': ['error', 'never'],
        'indent': ['error', 4],
        'no-trailing-spaces': 'error',
        'eol-last': 'error',
        
        // 복잡도 제한
        'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
        'max-params': ['error', 4],
        'max-nested-callbacks': ['error', 3],
        'complexity': ['error', 10],
        'max-depth': ['error', 4],
        
        // 보안 관련
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',
        
        // 모범 사례
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-arrow-callback': 'warn',
        'arrow-spacing': 'error',
        'no-duplicate-imports': 'error',
        
        // 함수 관련
        'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
        'no-inner-declarations': 'error',
        
        // 객체/배열 관련
        'no-array-constructor': 'error',
        'no-new-object': 'error',
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never'],
        
        // 비교 연산자
        'eqeqeq': ['error', 'always'],
        'no-eq-null': 'error',
        
        // 공백 관련
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],
        'space-infix-ops': 'error',
        'keyword-spacing': 'error',
        
        // 주석 관련
        'spaced-comment': ['error', 'always', {
            line: { markers: ['/'], exceptions: ['-', '+'] },
            block: { markers: ['*'], exceptions: ['*'], balanced: true }
        }]
    },
    
    overrides: [
        // 테스트 파일 특별 규칙
        {
            files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
            rules: {
                'no-console': 'off',
                'max-lines': 'off'
            }
        },
        
        // 크롤러 파일 특별 규칙 (Python과 혼용)
        {
            files: ['crawler/**/*.js'],
            rules: {
                'no-console': 'off'
            }
        }
    ],
    
    globals: {
        // 브라우저 전역 변수
        'Chart': 'readonly',
        'bootstrap': 'readonly',
        
        // NPB Dashboard 전역 변수
        'NPBDashboard': 'writable',
        'NPBConfig': 'readonly'
    }
};