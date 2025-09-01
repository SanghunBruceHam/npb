# 🚀 NPB Dashboard - 시작 가이드

## 📋 프로젝트 개요

NPB Dashboard는 일본프로야구(NPB) 2025시즌을 위한 종합 데이터 분석 플랫폼입니다. KBO Dashboard를 모델로 하여 NPB만의 특성을 반영한 실시간 야구 통계 서비스를 제공합니다.

## 🏗️ 프로젝트 구조

```
npb-dashboard/
├── 📄 README.md                 # 프로젝트 개요
├── 📄 RULES.md                  # 개발 규칙 (필수 숙지)
├── 📄 GETTING_STARTED.md        # 시작 가이드
├── 📄 package.json              # Node.js 프로젝트 설정
├── 📄 .env.example              # 환경변수 템플릿
├── 📄 .gitignore                # Git 무시 파일 목록
├── 📄 .eslintrc.js              # JavaScript 린팅 규칙
├── 📄 .prettierrc               # 코드 포맷팅 규칙
├── 📄 jest.config.js            # 테스트 설정
│
├── 📁 docs/                     # 프로젝트 문서
│   ├── FUNCTIONAL_REQUIREMENTS.md
│   ├── TECHNICAL_SPECIFICATION.md
│   └── api/                     # API 문서
│
├── 📁 server/                   # Backend (Node.js + Express)
│   ├── index.js                 # 서버 엔트리포인트
│   ├── controllers/             # API 컨트롤러
│   ├── models/                  # 데이터 모델
│   ├── routes/                  # API 라우트
│   ├── middleware/              # Express 미들웨어
│   ├── services/                # 비즈니스 로직
│   ├── utils/                   # 유틸리티 함수
│   └── database/                # DB 연결 및 마이그레이션
│
├── 📁 frontend/                 # Frontend (HTML/CSS/JS)
│   ├── index.html               # 메인 페이지
│   ├── css/                     # 스타일시트
│   ├── js/                      # JavaScript 파일
│   ├── assets/                  # 이미지, 아이콘 등
│   ├── components/              # 재사용 컴포넌트
│   ├── pages/                   # 페이지별 파일
│   └── dist/                    # 빌드 결과물
│
├── 📁 crawler/                  # Data Crawler (Python)
│   ├── main_crawler.py          # 메인 크롤러
│   ├── scripts/                 # 크롤링 스크립트
│   ├── config/                  # 크롤러 설정
│   ├── data/                    # 임시 데이터 저장
│   └── tests/                   # 크롤러 테스트
│
├── 📁 database/                 # Database Schema & Scripts
│   ├── schema.sql               # 데이터베이스 스키마
│   ├── migrations/              # DB 마이그레이션
│   └── seeds/                   # 초기 데이터
│
├── 📁 tests/                    # 테스트 파일
│   ├── setup.js                 # 테스트 환경 설정
│   ├── integration/             # 통합 테스트
│   └── e2e/                     # E2E 테스트
│
└── 📁 logs/                     # 로그 파일 (자동 생성)
```

---

## ⚙️ 개발 환경 설정

### 1. 필수 요구사항

#### 시스템 요구사항
- **Node.js**: 18.0.0 이상
- **npm**: 9.0.0 이상
- **Python**: 3.9 이상
- **PostgreSQL**: 15.0 이상
- **Redis**: 7.0 이상
- **Git**: 2.30 이상

#### 권장 IDE
- **Visual Studio Code** (권장)
- **WebStorm** (선택사항)

### 2. 환경 설정 단계

#### 2.1 프로젝트 클론 및 의존성 설치

```bash
# 1. 프로젝트 클론
git clone https://github.com/npb-dashboard/npb-dashboard.git
cd npb-dashboard

# 2. Node.js 의존성 설치
npm install

# 3. Python 의존성 설치
cd crawler
pip install -r requirements.txt
cd ..
```

#### 2.2 환경변수 설정

```bash
# 1. 환경변수 파일 복사
cp .env.example .env

# 2. .env 파일 편집 (필수!)
# - 데이터베이스 연결 정보
# - API 키 및 비밀키
# - 외부 서비스 설정
```

#### 2.3 데이터베이스 설정

```bash
# 1. PostgreSQL 데이터베이스 생성
psql -U postgres -c "CREATE DATABASE npb_dashboard_dev;"
psql -U postgres -c "CREATE DATABASE npb_dashboard_test;"

# 2. 데이터베이스 스키마 생성
psql -U postgres -d npb_dashboard_dev -f database/schema.sql
psql -U postgres -d npb_dashboard_test -f database/schema.sql

# 3. 초기 데이터 삽입 (이미 schema.sql에 포함됨)
```

#### 2.4 Redis 설정

```bash
# Redis 서버 시작 (macOS with Homebrew)
brew services start redis

# 또는 직접 실행
redis-server

# 연결 테스트
redis-cli ping
# 응답: PONG
```

---

## 🎮 개발 서버 실행

### 개발 모드로 실행

```bash
# 1. Backend 서버 시작 (개발 모드)
npm run dev
# 서버 주소: http://localhost:3000

# 2. Frontend 개발 서버 (별도 터미널)
# 간단한 HTTP 서버로 frontend 디렉토리 서빙
cd frontend
python -m http.server 8080
# 프론트엔드 주소: http://localhost:8080

# 3. 데이터 크롤러 실행 (별도 터미널)
npm run crawler:start
```

### 운영 모드로 실행

```bash
# 1. 프로젝트 빌드
npm run build

# 2. 운영 서버 시작
npm start
```

---

## 🧪 테스트 실행

### 단위 테스트

```bash
# 전체 테스트 실행
npm test

# Backend 테스트만 실행
npm run test:backend

# Frontend 테스트만 실행
npm run test:frontend

# 커버리지와 함께 테스트
npm run test:coverage
```

### E2E 테스트

```bash
# E2E 테스트 실행
npm run test:e2e

# 특정 브라우저로 E2E 테스트
npx playwright test --project=chromium
```

### 크롤러 테스트

```bash
# Python 크롤러 테스트
npm run crawler:test

# 또는 직접 실행
cd crawler
python -m pytest tests/
```

---

## 🔧 개발 도구 사용법

### 코드 품질 검사

```bash
# JavaScript 린팅
npm run lint

# CSS 린팅
npm run lint:css

# 코드 포맷팅
npm run format

# 자동 수정
npm run lint -- --fix
```

### 데이터베이스 관리

```bash
# 데이터베이스 마이그레이션 실행
npm run db:migrate

# 테스트 데이터 삽입
npm run db:seed

# 데이터베이스 연결 테스트
node -e "require('./server/database/connection').testConnection()"
```

---

## 📊 주요 기능 개발 가이드

### 1. 새로운 API 엔드포인트 추가

```bash
# 1. 라우트 파일 생성
# server/routes/new-feature.js

# 2. 컨트롤러 구현
# server/controllers/new-feature.js

# 3. 모델 정의 (필요시)
# server/models/new-feature.js

# 4. 테스트 작성
# tests/integration/new-feature.test.js
```

### 2. 새로운 크롤러 추가

```bash
# 1. 크롤러 스크립트 작성
# crawler/scripts/new_data_crawler.py

# 2. 설정 파일 업데이트
# crawler/config/crawler_config.py

# 3. 테스트 작성
# crawler/tests/test_new_crawler.py
```

### 3. 새로운 프론트엔드 컴포넌트 추가

```bash
# 1. 컴포넌트 파일 생성
# frontend/components/new-component.js

# 2. 스타일 파일 추가
# frontend/css/components/new-component.css

# 3. 메인 페이지에 통합
# frontend/index.html
```

---

## 🚨 중요 주의사항

### 필수 확인사항

1. **RULES.md 숙지**: 개발 전 반드시 읽어보세요
2. **환경 분리**: 개발/테스트/운영 환경 명확히 구분
3. **보안**: .env 파일을 절대 Git에 커밋하지 마세요
4. **테스트**: 모든 기능에 대한 테스트 작성 필수
5. **성능**: API 응답시간 500ms 이하 유지

### 금지사항

```markdown
❌ 절대 하지 말 것:
- .env 파일 Git 커밋
- 운영 데이터베이스 직접 수정
- 테스트 없이 코드 배포
- JSON 파일을 데이터베이스로 사용
- 모의 데이터를 운영환경에서 사용
```

---

## 🆘 문제 해결

### 자주 발생하는 문제

#### 1. 데이터베이스 연결 오류
```bash
# 데이터베이스 서비스 상태 확인
pg_isready -U postgres

# 연결 설정 확인
cat .env | grep DB_
```

#### 2. 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :3000
lsof -i :8080

# 프로세스 종료
kill -9 <PID>
```

#### 3. 의존성 관련 문제
```bash
# Node.js 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# Python 의존성 재설치
cd crawler
pip uninstall -r requirements.txt
pip install -r requirements.txt
```

#### 4. 크롤러 실행 오류
```bash
# 크롤러 로그 확인
tail -f logs/crawler.log

# 네트워크 연결 테스트
curl -I https://npb.jp
```

### 도움말 리소스

- **프로젝트 문서**: `/docs` 디렉토리
- **API 문서**: `http://localhost:3000/api/docs` (개발 서버 실행 후)
- **이슈 트래커**: GitHub Issues
- **개발팀 연락**: Slack #npb-dashboard

---

## 📈 개발 워크플로우

### 1. 기능 개발 프로세스

```bash
# 1. 새 브랜치 생성
git checkout -b feature/new-feature-name

# 2. 개발 진행
# - 코드 작성
# - 테스트 작성
# - 문서 업데이트

# 3. 코드 품질 검사
npm run lint
npm test

# 4. 커밋 및 푸시
git add .
git commit -m "feat: implement new feature"
git push origin feature/new-feature-name

# 5. Pull Request 생성
# GitHub에서 PR 생성 및 코드 리뷰 요청
```

### 2. 배포 프로세스

```bash
# 1. 빌드 테스트
npm run build

# 2. 전체 테스트 실행
npm test
npm run test:e2e

# 3. 배포 실행
npm run deploy
```

---

## 🎯 다음 단계

프로젝트 설정이 완료되었다면:

1. **RULES.md 숙지** - 개발 규칙 이해
2. **기능명세서 검토** - 구현할 기능 파악
3. **기본 API 구현** - 순위표 API부터 시작
4. **크롤러 개발** - NPB 데이터 수집
5. **프론트엔드 구현** - 사용자 인터페이스

### 추천 개발 순서

1. **Phase 1**: 데이터베이스 + 기본 API
2. **Phase 2**: 크롤러 + 데이터 수집
3. **Phase 3**: 프론트엔드 + 시각화
4. **Phase 4**: 고급 분석 기능
5. **Phase 5**: 최적화 + 배포

---

**행운을 빕니다! 🍀**

문제가 발생하면 언제든 팀에 문의하세요. 함께 훌륭한 NPB Dashboard를 만들어봅시다!