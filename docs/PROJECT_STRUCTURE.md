# NPB 프로젝트 구조

## 📁 디렉토리 구조

```
npb/
├── 📄 index.html                    # 메인 웹 대시보드
├── 📄 README.md                     # 프로젝트 설명
├── 📄 .gitignore                    # Git 제외 파일
├── 📄 .env                         # 환경 변수 (보안)
│
├── 🗂️ crawler/                     # 데이터 수집
│   ├── 📄 results_crawler.py       # 경기 결과 크롤러
│   ├── 📄 upcoming_crawler.py      # 예정 경기 크롤러  
│   ├── 📄 unified_crawler.py       # 통합 크롤러 (미래용)
│   ├── 📄 config.py               # NPB 팀 정보, URL 설정
│   ├── 📄 utils.py                # 공통 유틸리티
│   ├── 📄 requirements.txt        # Python 의존성
│   ├── 📄 setup.sh               # 환경 설정 스크립트
│   ├── 🗂️ venv/                   # Python 가상환경
│   └── 🗂️ logs/                   # 크롤링 로그
│
├── 🗂️ scripts/                    # 자동화 스크립트
│   ├── 📄 daily_crawler.py        # 일일 자동화 마스터
│   ├── 📄 data_manager.py         # 데이터 관리 통합
│   └── 📄 setup_cron.sh          # cron job 설정
│
├── 🗂️ data/                       # 데이터 저장소
│   ├── 📄 teams.json              # API: 팀 정보
│   ├── 📄 standings.json          # API: 현재 순위표  
│   ├── 📄 games.json             # API: 최근 경기
│   ├── 📄 dashboard.json         # API: 대시보드 요약
│   ├── 🗂️ raw/                    # 원본 데이터 보관
│   │   ├── 🗂️ html/              # 압축된 HTML
│   │   └── 🗂️ json/              # 파싱된 raw 데이터
│   ├── 🗂️ backups/               # 일일 백업 (7일)
│   ├── 🗂️ processed/             # 분석용 가공 데이터
│   └── 🗂️ archive/               # 90일+ 오래된 데이터
│
├── 🗂️ api/                        # API 서버 (Python)
│   └── 📄 main.py                 # FastAPI 서버
│
├── 🗂️ web/                        # 웹 프론트엔드
│   ├── 📄 index.html              # 메인 페이지
│   ├── 📄 dashboard.js            # 대시보드 로직
│   └── 📄 style.css               # 스타일시트
│
├── 🗂️ logs/                       # 시스템 로그
│   ├── 🗂️ daily_crawler/          # 일일 크롤러 로그
│   ├── 🗂️ data_manager/           # 데이터 매니저 로그
│   └── 🗂️ pipeline/               # 파이프라인 로그
│
├── 🗂️ docs/                       # 문서
│   ├── 📄 DATA_STRATEGY.md        # 데이터 관리 전략
│   └── 📄 PROJECT_STRUCTURE.md    # 이 파일
│
└── 🗂️ scripts/                    # 실행 스크립트
    ├── 📄 run_api.sh              # API 서버 실행
    ├── 📄 run_web.sh              # 웹 서버 실행
    └── 📄 run_html.sh             # HTML 뷰어 실행
```

## 🔄 데이터 플로우

```
1. 크롤링 (자동, 매일 6시/18시)
   ├── 📊 결과 경기: crawler/results_crawler.py
   └── 📅 예정 경기: crawler/upcoming_crawler.py
   
2. 원본 저장 (자동)
   ├── 🗜️ HTML: data/raw/html/ (gzip 압축)
   └── 📝 JSON: data/raw/json/ (구조화)
   
3. DB 저장 (자동)
   └── 🗄️ PostgreSQL: 정규화된 관계형 데이터
   
4. API 생성 (자동)
   ├── 📄 teams.json: 팀 정보
   ├── 📊 standings.json: 순위표
   ├── 🏆 games.json: 최근 경기
   └── 📈 dashboard.json: 요약 통계
   
5. 서비스 제공
   ├── 🌐 Web: index.html (GitHub Pages)
   └── 🔗 API: FastAPI 서버
```

## 🤖 자동화 시스템

### Cron Jobs
```bash
# 매일 6시, 18시 - 전체 크롤링+처리
0 6,18 * * * daily_crawler.py

# 매주 일요일 3시 - 정리 작업  
0 3 * * 0 daily_crawler.py --cleanup-only
```

### 수동 실행 명령어
```bash
# 전체 자동화
./scripts/daily_crawler.py

# 개별 작업
./crawler/results_crawler.py --test         # 결과 경기 크롤링
./crawler/upcoming_crawler.py 7             # 예정 경기 크롤링  
./scripts/data_manager.py --sync            # DB→JSON 동기화
./scripts/data_manager.py --backup          # 백업 생성
```

## 📊 데이터베이스 테이블

| 테이블 | 용도 | 상태 |
|-------|------|------|
| `teams` | 팀 정보 | ✅ |
| `games` | 경기 데이터 (결과+예정) | ✅ |
| `standings` | 순위표 | ✅ |
| `crawl_logs` | 크롤링 로그 | ✅ |

## 🔧 주요 설정 파일

- **`.env`**: 데이터베이스 접속 정보 (보안)
- **`crawler/config.py`**: NPB 팀 정보, URL 패턴
- **`crawler/requirements.txt`**: Python 패키지 의존성
- **`.gitignore`**: Git 추적 제외 파일

## 🚀 배포 환경

- **개발**: 로컬 PostgreSQL + Python 스크립트
- **운영**: GitHub Pages (정적) + 자동화 cron jobs
- **API**: FastAPI (선택적)

이 구조로 **개발**, **운영**, **유지보수**가 모두 체계적으로 관리됩니다.