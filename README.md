# NPB Dashboard

일본 프로야구(NPB) 데이터 수집 및 분석 시스템

## 📋 프로젝트 구조

```
npb/
├── crawler/                # 데이터 수집 시스템
│   ├── npb_crawler.py     # 메인 크롤러 (결과 + 예정)
│   ├── config.py          # 설정 파일
│   ├── utils.py           # 유틸리티
│   ├── cleanup.py         # 파일 정리
│   ├── logs/              # 크롤링 로그
│   └── venv/              # Python 가상환경
├── api/            # FastAPI 백엔드
│   ├── server.py   # API 서버
│   ├── models/     # 데이터 모델
│   ├── routes/     # API 라우트
│   ├── utils/      # 유틸리티 (매직넘버 등)
│   └── venv/       # Python 가상환경
├── web/            # Next.js 프론트엔드
│   ├── app/        # App Router 페이지
│   ├── components/ # React 컴포넌트
│   └── lib/        # 유틸리티
├── index.html      # 초미니멀 NPB 대시보드 (GitHub Pages + 로컬)\n│   └── index.html  # 고급 프런트엔드 (차트, 다크모드)\n├── index.html      # GitHub Pages 메인 (고급 차트, 다크모드)\n├── data/           # 정적 JSON 데이터\n├── docs/           # GitHub Pages 백업
│   ├── index.html  # GitHub Pages 배포용\n│   └── data/       # 정적 JSON 데이터
├── scripts/                # 자동화 스크립트
│   ├── automation.py      # 일일 자동 크롤링
│   └── data_manager.py    # 데이터 관리
├── .github/workflows/     # GitHub Actions
│   └── npb-crawler.yml # 자동 크롤링
├── run_api.sh      # API 서버 실행
├── run_web.sh      # Next.js 실행
├── run_html.sh     # HTML 버전 실행
└── README.md
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
cd crawler
./setup.sh
```

### 2. PostgreSQL 데이터베이스 설정
```bash
createdb npb_dashboard_dev
```

### 3. 환경변수 설정
```bash
cp .env.example .env
# DB 정보를 .env 파일에 입력
```

### 4. 크롤러 실행
```bash
cd crawler
source venv/bin/activate
python npb_crawler.py --test    # 테스트 (3일)
python npb_crawler.py 7         # 7일치 크롤링
```

## 🤖 자동화된 크롤링

### GitHub Actions
- **자동 실행**: 매일 JST 16:30 ~ 23:30까지 30분마다 (총 15회)
- **수동 실행**: Actions 탭에서 언제든지 실행 가능

### 필요한 Secrets 설정
GitHub 저장소 Settings > Secrets에서 설정:
```
DB_HOST: 데이터베이스 호스트
DB_PORT: 포트 (기본: 5432)
DB_NAME: 데이터베이스 이름
DB_USER: 사용자명
DB_PASSWORD: 비밀번호
```

## 📊 수집 데이터

- **경기 결과**: 일별 NPB 경기 결과 (753경기 수집 완료)
- **이닝별 득점**: 각 이닝별 득점 상세 정보 (JSON 형태)
- **순위표**: 경기 결과 기반 자동 계산
- **특수 경기**: 연장전, 무승부, 취소 경기 처리

## 🗄️ 데이터베이스 구조

### teams 테이블
- 12개 NPB 팀 정보 (센트럴/퍼시픽 리그)

### games 테이블
- 경기 결과 및 세부 정보
- 이닝별 득점 (JSONB)
- 연장전, 무승부, 경기 상태

### standings 테이블
- 시즌별 팀 순위
- 승률, 게임차, 매직넘버

### crawl_logs 테이블
- 크롤링 활동 로그
- 성공/실패 기록

## 🔗 데이터 소스

**니칸스포츠** (https://www.nikkansports.com)
- 안정적인 URL 패턴
- 일관된 데이터 구조
- 실시간 업데이트
- NPB 12개 팀 전체 지원

## 🚀 성능 개선 결과

- **수집 경기수**: 169경기 → **753경기** (4.5배 증가)
- **파싱 성공률**: 16.7% → **100%** (하루 1경기 → 6경기 모두)
- **팀명 변환**: 실패 → **100% 성공** (NPB 12개 팀)
- **데이터 완전성**: 기본 정보 → **이닝별 세부 정보** 포함\n- **프런트엔드 고도화**: 기본 HTML → **Chart.js + 다크모드 + 모바일 최적화**\n- **데이터 시각화**: 텍스트 → **다중 차트 타입 (막대/선/레이더)**\n- **사용자 경험**: 정적 → **인터랙티브 애니메이션 + 실시간 전환**

## 📝 사용법

### 수동 실행
```bash
# 테스트 크롤링 (3일)
python npb_crawler.py --test

# 특정 일수 크롤링
python npb_crawler.py 7

# 전체 시즌 크롤링
python npb_crawler.py --season
```

### 로그 확인
```bash
# 로컬 실행시 로그 확인
tail -f crawler/logs/crawler_YYYYMMDD.log
```

## 🔍 모니터링

### 로그 파일
- `crawler/logs/crawler_YYYYMMDD.log`: 일별 크롤링 로그

### GitHub Actions 로그
- Actions 탭에서 실행 결과 확인
- 실패시 아티팩트로 로그 다운로드 가능

## 🔌 API 서버 (NEW!)

### FastAPI 백엔드 실행
```bash
./run_api.sh
```

### API 엔드포인트
- **메인 대시보드**: `GET /dashboard` - 오늘 경기 + 간략한 순위표
- **순위표**: `GET /standings` - 전체 순위표 및 매직넘버
- **매직넘버**: `GET /standings/magic-numbers` - 우승/탈락 시나리오 
- **경기 결과**: `GET /games` - 경기 결과 조회 (날짜/팀 필터)
- **팀 상세**: `GET /teams/{team_id}` - 팀별 상세 통계
- **상대전적**: `GET /teams/{team_id}/vs/{opponent_id}` - 팀간 상대전적

### API 문서
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🌐 프론트엔드 실행

### Option 1: Next.js (완전한 React 앱)
```bash
./run_web.sh
# http://localhost:3000
```

### Option 2: 고급 HTML (차트, 다크모드 포함)
```bash
./run_html.sh
# 브라우저에서 html/index.html 열림\n# 📊 Chart.js 차트, 🌙 다크모드, 📱 모바일 최적화
```

### Option 3: GitHub Pages (정적 배포)
```bash
# 1. 정적 데이터 생성
python scripts/generate_static_data.py

# 2. GitHub에 푸시하고 Pages 활성화
# 3. https://username.github.io/npb 접속
```

### 주요 차이점
- **Next.js**: 완전한 SPA, 라우팅, 최적화
- **고급 HTML**: 차트, 애니메이션, 다크모드, 로컬 실행용  
- **GitHub Pages**: 서버 불필요, 글로벌 배포

## 🌐 GitHub Pages 배포 설정

### 1. Repository Settings 
- Settings > Pages > Source: "GitHub Actions"

### 2. 자동 배포 워크플로우
- 크롤러 실행 → 데이터 생성 → GitHub Pages 자동 배포
- `.github/workflows/generate-static-data.yml` 

### 3. 배포 URL
- `https://yourusername.github.io/npb`

## 📈 다음 단계

1. **데이터 시각화** - 차트 및 그래프 ✨  
2. **알림 시스템** - 경기 결과 알림
3. **모바일 앱** - React Native/Flutter
4. **선수 통계** - 개인 성적 추가

## 📝 라이선스

MIT License