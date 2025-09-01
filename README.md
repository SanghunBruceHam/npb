# 🏟️ NPB Dashboard - 일본프로야구 데이터 분석 플랫폼

## 📋 프로젝트 개요

NPB Dashboard는 일본프로야구(Nippon Professional Baseball) 2025시즌을 위한 종합 데이터 분석 플랫폼입니다. KBO Dashboard의 성공적인 모델을 기반으로, NPB만의 특성을 반영한 실시간 야구 통계 서비스를 제공합니다.

## 🎯 프로젝트 목표

### 핵심 가치
- **실시간성**: 매 경기 후 즉시 업데이트되는 데이터
- **깊이 있는 분석**: 16가지 다차원 분석 지표 제공
- **직관적 UI**: 복잡한 통계를 이해하기 쉽게 시각화
- **모바일 최적화**: 언제 어디서나 접근 가능한 반응형 디자인

### 대상 사용자
- NPB 팬 및 야구 애호가
- 스포츠 기자 및 해설자
- 데이터 분석가 및 연구자
- 판타지 베이스볼 플레이어

## 🏗️ 시스템 아키텍처

### Frontend
- **HTML5/CSS3/JavaScript (ES6+)**
- **Chart.js** - 데이터 시각화
- **Bootstrap 5** - 반응형 UI 프레임워크
- **Progressive Web App (PWA)** 지원

### Backend
- **Node.js/Express** - API 서버
- **Python** - 데이터 크롤링 및 분석
- **PostgreSQL** - 메인 데이터베이스
- **Redis** - 캐싱 및 세션 관리

### Data Pipeline
- **실시간 크롤링**: NPB 공식 사이트 데이터 수집
- **데이터 검증**: 무결성 검사 및 오류 수정
- **분석 엔진**: 매직넘버, 확률 계산 등

### Infrastructure
- **Vercel/Netlify** - Frontend 호스팅
- **Railway/Heroku** - Backend 호스팅
- **GitHub Actions** - CI/CD 파이프라인

## 📊 주요 기능

### 1. 실시간 순위표
- 센트럴/퍼시픽 리그별 현재 순위
- 승률, 게임차, 연승/연패 정보
- 플레이오프 진출 현황

### 2. 매직넘버 분석
- **우승 매직넘버**: 리그 우승까지 필요한 승수
- **CS 진출**: 클라이맥스 시리즈 진출 조건
- **시나리오 분석**: 다양한 경우의 수 계산
- **확률 매트릭스**: 팀별 우승/진출 확률

### 3. 성적 분석
- **일별/주간/월별** 성적 추이
- **홈/원정** 경기 성적 비교
- **상대전적** 매트릭스
- **클러치 상황** 분석

### 4. 고급 분석
- **피타고라스 승률**: 예상 승률 vs 실제 승률
- **추세 분석**: 팀별 폼 상승/하락 구간
- **잔여 경기**: 남은 일정과 난이도 분석

### 5. 시각화 도구
- **인터랙티브 차트**: 성적 추이 그래프
- **히트맵**: 팀간 상성 매트릭스
- **진행률 바**: 시즌 진행률 및 목표 달성률

## 🎨 UI/UX 디자인 가이드

### 디자인 원칙
- **미니멀리즘**: 정보 우선, 군더더기 제거
- **일관성**: 전 페이지 통일된 디자인 시스템
- **접근성**: WCAG 2.1 AA 준수
- **성능**: 3초 내 로딩 완료

### 색상 팔레트
```css
:root {
  --npb-primary: #003d82;     /* NPB 공식 블루 */
  --central-league: #e31837;   /* 센트럴 리그 레드 */
  --pacific-league: #1f4e79;   /* 퍼시픽 리그 블루 */
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
  --neutral: #6c757d;
}
```

### 타이포그래피
- **헤더**: Noto Sans JP (일본어), Noto Sans KR (한국어)
- **본문**: system-ui, -apple-system (시스템 최적화)
- **데이터**: SF Mono, Monaco (고정폭 폰트)

## 📱 반응형 브레이크포인트

```css
/* 모바일 */
@media (max-width: 768px) { }

/* 태블릿 */
@media (min-width: 769px) and (max-width: 1024px) { }

/* 데스크톱 */
@media (min-width: 1025px) { }

/* 대형 모니터 */
@media (min-width: 1440px) { }
```

## 🗂️ 프로젝트 구조

```
npb-dashboard/
├── 📁 frontend/                    # 프론트엔드 (HTML/CSS/JavaScript)
│   ├── index.html                  # 메인 페이지
│   ├── css/main.css               # 스타일시트
│   └── js/                        # JavaScript 모듈
│       ├── utils/                 # 유틸리티 (config, api-client)
│       ├── components/            # UI 컴포넌트
│       └── main.js               # 메인 애플리케이션
├── 📁 server/                      # 백엔드 API 서버
│   ├── index.js                   # Express 서버 엔트리포인트
│   ├── database/connection.js     # DB 연결 관리
│   └── routes/                    # API 라우트
│       ├── standings.js           # 순위표 API
│       ├── magic-numbers.js       # 매직넘버 API
│       ├── head-to-head.js        # 상대전적 API
│       ├── teams.js               # 팀 정보 API
│       └── games.js               # 경기 정보 API
├── 📁 database/                    # 데이터베이스
│   └── schema.sql                 # PostgreSQL 스키마
├── 📁 docs/                        # 프로젝트 문서
│   ├── PROJECT_CHARTER.md         # 프로젝트 헌장
│   ├── GROUND_RULES.md            # 개발 그라운드 룰
│   ├── DEVELOPMENT_ROADMAP.md     # 개발 로드맵
│   └── DETAILED_FEATURES.md       # 상세 기능 명세
├── 📁 logs/                        # 애플리케이션 로그
├── 📄 RULES.md                     # 기술적 개발 규칙
├── 📄 GETTING_STARTED.md           # 개발환경 설정 가이드
├── 📄 package.json                 # Node.js 프로젝트 설정
└── 📄 jest.config.js              # 테스트 설정
```

## 📚 문서 가이드

### 🎯 핵심 문서 (개발 시작 전 필수)
1. **PROJECT_CHARTER.md** - 프로젝트 목적, 범위, 예산 계획
2. **GROUND_RULES.md** - 리소스 낭비 방지를 위한 개발 원칙
3. **DEVELOPMENT_ROADMAP.md** - 우선순위 기반 16주 개발 계획
4. **GETTING_STARTED.md** - 개발환경 설정 단계별 가이드

### 📖 참조 문서
- **DETAILED_FEATURES.md** - 9개 영역 상세 기능 명세 (80+ 기능)
- **RULES.md** - 기술 스택 및 코딩 규칙
- **database/schema.sql** - NPB 12개 팀 데이터베이스 스키마

## 🚀 개발 단계

### Phase 1: 기반 구축 (2주)
- [ ] 프로젝트 설정 및 환경 구성
- [ ] 기본 UI 프레임워크 구축
- [ ] 데이터베이스 스키마 설계
- [ ] NPB 데이터 크롤러 개발

### Phase 2: 핵심 기능 (3주)
- [ ] 실시간 순위표 구현
- [ ] 매직넘버 계산 엔진 개발
- [ ] 기본 통계 분석 기능
- [ ] API 서버 구축

### Phase 3: 고급 분석 (2주)
- [ ] 상대전적 매트릭스
- [ ] 성적 추세 분석
- [ ] 확률 계산 시스템
- [ ] 데이터 시각화

### Phase 4: 최적화 및 배포 (1주)
- [ ] 성능 최적화
- [ ] 모바일 최적화
- [ ] CI/CD 파이프라인
- [ ] 프로덕션 배포

## 📈 성공 지표 (KPI)

### 사용자 지표
- **일간 활성 사용자(DAU)**: 목표 1,000명
- **페이지뷰**: 목표 월 100,000회
- **평균 세션 시간**: 목표 5분 이상
- **이탈률**: 목표 60% 이하

### 기술 지표
- **로딩 시간**: 3초 이내
- **업타임**: 99.9% 이상
- **데이터 업데이트**: 실시간 (경기 종료 후 10분 이내)
- **모바일 최적화 점수**: 90점 이상

## 🔐 보안 및 개인정보

- **HTTPS** 강제 적용
- **데이터 익명화** 처리
- **GDPR/CCPA** 준수
- **정기 보안 감사** 실시

---

**최종 업데이트**: 2025년 1월
**프로젝트 관리자**: Development Team
**라이선스**: MIT License