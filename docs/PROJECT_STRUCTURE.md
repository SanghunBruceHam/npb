# NPB 프로젝트 구조 (최신)

## 📁 디렉토리 구조

```
npb/
├── 📄 index.html                 # 메인 웹 대시보드 (정적)
├── 📄 README.md                  # 프로젝트 안내
├── 📄 run_html.sh                # HTML 실행 스크립트
├── 📄 run_new_pipeline.sh        # 신규 파이프라인 실행 스크립트
│
├── 🗂️ data/                      # 서비스용 데이터
│   ├── 📄 games.json          # 완료 경기만 저장
│   ├── 📄 upcoming.json       # 예정 경기(스케줄)만 저장
│   ├── 📄 standings.json
│   ├── 📄 teams.json
│   ├── 📄 dashboard.json
│   └── 🗂️ simple/                # TXT 원천(크롤/시뮬)
│
├── 🗂️ scripts/                   # 데이터 처리
│   ├── 📄 new_pipeline.py        # TXT→JSON 파이프라인(기본)
│   ├── 📄 simple_txt_to_json.js  # TXT → JSON 변환
│   └── 📄 json_to_txt_converter.py# JSON → TXT 시뮬
│
├── 🗂️ crawler/                   # 크롤러(옵션)
│   ├── 📄 simple_crawler.py      # 간단 크롤러(TXT 저장, DB-free)
│   └── 📄 requirements.txt       # 최소 의존성 목록
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

## 🤖 실행 명령어
```bash
# (기본) TXT→JSON 파이프라인
./run_new_pipeline.sh --skip-crawl   # 크롤링 없이 변환만
./run_new_pipeline.sh --quick        # 1일 크롤 + 변환

# 대시보드 열기
./run_html.sh
```

## 레거시(DB)

- 기본 경로는 무DB입니다. 예전 DB 기반 크롤러/스크립트는 저장소에서 제거되었습니다.
- 과거 경로가 필요하다면 `docs/LEGACY_DB.md`의 안내와 커밋 히스토리를 참고하세요.
