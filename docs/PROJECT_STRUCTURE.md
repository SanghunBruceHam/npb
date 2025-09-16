# NPB 프로젝트 구조 (최신)

## 📁 디렉토리 구조

```
npb/
├── 📄 index.html                 # 메인 웹 대시보드 (정적)
├── 📄 README.md                  # 프로젝트 안내
├── 📄 run_html.sh                # HTML 실행 스크립트
├── 📄 run_new_pipeline.sh        # 신규 파이프라인 실행 스크립트
│
├── 🗂️ legacy/                   # 레거시 테스트/디버그 자료 보관
│   ├── 🗂️ html/                  # 과거 실험용 HTML (매직넘버/시나리오 등)
│   └── 🗂️ python/                # 크롤러 구조 분석용 스크립트 (debug_*)
│
├── 🗂️ data/                      # 서비스용 데이터
│   ├── 📄 games.json              # 완료 경기 JSON
│   ├── 📄 upcoming.json           # 예정 경기 JSON
│   ├── 📄 standings.json
│   ├── 📄 teams.json
│   ├── 📄 dashboard.json
│   └── 🗂️ simple/
│       ├── 📄 games_raw.txt       # 상세 크롤링 원본 (완료 경기)
│       └── 📄 upcoming_games_raw.txt # 예정 경기 원본
│
├── 🗂️ scripts/                   # 데이터 처리 & 유틸
│   ├── 📄 new_pipeline.py         # TXT→JSON 메인 파이프라인
│   ├── 📄 simple_txt_to_json.js   # TXT 파서 + JSON 생성기
│   ├── 📄 json_to_txt_converter.py# JSON→TXT 역변환 (디버그)
│   ├── 📄 repair_games_raw.py     # games_raw.txt 보정 스크립트
│   └── 📄 backfill_dates.py       # 특정 날짜 재생성 도우미
│
├── 🗂️ crawler/                   # 크롤러 + 전용 가상환경
│   ├── 📁 venv/                   # 크롤러 전용 파이썬 가상환경
│   ├── 📄 simple_crawler.py       # 상세 박스스코어 크롤러 (활성 유지)
│   ├── 📄 min_results_crawler.py  # 경량 크롤러 (필요 시 대체)
│   └── 📄 requirements.txt        # 의존성 목록
│
├── 🗂️ logs/
│   ├── 🗂️ simple_crawler/         # 크롤링 로그 `crawler_YYYYMMDD.log`
│   └── 🗂️ new_pipeline/           # 파이프라인 실행 로그
│
├── 🗂️ database/                  # 레거시(DB)
│   ├── 📄 create_tables.sql
│   └── 📄 setup_db.py
│
└── 🗂️ docs/                      # 문서
    ├── 📄 DATA_STRATEGY.md
    ├── 📄 PROJECT_STRUCTURE.md
    └── 📄 LEGACY_DB.md
```

## 🔄 데이터 플로우 (기본)

```
크롤링(옵션) → TXT → JavaScript 처리 → JSON → index.html
```

### 데이터 파일 의미
- `games.json`: 완료된 경기만 수록합니다. 무승부는 `[DRAW]`로 명시된 0–0만 인정합니다.
- `upcoming.json`: 예정/미진행 경기 전용. UI의 오늘/내일 경기 섹션이 참조합니다.

## 🔎 핵심 데이터 파일

- `data/simple/games_raw.txt`: `simple_crawler`가 생성하는 일자별 TXT. 수동 수정 후 `repair_games_raw.py`로 재검증 가능.
- `data/simple/upcoming_games_raw.txt`: 예정 경기 TXT. UI에서 일정 확인 시 필요.
- `data/games.json`, `data/upcoming.json`: 웹 서비스가 참조하는 최종 JSON. `new_pipeline.py`에서 생성.
- `logs/simple_crawler/`: 크롤링 시도, 실패, 스킵 로그 확인용.

## 🤖 실행 명령어
```bash
# (기본) TXT→JSON 파이프라인
./run_new_pipeline.sh --skip-crawl         # 크롤링 없이 변환만
./run_new_pipeline.sh --quick              # 1일 크롤 + 변환 (기본: 최소 크롤러 사용)
./run_new_pipeline.sh --quick --legacy-crawler  # simple_crawler 강제 사용

# 대시보드 열기
./run_html.sh
```

## 레거시(DB)

- 기본 경로는 무DB입니다. 예전 DB 기반 크롤러/스크립트는 저장소에서 제거되었습니다.
- 과거 경로가 필요하다면 `docs/LEGACY_DB.md`의 안내와 커밋 히스토리를 참고하세요.
