# NPB Dashboard

일본 프로야구(NPB) 데이터 수집 및 대시보드 시스템

## 📋 프로젝트 구조

```
npb/
├── index.html                  # 메인 웹사이트 (정적 HTML)
├── run_html.sh                 # 대시보드 열기
├── run_new_pipeline.sh         # 신규 파이프라인 실행 (무DB)
│
├── data/                       # 서비스용 데이터
│   ├── simple/                 # TXT 원천 (크롤/시뮬레이션)
│   ├── games.json              # 경기 결과 JSON (완료 경기만)
│   ├── upcoming.json           # 예정 경기 JSON (스케줄 전용)
│   ├── standings.json          # 순위표 JSON
│   ├── teams.json              # 팀 정보 JSON
│   └── dashboard.json          # 대시보드 요약 JSON
│
├── scripts/                    # 데이터 처리 스크립트
│   ├── new_pipeline.py         # TXT→JSON 통합 파이프라인(기본)
│   ├── simple_txt_to_json.js   # TXT → JSON 변환기
│   └── json_to_txt_converter.py# 기존 JSON → TXT 역변환(시뮬)
│
├── crawler/                    # 크롤러(옵션)
│   ├── simple_crawler.py       # 간단 크롤러: TXT 저장 (DB 미사용)
│   └── requirements.txt        # 크롤러 의존성 최소 목록
│
├── database/                   # 레거시(DB) 스키마/셋업
│   ├── create_tables.sql
│   └── setup_db.py
│
└── docs/                       # 문서
    ├── PROJECT_STRUCTURE.md
    ├── DATA_STRATEGY.md
    └── LEGACY_DB.md            # 레거시(DB) 사용 가이드
```

## 🚀 빠른 시작 (무DB 기본)

사전 요구사항: Node.js v16+ (권장 v18+)

1) 데이터 생성/갱신
```bash
# 크롤링 없이 기존 TXT로 바로 변환
./run_new_pipeline.sh --skip-crawl

# 또는 빠른 크롤(1일) + 변환
./run_new_pipeline.sh --quick
# 일반: 최근 N일 크롤
./run_new_pipeline.sh 7
```

2) 대시보드 열기
```bash
./run_html.sh
```

참고: Python 크롤링 의존성(requests, bs4 등)은 `--quick`/일반 크롤에만 필요합니다. `--skip-crawl`은 Node만 있으면 됩니다.
레거시(DB) 기반 크롤러는 제거되었습니다.

## 🔄 데이터 파이프라인 (기본)

```
크롤링(옵션) → TXT → JavaScript 처리 → JSON → 웹사이트
```

### 단계별 설명
1. **크롤링(옵션)**: 니칸스포츠에서 NPB 경기 결과 수집 후 TXT 저장
2. **TXT 처리**: Node.js로 TXT 파싱 및 가공
3. **JSON 생성**: 웹사이트용 JSON 파일 생성
4. **웹사이트 표시**: 정적 HTML에서 JSON 로드하여 표시

### 데이터 규칙(Counting & 정합성)
- `data/games.json`: 완료된 경기만 포함합니다. 예정/연기/플레이스홀더는 제외됩니다.
- `data/upcoming.json`: 예정 경기를 별도로 보관합니다(스케줄 전용).
- 0–0 라인이더라도 `[DRAW]` 표기가 없으면 완료 경기가 아닌 플레이스홀더로 간주합니다(= 예정). `[DRAW]`가 명시된 0–0만 무승부로 기록됩니다.
- 순위·승패·경기수 계산은 오직 `games.json`(완료 경기)만을 기반으로 합니다.
- 정합성 검증: 각 팀은 `games_played = wins + losses + draws`가 성립합니다.

재생성 방법
```bash
# 크롤 없이 규칙 반영하여 즉시 재생성
./run_new_pipeline.sh --skip-crawl

# 필요 시 1일 크롤 후 재생성
./run_new_pipeline.sh --quick
```

## 📊 수집 데이터

- **경기 결과**: 일별 NPB 완료 경기 결과(시즌 진행분)
- **순위표**: 경기 결과 기반 실시간 순위 계산
- **팀 통계**: 득점, 실점, 승률, 게임차
- **특수 경기**: 연장전, 무승부, 취소 경기

## 🗄️ 데이터베이스 구조
기본 파이프라인은 DB를 사용하지 않습니다. 레거시(DB) 경로가 필요하면 `docs/LEGACY_DB.md`를 참고하세요.

## 📄 데이터 형식

### 구조화된 TXT 예시
```
1|2|HAN|阪神タイガース|Central|120|68|46|6|0.596|0.0|409|298
```

### JSON 출력
```json
{
  "updated_at": "2025-09-03T11:33:02.290Z",
  "central_league": {
    "standings": [
      {
        "position_rank": 1,
        "team_name": "阪神タイガース",
        "wins": 68,
        "losses": 46,
        "win_percentage": 0.596
      }
    ]
  }
}
```

## 🔗 데이터 소스

**니칸스포츠** (https://www.nikkansports.com)
- 안정적인 URL 패턴
- 일관된 데이터 구조  
- NPB 12개 팀 전체 지원

## 📈 성능 지표

- **수집 경기수**: 850+ 경기
- **파싱 성공률**: 100%  
- **팀명 변환**: NPB 12개 팀 100% 지원
- **파이프라인 효율성**: 기존 대비 30% 단축

## 🔍 모니터링

### 로그 파일
- `logs/new_pipeline/`: 파이프라인 실행 로그
- `crawler/logs/`: 크롤링 활동 로그

### 데이터 확인
```bash
# 최신 JSON 파일  
ls -la data/*.json

# 파이프라인 로그
tail -f logs/new_pipeline/pipeline_*.log
```

## 📝 사용법

### 정기 실행
```bash
# 매일 실행 (추천)
./run_new_pipeline.sh 1

# 주간 실행  
./run_new_pipeline.sh 7

# 대용량 업데이트
./run_new_pipeline.sh 30
```

### 테스트 실행
```bash
./run_new_pipeline.sh --test    # 3일
./run_new_pipeline.sh --quick   # 1일
```

## 🌐 웹사이트

- 로컬 실행: `./run_html.sh`
- GitHub Pages: 정적 배포 지원
- 모바일 최적화: 반응형 디자인
- 다크모드: 테마 전환 지원

## 🧰 레거시(DB) 경로

- 본 프로젝트는 기본적으로 무DB 파이프라인을 사용합니다.
- PostgreSQL 기반 레거시 경로를 사용하려면 `docs/LEGACY_DB.md`의 안내에 따라 설정/정합성 수정을 진행하세요.

## 📝 라이선스

MIT License
