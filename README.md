# 🏆 NPB 매직넘버 프로젝트

> **2025 NPB 리그 실시간 매직넘버 & 클라이맥스 시리즈 분석 프로젝트**

## 📁 프로젝트 구조

```
npb/
├── index.html                 # 🔗 NPB 메인 페이지
├── robots.txt                 # 🕷️ 검색엔진 크롤링 규칙  
├── sitemap.xml               # 🗺️ NPB 사이트맵
├── rss.xml                   # 📡 NPB RSS 피드
├── NPB_PROJECT_DOCUMENTATION.md   # 📚 NPB 프로젝트 종합 문서
├── NPB_FUNCTIONAL_SPECIFICATION.md # 📋 NPB 기능 명세서
│
├── css/                     # 🎨 NPB 전용 스타일시트
│   └── npb-styles.css       # NPB 테마 및 리그별 디자인
│
├── js/                      # 💻 NPB 전용 JavaScript  
│   ├── npb-main.js                 # NPB 메인 UI 로직
│   ├── npb-process-season-data.js  # NPB 데이터 처리 엔진
│   ├── climax-series-calculator.js # 클라이맥스 시리즈 계산
│   ├── interleague-analyzer.js     # 교류전 분석  
│   ├── npb-weekly-analysis.js      # NPB 주간 분석
│   ├── npb-clutch-analysis.js      # NPB 클러치 분석
│   └── npb-head-to-head.js         # NPB 상대전적 (12x12)
│
├── data/                    # 📊 NPB 데이터 저장소
│   ├── 2025-npb-season.txt         # NPB 경기 결과 원본
│   ├── npb-service-data.json       # NPB 통합 서비스 데이터  
│   ├── central-league.json         # 센트럴 리그 순위
│   ├── pacific-league.json         # 퍼시픽 리그 순위
│   ├── climax-series-scenarios.json # 클라이맥스 시리즈 시나리오
│   ├── interleague-records.json    # 교류전 기록
│   └── npb-head-to-head.json       # NPB 상대전적 매트릭스
│
├── images/                  # 🖼️ NPB 팀 로고
│   ├── central/             # 센트럴 리그 팀 로고 (6팀)  
│   └── pacific/             # 퍼시픽 리그 팀 로고 (6팀)
│
├── crawlers/                # 🕷️ NPB 데이터 수집
│   ├── npb-main-crawler.py         # NPB 메인 크롤러
│   ├── yahoo-sports-crawler.py     # 야후 스포츠 크롤러  
│   └── npb-official-crawler.py     # NPB 공식 크롤러
│
├── docs/                    # 📚 NPB 문서
│   ├── npb-rules.md                # NPB 룰 설명
│   ├── climax-series.md            # 클라이맥스 시리즈 가이드
│   └── interleague-guide.md        # 교류전 가이드
│
├── kbo-reference/            # 🔍 KBO 참고용 (기존 코드)
│   └── magic-number/        # KBO 기존 시스템 (참고만)
│
├── config/                   # ⚙️ NPB 설정 파일
│   ├── npb-teams.js         # NPB 팀 정보
│   ├── environment.js       # NPB 환경 설정
│   └── paths.js             # 경로 관리
│
└── package.json              # NPB 프로젝트 설정
```

## 🚀 주요 기능

- **🎯 NPB 매직넘버 계산**: 센트럴/퍼시픽 리그 우승 & 클라이맥스 시리즈 진출 매직넘버
- **🏆 클라이맥스 시리즈 분석**: 1단계/파이널 진출 시나리오 및 1승 어드밴티지 계산
- **📊 리그별 실시간 순위**: CL/PL 분리된 순위표 및 교류전 성적
- **⚔️ NPB 상대전적**: 12팀 × 12팀 상대전적 매트릭스
- **🔄 교류전 분석**: 센트럴 vs 퍼시픽 리그 교류전 승률 및 영향도 분석
- **📈 NPB 특화 통계**: 무승부 포함 승률, DH 제도, 12회 연장전 반영

## 🌐 웹사이트 접속

- **NPB 매직넘버 사이트**: [https://npb-dashboard.co.kr/](https://npb-dashboard.co.kr/)

## 🏟️ NPB 리그 구조

### 센트럴 리그 (Central League)
- **요미우리 자이언츠** | **한신 타이거스** | **중일 드래곤즈**
- **야쿠르트 스왈로즈** | **요코하마 DeNA 베이스타즈** | **히로시마 토요 카프**

### 퍼시픽 리그 (Pacific League)  
- **후쿠오카 소프트뱅크 호크스** | **지바 로데 마린즈** | **오릭스 버팔로즈**
- **토호쿠 라쿠텐 골든 이글스** | **홋카이도 닛폰햄 파이터즈** | **사이타마 세이부 라이온즈**

## ⚡ 빠른 시작

### 1. NPB 데이터 업데이트
```bash
# 새 NPB 경기 결과를 data/2025-npb-season.txt에 추가
echo "2025-08-27" >> data/2025-npb-season.txt
echo "요미우리 6:4 한신" >> data/2025-npb-season.txt
echo "소프트뱅크 8:5 로데" >> data/2025-npb-season.txt
```

### 2. NPB 데이터 처리 (Node.js)
```bash
node js/npb-process-season-data.js      # NPB 메인 데이터 처리
node js/climax-series-calculator.js     # 클라이맥스 시리즈 계산
node js/interleague-analyzer.js         # 교류전 분석
```

### 3. NPB 데이터 수집 (Python)  
```bash
python crawlers/npb-main-crawler.py     # NPB 자동 크롤링
python crawlers/yahoo-sports-crawler.py # 상세 기록 수집
```

### 4. 로컬 서버 실행
```bash
npm run npb-serve  # http://localhost:8080/
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+) - NPB 전용 UI
- **Backend Scripts**: Node.js - NPB 데이터 처리 엔진  
- **Data Crawler**: Python (Selenium, BeautifulSoup) - NPB 사이트 크롤링
- **Data Format**: JSON, TXT - NPB 데이터 구조
- **Database**: SQLite - NPB 경기 기록 저장
- **PWA**: Progressive Web App 지원

## 🏆 NPB vs KBO 차이점

| 구분 | NPB | KBO |  
|------|-----|-----|
| **리그 구조** | 센트럴/퍼시픽 2리그 × 6팀 | 단일 리그 10팀 |
| **플레이오프** | 클라이맥스 시리즈 (3팀) | 플레이오프 (5팀) |
| **무승부** | 있음 (12회 연장) | 없음 (15회까지) |
| **DH 제도** | PL만 사용 | 전체 사용 |
| **교류전** | 있음 (5-6월) | 없음 |
| **시즌 일정** | 143경기 + 교류전 18경기 | 144경기 |

## 📊 NPB 데이터 흐름

```
NPB 경기 결과 → CL/PL 분리 처리 → 클라이맥스 시리즈 계산 → 웹사이트 업데이트
   (Python)         (Node.js)           (Node.js)              (JSON)
      ↓               ↓                    ↓
  교류전 기록 →    무승부 포함 승률  →   매직넘버 매트릭스
```

## 🛠️ NPB 개발자 가이드

### 폴더별 역할 (NPB 전용 구조)
- **js/** - NPB 전용 JavaScript (데이터 처리 + UI 로직)
- **css/** - NPB 테마 스타일시트 (CL/PL 리그별 디자인)
- **data/** - NPB 데이터 파일 (리그별 JSON 분리)
- **images/** - NPB 12팀 로고 (central/pacific 폴더 분리)
- **crawlers/** - NPB 전용 Python 크롤러

### NPB 핵심 스크립트
- `js/npb-process-season-data.js` - NPB 핵심 데이터 처리 (CL/PL 분리)
- `js/npb-main.js` - NPB 웹페이지 UI 로직 (리그별 UI)
- `js/climax-series-calculator.js` - 클라이맥스 시리즈 전용 계산
- `js/interleague-analyzer.js` - 교류전 분석 (NPB 전용 기능)

## 📚 NPB 상세 문서

- **[NPB 프로젝트 종합 문서](NPB_PROJECT_DOCUMENTATION.md)** - NPB 시스템 전체 설명
- **[NPB 기능 명세서](NPB_FUNCTIONAL_SPECIFICATION.md)** - KBO 기능의 NPB 적용 계획  
- **[NPB 규칙 가이드](docs/npb-rules.md)** - NPB 리그 규칙 및 계산 방법
- **[클라이맥스 시리즈 가이드](docs/climax-series.md)** - CS 시스템 상세 분석
- **[교류전 가이드](docs/interleague-guide.md)** - 교류전 분석 방법

## 🏗️ NPB 아키텍처 특징

### NPB 전용 독립 구조
- 루트 레벨 직접 배치로 간단한 구조 (`/index.html`, `/js/`, `/css/`)
- KBO 기존 코드는 `kbo-reference/` 폴더에 참고용으로만 보관
- NPB 전용 새로운 코드베이스 (magic-number 폴더 사용 안함)

### NPB 리그 구조 반영
- 센트럴/퍼시픽 리그 분리 처리
- 클라이맥스 시리즈 전용 계산 로직
- 교류전 성적 별도 관리
- 무승부 포함 승률 계산 시스템

## 📊 NPB 프로젝트 통계

- **총 NPB JavaScript 파일**: 7개+ (NPB 전용 개발)
- **총 NPB 데이터 파일**: 8개+ (리그별 분리 관리)  
- **지원 팀**: NPB 12개 팀 전체 (CL 6팀 + PL 6팀)
- **지원 플레이오프**: 클라이맥스 시리즈 + 일본시리즈 시나리오
- **특화 기능**: 교류전 분석, 무승부 처리, DH 제도 반영

## 🗃️ 폴더 관리 정책

- **kbo-reference/magic-number/** - KBO 기존 코드 (참고용, 수정 금지)
- **js/, css/, data/** - NPB 전용 코드 (새로 개발)
- **config/** - NPB 설정 파일 (팀 정보, 환경 변수)

## 📝 라이센스

이 프로젝트는 NPB(일본프로야구) 데이터 분석 및 시각화를 위한 개인 프로젝트입니다.

---
**최초 작성**: 2025년 8월 27일  
**개발자**: SanghunBruceHam  
**NPB 웹사이트**: https://npb-dashboard.co.kr/  
**GitHub 저장소**: https://github.com/SanghunBruceHam/npb

## 🔄 KBO에서 NPB로 전환

이 프로젝트는 기존 KBO 매직넘버 계산기를 기반으로 NPB 전용으로 새롭게 개발됩니다:

- **기존 KBO 시스템**: `kbo-reference/magic-number/` (참고용으로만 보관)  
- **새로운 NPB 시스템**: 루트 레벨 직접 구현 (완전히 새로운 코드)
- **NPB 특화 기능**: 클라이맥스 시리즈, 교류전, 무승부 처리 등

*NPB 프로젝트는 KBO의 모든 기능을 NPB 환경에 맞게 재구현하여 일본프로야구 팬들을 위한 전용 매직넘버 계산기를 제공합니다.*