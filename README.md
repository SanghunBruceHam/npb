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
├── data/                     # 📊 원본 데이터
│   └── 2025-season-data-clean.txt
│
├── magic-number/             # 🎯 메인 웹사이트 (완전 자립형)
│   ├── index.html           # 매직넘버 계산기 웹사이트
│   ├── assets/              # CSS, JS, JSON 데이터
│   ├── scripts/             # Node.js 데이터 처리 스크립트
│   ├── crawlers/            # Python 데이터 수집 크롤러
│   └── images/, icons/, utils/
│
├── archive/                  # 🗃️ 아카이브 (구버전 파일들)
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

- **메인 사이트**: [https://kbo.mahalohana-bruce.com/](https://kbo.mahalohana-bruce.com/)
- **매직넘버 계산기**: [https://kbo.mahalohana-bruce.com/magic-number/](https://kbo.mahalohana-bruce.com/magic-number/)

## ⚡ 빠른 시작

### 1. 데이터 업데이트
```bash
# 새 경기 결과를 data/2025-season-data-clean.txt에 추가
echo "2025-08-06" >> data/2025-season-data-clean.txt
echo "LG 5:3 삼성" >> data/2025-season-data-clean.txt
```

### 2. 통계 처리 (Node.js)
```bash
cd magic-number/scripts/
node process-season-data.js      # 메인 데이터 처리
node generate-magic-matrix.js    # 매트릭스 생성
```

### 3. 데이터 수집 (Python)
```bash
cd magic-number/crawlers/
python kbo-python-working-crawler.py  # 자동 크롤링
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend Scripts**: Node.js
- **Data Crawler**: Python (Selenium, BeautifulSoup)
- **Data Format**: JSON, TXT

## 📊 데이터 흐름

```
경기 결과 수집 → 데이터 정제 → 통계 계산 → 웹사이트 업데이트
    (Python)     (Node.js)    (Node.js)        (JSON)
```

## 📚 상세 문서

- **[Magic Number 사용법](magic-number/README.md)** - 웹사이트 상세 가이드
- **[Scripts 가이드](magic-number/scripts/README.md)** - 데이터 처리 스크립트
- **[프로젝트 문서](docs/README.md)** - 전체 시스템 설명

## 🗃️ 아카이브

`archive/` 폴더에는 개발 과정의 구버전 파일들이 정리되어 있습니다:
- `old-scripts/` - 이전 버전 스크립트들
- `backups/` - 데이터 백업 파일들
- `automation-scripts/` - 자동화 관련 스크립트들

## 📝 라이센스

이 프로젝트는 KBO 데이터 분석 및 시각화를 위한 개인 프로젝트입니다.

---
**최종 업데이트**: 2025년 8월 6일  
**개발자**: SanghunBruceHam  
**웹사이트**: https://kbo.mahalohana-bruce.com/