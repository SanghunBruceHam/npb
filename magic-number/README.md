# KBO 매직넘버 계산기 📊

2025 KBO 리그 매직넘버 계산기 - 플레이오프 진출 조건과 우승 가능성을 실시간으로 확인하세요.

## 📁 프로젝트 구조

```
magic-number/
│
├── index.html                  # 메인 HTML 파일
├── MAGIC_NUMBER_DEFINITION.md  # 매직넘버 정의 문서
│
├── assets/                     # 정적 자원 폴더
│   ├── css/
│   │   └── styles.css         # 모든 스타일시트
│   ├── js/
│   │   └── script.js          # 모든 JavaScript 로직
│   ├── data/                  # JSON 데이터 파일
│   │   ├── service-data.json  # 메인 서비스 데이터
│   │   ├── magic-matrix-data.json # 매직넘버 매트릭스
│   │   ├── kbo-records.json   # 팀간 상대전적
│   │   ├── kbo-rankings.json  # 순위 데이터
│   │   └── manifest.json      # PWA 매니페스트
│   └── screenshots/           # 스크린샷 보관
│
├── images/                    # 팀 로고 이미지
│   ├── hanwha.png, lg.png, doosan.png, samsung.png
│   ├── kia.png, ssg.png, lotte.png, nc.png
│   └── kiwoom.png, kt.png
│
├── icons/                     # 사이트 아이콘
│   ├── kbo-magic-number-icon.png
│   └── kbo-magic-number-thumbnail.png
│
├── scripts/                   # 데이터 처리 스크립트 (Node.js)
│   ├── fix-encoding.js        # 인코딩 문제 해결
│   ├── generate-magic-matrix.js # 매직넘버 매트릭스 생성
│   ├── process-season-data.js # 메인 데이터 처리
│   └── README.md              # 스크립트 사용 가이드
│
├── crawlers/                  # 데이터 크롤러 (Python)
│   ├── kbo-python-working-crawler.py # Python 크롤러
│   ├── requirements.txt       # Python 의존성
│   ├── venv/                 # Python 가상환경
│   └── kbo-working-screenshot.png # 크롤러 스크린샷
│
└── utils/                     # 유틸리티 파일
    ├── refresh-matrix.html    # 매트릭스 수동 새로고침 도구
    └── test-matrix.html       # 매트릭스 테스트 도구

```

## 🚀 주요 기능

- **실시간 순위표**: KBO 10개 팀의 최신 순위 정보
- **매직넘버 계산**: 우승 및 플레이오프 진출 매직넘버
- **매직넘버 매트릭스**: 나무위키 스타일의 순위별 매직넘버 테이블
- **상대전적 분석**: 팀간 상대전적 상세 정보
- **1위 탈환 가능성**: 각 팀의 1위 달성 가능성 분석

## 💻 기술 스택

- **HTML5**: 시맨틱 구조
- **CSS3**: 반응형 디자인
- **JavaScript (ES6+)**: 동적 데이터 처리
- **JSON**: 데이터 저장 형식

## 📊 데이터 업데이트

- `assets/data/service-data.json`: 일일 경기 결과 반영
- `assets/data/magic-matrix-data.json`: 매직넘버 매트릭스 자동 생성
- `assets/data/kbo-records.json`: 팀간 상대전적 업데이트

**스크립트 실행** (Node.js):
```bash
cd scripts/
node process-season-data.js      # 메인 데이터 처리
node generate-magic-matrix.js    # 매트릭스 생성
```

**크롤러 실행** (Python):
```bash
cd crawlers/
python kbo-python-working-crawler.py  # 데이터 크롤링
```

## 🔧 유지보수

### 파일별 역할
- **index.html**: HTML 구조만 수정
- **assets/css/styles.css**: 스타일 변경
- **assets/js/script.js**: 기능 및 로직 수정
- **assets/data/*.json**: 데이터 업데이트
- **scripts/*.js**: 데이터 처리 로직 수정 (Node.js)
- **crawlers/*.py**: 데이터 크롤링 로직 수정 (Python)

### 코드 관리 효율성
- 원본: 4,300+ 줄의 단일 HTML 파일
- 현재: 체계적으로 분리된 구조
  - HTML: 683줄
  - CSS: 1,340줄
  - JavaScript: 2,287줄

## 📱 접근성

- 모바일/태블릿 반응형 지원
- PWA (Progressive Web App) 지원
- SEO 최적화
- 구글 애널리틱스 연동

## 🎯 개발자 정보

- **Author**: SanghunBruceHam
- **Website**: https://kbo.mahalohana-bruce.com/magic-number/

---
최종 업데이트: 2025년 8월 6일