# NPB Dashboard

일본 프로야구(NPB) 데이터 수집 및 대시보드 시스템

## 📋 프로젝트 구조

```
npb/
├── crawler/                      # 데이터 수집 시스템
│   ├── npb_crawler.py           # 메인 크롤러 (경기 결과 수집)
│   ├── config.py                # 크롤링 설정
│   ├── utils.py                 # 유틸리티 함수
│   └── venv/                    # Python 가상환경
├── scripts/                     # 데이터 처리 스크립트  
│   ├── export_structured_txt.py # DB → 구조화된 TXT
│   ├── txt_to_json.js          # TXT → JSON 변환
│   ├── new_pipeline.py         # 통합 파이프라인
│   └── data_manager.py         # DB 관리
├── data/                       # 데이터 파일
│   ├── structured_txt/         # 구조화된 TXT 파일  
│   ├── standings.json          # 순위표 JSON
│   ├── games.json             # 경기 결과 JSON
│   └── teams.json             # 팀 정보 JSON
├── index.html                  # 메인 웹사이트
├── run_new_pipeline.sh        # 파이프라인 실행
└── run_html.sh               # 웹사이트 실행
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
cd crawler
./setup.sh
```

### 2. 데이터베이스 설정
```bash
createdb npb_dashboard_dev
```

### 3. 환경변수 설정
```bash
cp .env.example .env
# DB 정보를 .env 파일에 입력
```

### 4. 데이터 파이프라인 실행
```bash
./run_new_pipeline.sh --quick    # 1일 크롤링 (테스트)
./run_new_pipeline.sh 7         # 7일 크롤링
./run_new_pipeline.sh 14        # 14일 크롤링  
```

### 5. 웹사이트 실행
```bash
./run_html.sh                   # 브라우저에서 대시보드 열기
```

## 🔄 데이터 파이프라인

**새로운 효율적 파이프라인:**
```
크롤링 → DB 저장 → 구조화된 TXT → JavaScript 처리 → JSON → 웹사이트
```

### 단계별 설명
1. **크롤링**: 니칸스포츠에서 NPB 경기 결과 수집
2. **DB 저장**: PostgreSQL에 경기 데이터 저장  
3. **구조화된 TXT**: 파이프(|) 구분자로 데이터 구조화
4. **JavaScript 처리**: Node.js로 TXT 파싱 및 가공
5. **JSON 생성**: 웹사이트용 JSON 파일 생성
6. **웹사이트 표시**: 정적 HTML에서 JSON 로드하여 표시

## 📊 수집 데이터

- **경기 결과**: 일별 NPB 경기 결과 (850+ 경기 수집)
- **순위표**: 경기 결과 기반 실시간 순위 계산
- **팀 통계**: 득점, 실점, 승률, 게임차
- **특수 경기**: 연장전, 무승부, 취소 경기

## 🗄️ 데이터베이스 구조

- **teams**: NPB 12개 팀 정보
- **games**: 경기 결과 및 상세 정보  
- **standings**: 시즌별 팀 순위 및 통계
- **crawl_logs**: 크롤링 활동 로그

## 📄 데이터 형식

### 구조화된 TXT
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
# 최신 TXT 파일
ls -la data/structured_txt/

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

- **로컬 실행**: `./run_html.sh`
- **GitHub Pages**: 자동 배포 지원
- **모바일 최적화**: 반응형 디자인
- **다크모드**: 테마 전환 지원

## 📝 라이선스

MIT License