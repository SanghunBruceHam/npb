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
├── games.json        # 최근 30일 경기
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
- **DB**: PostgreSQL (ACID, 관계형, 쿼리)
- **장점**:
  - 무결성 보장
  - 복잡한 집계 쿼리
  - 트랜잭션 지원

### API 서비스 (웹/앱)
- **JSON**: 웹서비스용 정제된 데이터
- **장점**:
  - 빠른 로딩 속도
  - CDN 캐싱 가능  
  - 클라이언트 친화적

## 자동 동기화 시스템

### 실시간 동기화 (매 크롤링마다)
```python
크롤링 → DB 저장 → JSON 자동 업데이트
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

## 운영 명령어

```bash
# 전체 자동화 (권장)
./scripts/daily_crawler.py

# 개별 작업
./scripts/enhanced_data_manager.py --sync     # DB→JSON 동기화
./scripts/enhanced_data_manager.py --archive # 오래된 데이터 정리
./scripts/enhanced_data_manager.py --summary # 데이터 현황

# 데이터 현황 확인
./scripts/enhanced_data_manager.py --summary
```

이 구조로 **원본 보관**, **운영 효율성**, **서비스 성능**을 모두 확보할 수 있습니다.