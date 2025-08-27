# 🏆 KBO 매직넘버 프로젝트

> **2025 KBO 리그 실시간 매직넘버 & 통계 자동화 프로젝트**

## 📁 프로젝트 구조

```
kbo/
├── index.html                 # 🔗 magic-number/로 리다이렉트
├── robots.txt                 # 🕷️ 검색엔진 크롤링 규칙
├── sitemap.xml               # 🗺️ 사이트맵
├── rss.xml                   # 📡 RSS 피드
│
├── magic-number/             # 🎯 메인 웹사이트 (완전 독립형)
│   ├── index.html           # 매직넘버 계산기 웹사이트
│   ├── js/                  # 모든 JavaScript (백엔드 + 프론트엔드)
│   │   ├── process-season-data.js    # 메인 데이터 처리
│   │   ├── fix-encoding.js          # 인코딩 수정
│   │   ├── script.js               # 웹 UI 스크립트
│   │   └── README.md               # 스크립트 가이드
│   ├── css/                 # 스타일시트
│   ├── data/                # 모든 데이터 파일
│   │   ├── 2025-season-data-clean.txt  # 경기 결과 원본
│   │   ├── service-data.json           # 통합 서비스 데이터
│   │   └── *.json                     # 기타 JSON 데이터
│   ├── images/              # 팀 로고
│   ├── icons/               # 앱 아이콘
│   ├── screenshots/         # 스크린샷
│   ├── crawlers/            # Python 데이터 수집 크롤러
│   ├── utils/               # 유틸리티 도구
│   └── archive/             # 매직넘버 관련 구버전 파일
│
├── archive/                  # 🗃️ 전체 프로젝트 아카이브
│   ├── old-scripts/         # 구버전 스크립트들
│   ├── automation-scripts/  # 자동화 스크립트들
│   └── backups/            # 백업 파일들
│
├── docs/                     # 📚 프로젝트 문서
├── node_modules/             # 📦 Node.js 의존성
└── package.json              # Node.js 프로젝트 설정
```

## 🚀 주요 기능

- **🎯 매직넘버 계산기**: KBO 10팀의 우승/플레이오프 매직넘버
- **📊 실시간 순위표**: 최신 경기 결과 반영
- **⚔️ 상대전적 분석**: 팀간 세부 전적 정보
- **🏆 매직넘버 매트릭스**: 나무위키 스타일 순위별 매트릭스

## 🌐 웹사이트 접속

- **메인 사이트**: [https://kbo-dashboard.co.kr/](https://kbo-dashboard.co.kr/)
- **매직넘버 계산기**: [https://kbo-dashboard.co.kr/magic-number/](https://kbo-dashboard.co.kr/magic-number/)

## ⚡ 빠른 시작

### 1. 데이터 업데이트
```bash
# 새 경기 결과를 magic-number/data/2025-season-data-clean.txt에 추가
echo "2025-08-07" >> magic-number/data/2025-season-data-clean.txt
echo "한화 5:3 삼성" >> magic-number/data/2025-season-data-clean.txt
```

### 2. 통계 처리 (Node.js)
```bash
cd magic-number/js/
node process-season-data.js      # 메인 데이터 처리
```

### 3. 데이터 수집 (Python)
```bash
cd magic-number/crawlers/
python kbo-python-working-crawler.py  # 자동 크롤링
```

### 4. 로컬 서버 실행
```bash
npm run serve  # http://localhost:8080/magic-number/
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend Scripts**: Node.js (fs, path 모듈)
- **Data Crawler**: Python (Selenium, BeautifulSoup)
- **Data Format**: JSON, TXT
- **PWA**: Progressive Web App 지원

## 📊 데이터 흐름

```
경기 결과 수집 → 데이터 정제 → 통계 계산 → 웹사이트 업데이트
    (Python)     (Node.js)    (Node.js)        (JSON)
```

## 🛠️ 개발자 가이드

### 폴더별 역할
- **magic-number/js/** - 모든 JavaScript (백엔드 데이터 처리 + 프론트엔드 UI)
- **magic-number/css/** - 웹사이트 스타일시트
- **magic-number/data/** - 모든 데이터 파일 (원본 + 가공된 JSON)
- **magic-number/images/** - 팀 로고 이미지
- **magic-number/crawlers/** - Python 크롤러

### 주요 스크립트
- `js/process-season-data.js` - 핵심 데이터 처리 엔진
- `js/script.js` - 웹페이지 UI 로직 (2,200+ 줄)

## 📚 상세 문서

- **[Magic Number 사용법](magic-number/README.md)** - 웹사이트 상세 가이드
- **[JavaScript 가이드](magic-number/js/README.md)** - 스크립트 사용법
- **[프로젝트 문서](docs/README.md)** - 전체 시스템 설명

## 🏗️ 아키텍처 특징

### 완전 독립적 구조
- **magic-number/** 폴더 하나로 완전한 웹애플리케이션
- 외부 의존성 최소화 (Node.js 내장 모듈만 사용)
- 단순한 폴더 구조로 유지보수 용이

### 통합된 JavaScript 관리
- 백엔드 데이터 처리 스크립트와 프론트엔드 UI 스크립트를 `js/` 폴더에 통합
- 일관된 경로 구조 (`../data/`, `../css/`)

## 📊 프로젝트 통계

- **총 JavaScript 파일**: 5개 (통합 관리)
- **총 데이터 파일**: 6개+ (JSON 형식)
- **웹페이지 크기**: 최적화된 분리 구조
- **지원 팀**: KBO 10개 팀 전체

## 🗃️ 아카이브 정책

- **magic-number/archive/** - 매직넘버 관련 구버전 파일
- **archive/** - 전체 프로젝트 관련 구파일 (자동화, 백업 등)

## 📝 라이센스

이 프로젝트는 KBO 데이터 분석 및 시각화를 위한 개인 프로젝트입니다.

---
**최종 업데이트**: 2025년 8월 9일  
**개발자**: SanghunBruceHam  
**웹사이트**: https://kbo-dashboard.co.kr/