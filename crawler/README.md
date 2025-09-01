# NPB Crawler

일본 프로야구(NPB) 데이터 수집 시스템

## 📁 파일 구조

```
crawler/
├── main.py              # 메인 크롤러 (니칸스포츠 데이터 수집)
├── config.py            # 설정 파일 (팀 정보, URL 패턴)
├── utils.py             # 유틸리티 함수
├── requirements.txt     # Python 패키지 의존성
├── setup.sh            # 환경 설정 스크립트
├── .env                # 환경 변수 (DB 연결 정보)
├── tests/              # 테스트 파일들
│   ├── test_crawler.py
│   ├── test_game_crawler.py
│   ├── debug_db_conflict.py
│   └── debug_nikkansports.py
└── archive/            # 이전 버전 파일들

```

## 🚀 실행 방법

### 1. 환경 설정
```bash
./setup.sh
```

### 2. 가상환경 활성화
```bash
source venv/bin/activate
```

### 3. 크롤러 실행
```bash
python main.py
```

## 📊 수집 데이터

- **경기 결과**: 팀, 점수, 날짜
- **세부 정보**: 이닝별 득점, 연장전 여부, 경기 상태
- **순위 계산**: 경기 결과 기반 자동 계산

## 🗄️ 데이터베이스

PostgreSQL 사용 (npb_dashboard_dev)

- `teams`: 12개 NPB 팀 정보
- `games`: 경기 결과 및 세부 정보 (JSONB로 이닝별 득점 저장)
- `standings`: 시즌 순위표

## 🔗 데이터 소스

니칸스포츠 (https://www.nikkansports.com)
- URL 패턴: `/baseball/professional/score/{year}/pf-score-{date}.html`
- 안정적이고 일관된 데이터 구조