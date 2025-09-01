# 🎯 NPB Dashboard 개발 규칙 (RULES)

> **중요**: 이 문서는 프로젝트 전반에 걸쳐 AI와 개발자가 준수해야 할 핵심 규칙을 정의합니다. 
> 모든 개발 작업 시 반드시 이 규칙을 준수해야 합니다.

---

## 🏗️ 1. 기술 스택 규칙 (TECHNOLOGY STACK RULES)

### 1.1 강제 기술 스택 (변경 금지)

#### Frontend
- **HTML5/CSS3/JavaScript (ES6+)** - 표준 웹 기술만 사용
- **Chart.js 4.4+** - 데이터 시각화 라이브러리
- **Bootstrap 5.3+** - UI 프레임워크
- **No Frameworks** - React, Vue, Angular 등 프레임워크 사용 금지

#### Backend  
- **Node.js 18+ with Express** - API 서버
- **Python 3.9+** - 데이터 크롤링 및 분석 전용
- **PostgreSQL 15+** - 메인 데이터베이스
- **Redis 7+** - 캐싱 및 세션 관리

#### Hosting & Infrastructure
- **Frontend**: Vercel 또는 Netlify
- **Backend**: Railway 또는 Render
- **Database**: PostgreSQL (managed service)
- **CDN**: Cloudflare

### 1.2 금지 기술

```markdown
❌ 절대 사용 금지:
- JSON 파일을 데이터베이스로 사용 (임시 개발용 제외)
- MongoDB, NoSQL (관계형 데이터가 필요함)
- jQuery (Vanilla JS 사용)
- 무거운 CSS 프레임워크 (Tailwind 등)
- TypeScript (단순함을 위해 JavaScript만 사용)
- 서버리스 함수 과다 사용
```

---

## 📝 2. 코딩 패턴 및 스타일 규칙 (CODING RULES)

### 2.1 핵심 원칙

#### A. 단순성 우선 (SIMPLICITY FIRST)
```javascript
// ✅ 좋은 예: 단순하고 명확
function calculateWinPercentage(wins, losses, draws) {
    const totalGames = wins + losses + draws;
    return totalGames === 0 ? 0 : wins / (wins + losses);
}

// ❌ 나쁜 예: 불필요하게 복잡
const calculateWinPercentage = (wins, losses, draws) => 
    ((w, l, d) => (g => g === 0 ? 0 : w / (w + l))(w + l + d))(wins, losses, draws);
```

#### B. DRY 원칙 (Don't Repeat Yourself)
```javascript
// ✅ 매번 새로운 코드 작성 전에 기존 코드 확인 필수
// 기존 유틸리티 함수가 있는지 반드시 검사하고 재사용

// 예시: 기존 함수 재사용
const { formatDate, formatPercentage } = require('./utils/formatters');

// ❌ 중복 코드 작성 금지
function formatGameDate(date) { /* 중복 구현 */ }
```

### 2.2 파일 구조 규칙

#### A. 파일 크기 제한
```markdown
🚨 강제 규칙:
- JavaScript 파일: 최대 300줄
- CSS 파일: 최대 500줄  
- HTML 파일: 최대 200줄 (템플릿 제외)
- 초과 시 반드시 리팩토링 필요
```

#### B. 명명 규칙
```javascript
// 파일명: kebab-case
standings-table.js
magic-number-calculator.js
head-to-head-matrix.js

// 함수명: camelCase
calculateMagicNumber()
fetchStandingsData()
renderHeadToHeadMatrix()

// 클래스명: PascalCase
class StandingsTable {}
class MagicNumberCalculator {}

// 상수명: UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.npb-dashboard.com';
const MAX_RETRY_COUNT = 3;
```

### 2.3 코드 품질 규칙

#### A. 에러 처리 (필수)
```javascript
// ✅ 모든 비동기 함수에 에러 처리 필수
async function fetchStandings() {
    try {
        const response = await fetch('/api/standings');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch standings:', error);
        throw error; // 상위로 에러 전파
    }
}

// ❌ 에러 처리 없는 코드 금지
async function fetchStandings() {
    const response = await fetch('/api/standings');
    return await response.json(); // 에러 처리 없음 - 금지!
}
```

#### B. 주석 및 문서화
```javascript
// ✅ JSDoc 형식으로 함수 문서화 필수
/**
 * NPB 팀의 매직넘버를 계산합니다
 * @param {number} teamId - 팀 ID
 * @param {Object} standings - 현재 순위 데이터
 * @param {number} totalGames - 총 경기수 (143경기)
 * @returns {number|null} 매직넘버 (우승 불가능시 null)
 */
function calculateMagicNumber(teamId, standings, totalGames = 143) {
    // 구현...
}
```

---

## 🌍 3. 환경 관리 규칙 (ENVIRONMENT RULES)

### 3.1 환경 분리 (강제 규칙)

```markdown
📋 3개 환경 필수 분리:

🟢 Development (개발)
- Local 환경
- 실제 데이터 사용
- 모의 데이터 금지 (테스트 환경만 허용)

🟡 Test (테스트)  
- CI/CD 전용 환경
- 모의/스텁 데이터 허용
- 실제 API 호출 금지

🔴 Production (운영)
- 실제 서비스 환경
- 실제 데이터만 사용
- 절대 모의 데이터 사용 금지
```

### 3.2 데이터 처리 규칙

#### A. 실제 데이터 vs 모의 데이터
```javascript
// ✅ 환경별 데이터 처리 규칙
const CONFIG = {
    development: {
        useRealData: true,      // 실제 NPB 데이터 사용
        useMockData: false      // 모의 데이터 사용 금지
    },
    test: {
        useRealData: false,     // 외부 API 호출 금지
        useMockData: true       // 테스트용 모의 데이터만 허용
    },
    production: {
        useRealData: true,      // 실제 데이터만 사용
        useMockData: false      // 모의 데이터 절대 금지
    }
};

// 🚨 위반 시 즉시 코드 리젝션
if (process.env.NODE_ENV !== 'test' && useMockData) {
    throw new Error('Mock data is only allowed in test environment');
}
```

#### B. 환경별 설정
```javascript
// config/database.js
const config = {
    development: {
        host: 'localhost',
        port: 5432,
        database: 'npb_dev',
        // 실제 개발용 DB 연결
    },
    test: {
        host: 'localhost', 
        port: 5432,
        database: 'npb_test',
        // 격리된 테스트 DB
    },
    production: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        // 운영 DB (환경변수로만 접근)
    }
};
```

---

## 🔄 4. 워크플로우 규칙 (WORKFLOW RULES)

### 4.1 작업 범위 규칙

#### A. 요청된 작업에만 집중
```markdown
✅ 해야 할 것:
- 명시적으로 요청된 기능만 구현
- 요청된 버그만 수정
- 관련된 테스트만 작성

❌ 하지 말아야 할 것:
- 요청되지 않은 리팩토링
- 관련 없는 코드 변경
- 추가 기능 구현 (명시되지 않은 경우)
```

#### B. 버그 수정 시 규칙
```markdown
🚨 버그 수정 시 강제 규칙:

1. 기존 패턴 유지: 새로운 기술/패턴 도입 금지
2. 최소 변경: 버그 수정을 위한 최소한의 코드만 변경
3. 테스트 추가: 동일한 버그 재발 방지용 테스트 필수
4. 문서 업데이트: 변경사항 문서화

❌ 금지사항:
- 버그 수정을 핑계로 한 대규모 리팩토링
- 새로운 라이브러리/프레임워크 도입
- 코드 스타일 일괄 변경
```

### 4.2 테스트 규칙 (필수)

#### A. 테스트 커버리지
```markdown
🎯 필수 테스트 커버리지:

- 핵심 비즈니스 로직: 90% 이상
- API 엔드포인트: 100%
- 유틸리티 함수: 85% 이상
- UI 컴포넌트: 70% 이상 (E2E 테스트 포함)
```

#### B. 테스트 작성 규칙
```javascript
// ✅ 필수 테스트 패턴
describe('MagicNumberCalculator', () => {
    describe('calculateChampionshipMagicNumber', () => {
        test('should return correct magic number for leading team', () => {
            // Given
            const standings = mockStandingsData;
            const remainingGames = mockGameData;
            
            // When  
            const result = calculateChampionshipMagicNumber(1, standings, remainingGames);
            
            // Then
            expect(result).toBe(15);
        });
        
        test('should return null for eliminated team', () => {
            // 탈락 팀에 대한 테스트
        });
        
        test('should handle edge cases', () => {
            // 경계 조건 테스트
        });
    });
});
```

### 4.3 Git 규칙

#### A. 커밋 메시지 규칙
```markdown
📝 커밋 메시지 형식 (강제):

<type>: <subject>

<body>

Types:
- feat: 새로운 기능
- fix: 버그 수정  
- docs: 문서화
- style: 코드 포맷팅
- refactor: 리팩토링
- test: 테스트 추가/수정
- chore: 빌드/설정 변경

예시:
feat: implement magic number calculation for NPB teams

- Add calculateChampionshipMagicNumber function
- Support both Central and Pacific league calculations
- Include remaining games analysis
- Add comprehensive test suite
```

#### B. 브랜치 규칙
```markdown
🌳 브랜치 전략:

main (운영)
├── develop (개발)  
├── feature/feature-name (기능 개발)
├── fix/bug-description (버그 수정)
├── hotfix/urgent-fix (긴급 수정)
└── release/version-number (릴리즈)

규칙:
- main 직접 푸시 금지
- Pull Request 필수
- 코드 리뷰 승인 후 머지
- CI/CD 통과 필수
```

---

## 🔒 5. 안전성 규칙 (SAFETY RULES)

### 5.1 파일 보호 규칙

```markdown
🚨 절대 덮어쓰기 금지 파일:
- .env (모든 환경 설정 파일)
- package.json (의존성 정보)
- database 스키마 파일
- 운영 환경 설정 파일
- SSL 인증서 및 키 파일

⚠️ 수정 시 백업 필수:
- 기존 파일을 .bak 확장자로 백업
- 변경사항 문서화
- 롤백 계획 수립
```

### 5.2 보안 규칙

#### A. 민감 정보 처리
```javascript
// ✅ 환경변수 사용
const dbConfig = {
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    apiKey: process.env.NPB_API_KEY
};

// ❌ 하드코딩 금지
const dbConfig = {
    host: 'prod-db.example.com',
    password: 'supersecret123',  // 절대 금지!
    apiKey: 'api_key_12345'      // 절대 금지!
};
```

#### B. API 키 및 토큰 관리
```markdown
🔐 API 키 관리 규칙:

1. .env 파일에만 저장
2. Git에 절대 커밋 금지
3. 로그에 출력 금지
4. 프론트엔드에 노출 금지
5. 정기적 순환 (3개월마다)
```

---

## 📊 6. 성능 및 품질 규칙 (PERFORMANCE RULES)

### 6.1 성능 요구사항 (강제)

```markdown
⏱️ 성능 기준 (위반 시 배포 금지):

- API 응답시간: 500ms 이하
- 페이지 로드시간: 3초 이하
- 첫 번째 콘텐츠 표시: 1.5초 이하
- Database 쿼리: 100ms 이하
- 메모리 사용량: 512MB 이하 (Node.js)
```

### 6.2 코드 품질 규칙

#### A. ESLint 규칙 (필수)
```json
{
    "extends": ["eslint:recommended"],
    "rules": {
        "no-console": "warn",
        "no-unused-vars": "error",
        "no-undef": "error",
        "semi": ["error", "always"],
        "quotes": ["error", "single"],
        "max-lines": ["error", 300],
        "max-params": ["error", 4],
        "complexity": ["error", 10]
    }
}
```

#### B. 코드 리뷰 체크리스트
```markdown
✅ 코드 리뷰 필수 확인사항:

- [ ] 기능이 요구사항과 일치하는가?
- [ ] 테스트가 충분한가?
- [ ] 에러 처리가 적절한가?
- [ ] 성능 요구사항을 만족하는가?
- [ ] 보안 취약점이 없는가?
- [ ] 코딩 규칙을 준수하는가?
- [ ] 문서화가 충분한가?
```

---

## 🔧 7. 도구 및 설정 규칙 (TOOLS RULES)

### 7.1 필수 개발 도구

```markdown
🛠️ 필수 설치 도구:

개발 환경:
- Node.js 18+ (정확한 버전 고정)
- Python 3.9+
- PostgreSQL 15+
- Redis 7+
- Git 2.30+

Code Quality:
- ESLint (JavaScript 린팅)
- Prettier (코드 포맷팅)
- Husky (Git 훅)
- Jest (JavaScript 테스팅)
- Pytest (Python 테스팅)

Browser Testing:
- Chrome DevTools
- Firefox DevTools  
- Playwright (E2E 테스팅)
```

### 7.2 IDE 설정

#### A. VS Code 설정 (권장)
```json
// .vscode/settings.json
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "javascript.preferences.quoteStyle": "single",
    "typescript.preferences.quoteStyle": "single"
}
```

---

## 🚫 8. 금지사항 (FORBIDDEN PRACTICES)

### 8.1 절대 금지 행위

```markdown
🚨 프로젝트에서 절대 하지 말아야 할 것들:

코드 관련:
- ❌ 전역변수 사용 (const로 모듈화 필수)
- ❌ eval() 함수 사용
- ❌ innerHTML에 사용자 입력 직접 삽입
- ❌ setTimeout/setInterval로 무한 루프
- ❌ 동기적 파일 I/O (fs.readFileSync 등)
- ❌ 하드코딩된 URL, 비밀번호, API 키
- ❌ console.log 운영 환경 남김

데이터 관련:
- ❌ SQL Injection 가능한 쿼리
- ❌ JSON 파일을 데이터베이스로 사용 (개발/운영)
- ❌ 모의 데이터를 운영/개발 환경에서 사용
- ❌ 데이터 검증 없이 외부 API 데이터 저장
- ❌ 개인정보가 포함된 로그 출력

배포 관련:
- ❌ 운영 서버에 직접 파일 업로드
- ❌ 데이터베이스 직접 수동 수정
- ❌ 백업 없는 스키마 변경
- ❌ 테스트 생략하고 배포
```

### 8.2 코드 스멜 감지

```javascript
// ❌ 이런 코드 발견시 즉시 리팩토링 필요

// 1. 너무 긴 함수
function processGameData() {
    // ... 100줄 이상의 코드
    // 즉시 작은 함수들로 분리 필요
}

// 2. 깊은 중첩
if (condition1) {
    if (condition2) {
        if (condition3) {
            if (condition4) {
                // 4단계 이상 중첩 금지
            }
        }
    }
}

// 3. 매직 넘버
function calculateSomething(games) {
    return games * 0.67891; // 이 숫자가 뭘 의미하는가?
}
// ✅ 개선: const MAGIC_CONSTANT = 0.67891;
```

---

## 📋 9. 체크리스트 (CHECKLIST)

### 9.1 개발 시작 전 체크리스트

```markdown
🚀 새로운 기능 개발 전 필수 확인:

- [ ] 요구사항이 명확히 정의되었는가?
- [ ] 기존 코드에 유사한 기능이 있는가? (DRY 원칙)
- [ ] 어떤 환경에서 작업하는가? (dev/test/prod)
- [ ] 실제 데이터를 사용할 것인가, 모의 데이터인가?
- [ ] 성능 요구사항을 알고 있는가?
- [ ] 테스트 계획을 세웠는가?
- [ ] 보안 고려사항이 있는가?
```

### 9.2 코드 작성 후 체크리스트

```markdown
✅ 코드 완성 후 필수 점검:

기능성:
- [ ] 요구사항을 모두 만족하는가?
- [ ] 에러 케이스를 모두 처리했는가?
- [ ] 경계 조건을 테스트했는가?

품질:
- [ ] 함수가 300줄을 넘지 않는가?
- [ ] 중복 코드가 없는가?
- [ ] 변수명이 의미 있는가?
- [ ] 주석이 필요한 복잡한 로직에 주석을 달았는가?

성능:
- [ ] API 응답시간이 500ms 이하인가?
- [ ] 메모리 누수가 없는가?
- [ ] 불필요한 재렌더링이 없는가?

보안:
- [ ] 사용자 입력을 검증하는가?
- [ ] SQL Injection 위험이 없는가?
- [ ] 민감한 정보가 로그에 출력되지 않는가?

테스트:
- [ ] 단위 테스트를 작성했는가?
- [ ] 테스트 커버리지가 80% 이상인가?
- [ ] 모든 테스트가 통과하는가?
```

---

## 🎯 10. 규칙 위반 시 대응 (VIOLATION HANDLING)

### 10.1 위반 등급 분류

```markdown
🔴 Critical (즉시 작업 중단):
- 운영 데이터베이스 직접 수정
- 보안 취약점 도입
- .env 파일 Git 커밋
- 실제 서비스에 모의 데이터 사용

🟡 Major (당일 내 수정):
- 테스트 없는 코드 배포
- 성능 요구사항 위반
- API 응답시간 500ms 초과
- 300줄 초과 파일 생성

🟢 Minor (주간 내 개선):
- 코딩 스타일 위반
- 주석 부족
- 네이밍 규칙 위반
```

### 10.2 자동 검증 시스템

```javascript
// pre-commit 훅으로 자동 검증
module.exports = {
    '*.js': [
        'eslint --fix',
        'prettier --write',
        'jest --findRelatedTests --passWithNoTests'
    ],
    '*.{md,json}': [
        'prettier --write'
    ]
};
```

---

## 🔄 11. 규칙 업데이트 및 예외 처리

### 11.1 규칙 변경 프로세스

```markdown
📝 규칙 변경이 필요한 경우:

1. 개발팀 논의 (전체 동의 필요)
2. 변경 사유 문서화
3. 기존 코드 영향도 분석
4. 마이그레이션 계획 수립
5. 승인 후 규칙 업데이트
6. 팀원 교육 및 공지
```

### 11.2 예외 상황 처리

```markdown
⚠️ 규칙 예외가 허용되는 경우:

기술적 제약:
- 외부 라이브러리 제약으로 인한 불가피한 패턴
- 성능 최적화를 위한 특수 구현
- 레거시 시스템과의 호환성

비즈니스 요구:
- 긴급한 보안 패치
- 법적/규제 요구사항 대응
- 데이터 손실 방지를 위한 임시 조치

예외 처리 절차:
1. 예외 사유 명확히 문서화
2. 임시 해결책임을 코드에 명시
3. 향후 개선 계획 수립
4. 정기 검토를 통한 예외 해소
```

---

## 📚 12. 추가 리소스 및 참고사항

### 12.1 참고 문서

```markdown
📖 필수 참고 문서:
- NPB 공식 규정: https://npb.jp/
- PostgreSQL 성능 가이드
- Node.js 보안 모범 사례
- Web Performance 최적화 가이드
```

### 12.2 도움말 및 지원

```markdown
🆘 문제 해결 순서:
1. 이 RULES.md 문서 재확인
2. 기존 코드에서 유사 패턴 검색
3. 팀 내부 문서 검토
4. 개발팀 슬랙 채널 질문
5. 외부 리소스 참조 (Stack Overflow 등)
```

---

**⚠️ 중요 알림**
- 이 규칙은 프로젝트의 성공을 위한 필수 사항입니다
- 모든 개발자와 AI가 반드시 준수해야 합니다  
- 규칙 위반 시 코드 리뷰에서 즉시 지적됩니다
- 불분명한 부분이 있으면 즉시 팀에 문의하세요

**마지막 업데이트**: 2025-09-01
**승인**: NPB Dashboard 개발팀