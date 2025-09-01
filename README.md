# NPB Dashboard

일본 프로야구(NPB) 데이터 수집 및 분석 시스템

## 📋 프로젝트 구조

```
npb/
├── crawler/         # 데이터 수집 시스템
│   ├── main.py     # 메인 크롤러
│   ├── config.py   # 설정 파일
│   ├── utils.py    # 유틸리티
│   └── venv/       # Python 가상환경
└── README.md
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
cd crawler
./setup.sh
```

### 2. PostgreSQL 데이터베이스 설정
```bash
createdb npb_dashboard_dev
```

### 3. 크롤러 실행
```bash
cd crawler
source venv/bin/activate
python main.py
```

## 📊 수집 데이터

- **경기 결과**: 일별 NPB 경기 결과
- **이닝별 득점**: 각 이닝별 득점 상세 정보
- **순위표**: 경기 결과 기반 자동 계산

## 🗄️ 데이터베이스 구조

### teams 테이블
- 12개 NPB 팀 정보 (센트럴/퍼시픽 리그)

### games 테이블
- 경기 결과 및 세부 정보
- 이닝별 득점 (JSONB)
- 연장전, 무승부, 경기 상태

### standings 테이블
- 시즌별 팀 순위
- 승률, 게임차, 매직넘버

## 🔗 데이터 소스

**니칸스포츠** (https://www.nikkansports.com)
- 안정적인 URL 패턴
- 일관된 데이터 구조
- 실시간 업데이트

## 📝 라이선스

MIT License