# LEGACY: PostgreSQL 경로 안내 (선택)

본 프로젝트의 기본 데이터 플로우는 무DB(TXT→JSON)입니다. 아래 내용은 PostgreSQL 기반 레거시 경로를 사용해야 할 때 참고하세요.

## 현황 요약

- 스키마와 크롤러 간 불일치가 존재합니다. 즉시 실행 시 오류가 날 수 있습니다.

주요 불일치:
- 컬럼명: 스키마 `teams.team_abbr` vs 크롤러 쿼리 `team_abbreviation`
- 업서트: 크롤러는 `ON CONFLICT ON CONSTRAINT unique_game_date_teams`를 사용하지만, 스키마에는 이름 없는 UNIQUE 조합만 정의됨
- 컬럼 세트: 크롤러는 `game_status/is_cancelled/home_inning_scores/away_inning_scores` 등을 사용하지만, 스키마엔 `is_completed`와 분리 `game_innings` 테이블 구조
- DB 명칭/사용자: `.env`는 `npb_dashboard_dev`/로컬 사용자, `database/setup_db.py`는 `npb_stats`/`npb_user`
- 실행 환경: `crawler/npb_crawler.py`는 로컬 venv 경로/버전 하드코딩으로 이식성 저하

## 권고 시나리오

1) 가능한 한 기본(무DB) 파이프라인 사용
- `./run_new_pipeline.sh --skip-crawl` 또는 `--quick`

2) DB 경로가 꼭 필요하다면 아래 정합성 수선 후 사용
- 스키마/크롤러 정합화
  - 쿼리에서 `teams.team_abbr` 사용으로 변경
  - 업서트는 제약명 대신 컬럼 목록 사용 예: `ON CONFLICT (game_date, home_team_id, away_team_id, game_number)`
  - 크롤러가 사용하는 컬럼(`game_status`, `is_cancelled`, `home_inning_scores`, `away_inning_scores`)을 스키마에 추가하거나, 크롤러를 스키마에 맞춰 축소
- 환경 통일
  - DB명/사용자/비밀번호를 `.env`와 `database/setup_db.py` 중 하나로 통일
  - `npb_crawler.py`의 shebang/경로 하드코딩 제거 (`#!/usr/bin/env python3` 권장)

## 셋업 절차(예시)

1) 데이터베이스 생성 및 스키마 로드
```bash
python3 database/setup_db.py
```

2) .env 정리 (또는 `setup_db.py`를 .env 값에 맞게 수정)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=npb_stats
DB_USER=npb_user
DB_PASSWORD=npb_password
```

3) 크롤러 정합성 수정 (필수)
- 위 ‘정합성 수선’ 항목 참조

4) 테스트 실행(권장)
```bash
cd crawler
./setup.sh   # 의존성 설치 및 기본 확인 (DB 연결 실패 시 원인 점검)
python3 npb_crawler.py --test
```

## 주의사항

- `games` 테이블의 UNIQUE 조합에 `game_number`가 포함되어 NULL 처리가 포함됩니다. 더블헤더 처리와 중복 방지를 고려해 값 정책을 검토하세요.
- 레거시 경로는 기본 경로 대비 유지비가 높고, 본 저장소에서는 무DB 경로를 우선 유지·개선합니다.

