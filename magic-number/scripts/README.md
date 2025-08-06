# KBO Scripts 📜

KBO 매직넘버 프로젝트의 핵심 데이터 처리 스크립트들입니다.

## 📁 스크립트 목록

### 1. process-season-data.js
**메인 데이터 처리 스크립트**

```bash
node process-season-data.js
```

**기능:**
- `data/YYYY-season-data-clean.txt` 파일에서 경기 결과 파싱
- 팀별 통계 계산 (승, 패, 무, 승률, 홈/원정 기록)
- 상대전적 매트릭스 생성
- 매직넘버 자동 계산 (우승, 플레이오프, 탈락)
- 순위표 및 게임차 계산
- 최종 서비스 데이터를 `magic-number/assets/data/` 폴더에 출력

**출력 파일:**
- `service-data.json` - 통합 웹서비스 데이터
- `kbo-rankings.json` - 웹서비스용 순위 데이터  
- `kbo-records.json` - 웹서비스용 상대전적 데이터

### 2. generate-magic-matrix.js
**매직넘버 매트릭스 생성 스크립트**

```bash
node generate-magic-matrix.js
```

**기능:**
- `service-data.json`을 기반으로 나무위키 스타일 매직넘버 매트릭스 생성
- 각 팀이 각 순위(1위~9위)를 달성하기 위한 매직넘버 계산
- 시각적 구분을 위한 타입 분류 (magic, competitive, tragic, clinched, eliminated)
- 팀 로고 매핑 및 레전드 정보 포함

**출력 파일:**
- `magic-matrix-data.json` - 매직넘버 매트릭스 데이터

### 3. fix-encoding.js
**인코딩 수정 스크립트**

```bash
node fix-encoding.js
```

**기능:**
- 크롤링 과정에서 발생한 한글 인코딩 문제 해결
- 깨진 팀명 복원 (두산, 삼성, 한화, 롯데, 키움 등)
- `data/YYYY-season-data-clean.txt` 파일의 UTF-8 인코딩 정상화

## 🔄 실행 순서

정상적인 데이터 업데이트를 위한 권장 실행 순서:

```bash
# magic-number/scripts 폴더에서 실행
cd magic-number/scripts

# 1. 인코딩 문제 해결 (필요시)
node fix-encoding.js

# 2. 메인 데이터 처리
node process-season-data.js

# 3. 매직넘버 매트릭스 생성
node generate-magic-matrix.js
```

## 📋 의존성

모든 스크립트는 Node.js 내장 모듈만 사용:
- `fs` - 파일 시스템 작업
- `path` - 경로 처리

## 🎯 데이터 흐름

```
../../data/2025-season-data-clean.txt
    ↓ (fix-encoding.js)
정제된 경기 데이터
    ↓ (process-season-data.js)
../assets/data/*.json
    ↓ (generate-magic-matrix.js)
../assets/data/magic-matrix-data.json
```

## ⚙️ 설정값

### process-season-data.js 주요 설정
- `totalGamesPerSeason: 144` - 정규시즌 총 경기수
- `gamesPerOpponent: 16` - 팀별 상대 경기수
- `typicalPlayoffWins: 80` - 플레이오프 진출 기준 승수
- `typicalChampionshipWins: 87` - 우승 평균 승수

### generate-magic-matrix.js 색상 코드
- `#7dd87d` - 매직넘버 (magic)
- `#ffff7d` - 경합상황 (competitive)
- `#ff7d7d` - 트래직넘버 (tragic)
- `#4169e1` - 확정상황 (clinched)
- `#808080` - 탈락확정 (eliminated)

## 🐛 문제 해결

### 파일을 찾을 수 없는 경우
```bash
# 데이터 파일 경로 확인
ls -la ../../data/2025-season-data-clean.txt

# assets/data 폴더 구조 확인  
ls -la ../assets/data/
```

### 인코딩 문제 발생시
```bash
# 인코딩 수정 스크립트 실행
node fix-encoding.js

# 파일 인코딩 확인
file -bi ../../data/2025-season-data-clean.txt
```

## 📝 로그 예시

정상 실행시 출력되는 로그:
```
🚀 KBO 데이터 완전 자동화 처리 시작...
📖 경기 데이터 파싱 시작...
✅ 파싱 완료: 874경기, 최신 날짜: 2025-08-05
📊 팀별 통계 계산 중...
⚔️ 상대전적 계산 중...
🔮 매직넘버 계산 중...
💾 데이터 파일 저장 중...
🎉 KBO 데이터 완전 자동화 처리 완료!
```

---
**최종 업데이트**: 2025년 8월 6일  
**관련 프로젝트**: [KBO 매직넘버 계산기](../)