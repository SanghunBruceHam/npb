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
│   ├── 📄 games.json
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
│   ├── 📄 simple_crawler.py      # 간단 크롤러(TXT 저장)
│   ├── 📄 npb_crawler.py         # 레거시(DB) 통합 크롤러
│   ├── 📄 config.py, utils.py, requirements.txt, setup.sh
│   └── 🗂️ venv/
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

## 🤖 실행 명령어
```bash
# (기본) TXT→JSON 파이프라인
./run_new_pipeline.sh --skip-crawl   # 크롤링 없이 변환만
./run_new_pipeline.sh --quick        # 1일 크롤 + 변환

# 대시보드 열기
./run_html.sh
```

## 레거시(DB)

- 기본 경로는 무DB입니다. DB 사용이 필요하면 `docs/LEGACY_DB.md` 참고.
- 레거시(DB) 경로에는 스키마/크롤러 정합성 이슈가 존재하며 추가 정리가 필요합니다.

