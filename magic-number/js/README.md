# KBO JavaScript 📜

KBO 매직넘버 프로젝트의 모든 JavaScript 파일들을 통합 관리합니다.

## 📁 파일 구조

```
js/
├── process-season-data.js     # 🔧 메인 데이터 처리 엔진
├── generate-magic-matrix.js   # 📊 매직넘버 매트릭스 생성기
├── fix-encoding.js           # 🔤 인코딩 문제 해결
├── script.js                 # 🌐 웹 UI 스크립트 (2,200+ 줄)
└── README.md                 # 📖 이 문서
```

## 🎯 스크립트별 상세 기능

### 1. process-season-data.js
**핵심 데이터 처리 엔진**

```bash
node process-season-data.js
```

**기능:**
- `../data/YYYY-season-data-clean.txt` 파일에서 경기 결과 파싱
- 팀별 통계 계산 (승, 패, 무, 승률, 홈/원정 기록)
- 상대전적 매트릭스 자동 생성
- 매직넘버 자동 계산 (우승, 플레이오프, 탈락)
- 순위표 및 게임차 실시간 계산
- 잔여경기 및 최대가능승수 산출

**출력 파일:**
- `../data/service-data.json` - 통합 웹서비스 데이터
- `../data/kbo-rankings.json` - 웹서비스용 순위 데이터  
- `../data/kbo-records.json` - 웹서비스용 상대전적 데이터

**데이터 흐름:**
```
../data/2025-season-data-clean.txt → 파싱 → 통계계산 → JSON 생성
```

### 2. generate-magic-matrix.js
**매직넘버 매트릭스 생성기**

```bash
node generate-magic-matrix.js
```

**기능:**
- `../data/service-data.json`을 기반으로 나무위키 스타일 매직넘버 매트릭스 생성
- 각 팀이 각 순위(1위~10위)를 달성하기 위한 매직넘버 계산
- 시각적 구분을 위한 타입 분류 (magic, competitive, tragic, clinched, eliminated)
- 팀 로고 매핑 및 레전드 정보 자동 포함

**출력 파일:**
- `../data/magic-matrix-data.json` - 매직넘버 매트릭스 데이터

**색상 코드:**
- `#7dd87d` - 매직넘버 (magic)
- `#ffff7d` - 경합상황 (competitive) 
- `#ff7d7d` - 트래직넘버 (tragic)
- `#4169e1` - 확정상황 (clinched)
- `#808080` - 탈락확정 (eliminated)

### 3. fix-encoding.js
**인코딩 문제 해결 도구**

```bash
node fix-encoding.js
```

**기능:**
- 크롤링 과정에서 발생한 한글 인코딩 문제 자동 해결
- 깨진 팀명 복원 (두산, 삼성, 한화, 롯데, 키움 등)
- `../data/YYYY-season-data-clean.txt` 파일의 UTF-8 인코딩 정상화

### 4. script.js
**웹 UI 메인 스크립트 (2,200+ 줄)**

**기능:**
- KBO 팀 데이터 및 로고 관리
- 메모리 관리를 위한 이벤트 리스너 관리자 (`EventManager` 클래스)
- 실시간 데이터 로딩 및 캐싱
- 반응형 순위표 렌더링
- 매직넘버 매트릭스 시각화
- 상대전적 분석 차트
- PWA 기능 (오프라인 지원, 설치 가능)
- 구글 애널리틱스 연동
- 에러 처리 및 알림 시스템

**주요 클래스/함수:**
- `EventManager` - 이벤트 리스너 관리
- `Utils.formatTeamName()` - 팀명 포맷팅
- `loadStandings()` - 순위 데이터 로딩
- `renderMagicMatrix()` - 매트릭스 렌더링
- `showNotification()` - 알림 표시

## 🔄 권장 실행 순서

```bash
# magic-number/js 폴더에서 실행
cd magic-number/js

# 1. 인코딩 문제 해결 (필요시)
node fix-encoding.js

# 2. 메인 데이터 처리 (핵심)
node process-season-data.js

# 3. 매직넘버 매트릭스 생성
node generate-magic-matrix.js

# 4. 웹브라우저에서 확인
# ../index.html 열기
```

## 📋 기술 스택

### 백엔드 스크립트 (Node.js)
- **fs** - 파일 시스템 작업
- **path** - 경로 처리
- **내장 모듈만 사용** - 외부 의존성 없음

### 프론트엔드 스크립트 (Vanilla JavaScript)
- **ES6+** - 모던 JavaScript
- **Fetch API** - 데이터 로딩
- **DOM API** - 동적 UI 렌더링
- **Service Worker** - PWA 기능

## ⚙️ 설정값

### process-season-data.js 핵심 설정
- `totalGamesPerSeason: 144` - 정규시즌 총 경기수
- `gamesPerOpponent: 16` - 팀별 상대 경기수
- `playoffSpots: 5` - 플레이오프 진출 팀수
- `typicalPlayoffWins: 80` - 플레이오프 진출 기준 승수
- `typicalChampionshipWins: 87` - 우승 평균 승수

### script.js UI 설정
- **kboTeams** - 10개 팀 정보 (이름, 색상, 로고)
- **캐시 TTL** - 데이터 캐싱 유효 시간
- **반응형 브레이크포인트** - 모바일/태블릿/데스크톱

## 🎯 데이터 흐름도

```
../data/2025-season-data-clean.txt (원본)
    ↓ fix-encoding.js (필요시)
정제된 경기 데이터
    ↓ process-season-data.js (핵심)
../data/service-data.json, kbo-rankings.json, kbo-records.json
    ↓ generate-magic-matrix.js
../data/magic-matrix-data.json
    ↓ script.js (웹 UI)
실시간 매직넘버 웹사이트
```

## 🐛 트러블슈팅

### 파일 경로 문제
```bash
# 현재 위치 확인
pwd  # /Users/.../kbo/magic-number/js 이어야 함

# 데이터 파일 존재 확인
ls -la ../data/2025-season-data-clean.txt
ls -la ../data/*.json
```

### 인코딩 문제
```bash
# 파일 인코딩 확인
file -bi ../data/2025-season-data-clean.txt

# 인코딩 수정 실행
node fix-encoding.js
```

### 데이터 업데이트 안됨
```bash
# 캐시 삭제 (브라우저)
# Chrome: F12 → Network → Disable cache

# 강제 새로고침
# Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

## 📊 성능 최적화

### 파일 크기
- **process-season-data.js**: ~700줄 (핵심 로직)
- **generate-magic-matrix.js**: ~300줄 (매트릭스 생성)
- **script.js**: ~2,200줄 (UI 전체)
- **총합**: ~3,200줄의 효율적인 코드

### 메모리 관리
- `EventManager` 클래스로 이벤트 리스너 자동 정리
- JSON 데이터 캐싱으로 네트워크 요청 최소화
- DOM 조작 최적화 (DocumentFragment 사용)

## 📝 로그 예시

### 성공적인 실행
```
🚀 KBO 데이터 완전 자동화 처리 시작...
📖 경기 데이터 파싱 시작...
✅ 파싱 완료: 518경기, 최신 날짜: 2025-08-06
📊 팀별 통계 계산 중...
⚔️ 상대전적 계산 중...
🔮 매직넘버 계산 중...
💾 데이터 파일 저장 중...
🎉 KBO 데이터 완전 자동화 처리 완료!
```

### 매트릭스 생성
```
🚀 나무위키 스타일 매직넘버 매트릭스 데이터 생성 시작...
✅ 서비스 데이터 로드 완료
✅ 매트릭스 데이터 저장 완료
🎉 매트릭스 데이터 생성 완료!
📊 생성된 팀 수: 10
📅 데이터 기준일: 2025월 8월 06일 기준
```

---
**최종 업데이트**: 2025년 8월 7일  
**관련 프로젝트**: [KBO 매직넘버 계산기](../)