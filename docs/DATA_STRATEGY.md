# NPB 데이터 보관 및 관리 전략

## 데이터 보관 구조

### 1. Raw 데이터 (원본 보관)
```
data/
├── raw/
│   ├── html/           # 원본 HTML (압축 저장)
│   │   ├── 2025/
│   │   │   ├── 09/
│   │   │   │   └── nikkansports_2025-09-02.json.gz
│   │   │   └── 10/
│   │   └── 2026/
│   └── json/           # 파싱된 raw 데이터
│       ├── 2025/
│       │   ├── 09/
│       │   │   └── parsed_2025-09-02.json
│       │   └── 10/
│       └── 2026/
```

### 2. Processed 데이터 (가공된 데이터)
```
data/
├── processed/          # 분석용 처리된 데이터
│   ├── monthly/
│   ├── weekly/
│   └── seasonal/
```

### 3. API 데이터 (실시간 서비스용)
```
data/
├── teams.json         # 팀 정보
├── standings.json     # 현재 순위표
├── games.json        # 완료 경기만 (시즌 진행분)
├── upcoming.json     # 예정 경기(스케줄)
└── dashboard.json    # 대시보드 요약
```

### 4. 백업 및 아카이브
```
data/
├── backups/          # 일일 백업 (최근 7일분)
│   └── games_backup_20250902.json
└── archive/          # 90일 이상 오래된 데이터
    └── raw/
```

## 데이터 플로우

### 완전 자동화된 데이터 플로우
```
1. 크롤링 실행
   ↓
2. Raw HTML 저장 (압축)
   ↓  
3. HTML 파싱 → Raw JSON 저장
   ↓
4. PostgreSQL DB 저장
   ↓
5. DB → API JSON 자동 동기화 ✨
   ↓
6. 백업 및 정리
```

> Note: 기본 파이프라인은 무DB 경로를 사용합니다. 아래 전략에서 DB는 선택 사항이며, 운영 단순화를 위해 TXT→JSON 흐름을 기본으로 합니다. 레거시(DB) 경로는 `docs/LEGACY_DB.md`를 참고하세요.

## JSON vs TXT vs DB 전략

### Raw 데이터 보관 (장기 보관)
- **HTML**: `.json.gz` (메타데이터 + 압축)
- **파싱데이터**: `.json` (구조화된 raw 데이터)
- **장점**: 
  - 원본 완전 보관
  - 압축으로 용량 절약
  - 재파싱 가능
  - 버전 관리 용이

### 운영 데이터 (실시간)
- **JSON (기본)**: 정적 파일로 서비스 (index.html에서 직접 로드)
- **DB (선택)**: PostgreSQL (관계형 쿼리/확장 필요 시)

운영 규칙(Counting)
- `games.json`에는 완료 경기만 포함합니다. 예정/연기/플레이스홀더는 제외됩니다.
- 0–0 라인이더라도 `[DRAW]` 표기가 없으면 완료 경기로 보지 않고 예정으로 간주합니다.
- 무승부는 `[DRAW]` 명시 또는 스코어 동률인 완료 경기에서만 집계됩니다.

### API 서비스 (웹/앱)
- **JSON**: 웹서비스용 정제된 데이터
- **장점**:
  - 빠른 로딩 속도
  - CDN 캐싱 가능  
  - 클라이언트 친화적

## 자동 동기화 시스템

### 데이터 생성 흐름
```text
기본: (크롤링) → TXT → Node.js 처리 → JSON
선택: 크롤링 → DB 저장 → 동기화 → JSON (레거시)
```

### 주요 특징
1. **원자성**: 크롤링 성공시에만 JSON 업데이트
2. **일관성**: DB와 JSON 항상 동기화 
3. **백업**: 자동 백업으로 데이터 손실 방지
4. **아카이브**: 오래된 데이터 자동 정리

## 사용 시나리오

### 개발자 (raw 데이터 필요)
```bash
# Raw HTML 확인
zcat data/raw/html/2025/09/nikkansports_2025-09-02.json.gz

# 파싱 데이터 확인  
cat data/raw/json/2025/09/parsed_2025-09-02.json
```

### 웹서비스 (API 데이터)
```javascript
fetch('/data/standings.json')  // 항상 최신 데이터
```

### 데이터 분석 (DB 쿼리)
```sql
SELECT * FROM games WHERE game_date >= '2025-09-01';
```

## 운영 명령어 (무DB 기본)

```bash
# 크롤 없이 TXT→JSON 변환만 (가장 빠름)
./run_new_pipeline.sh --skip-crawl

# 빠른 크롤(1일) 후 변환
./run_new_pipeline.sh --quick

# 최근 N일 크롤 후 변환
./run_new_pipeline.sh 7
```

이 구조로 **원본 보관**, **운영 효율성**, **서비스 성능**을 모두 확보할 수 있습니다.
