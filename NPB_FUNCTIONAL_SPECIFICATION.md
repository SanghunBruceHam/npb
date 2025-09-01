# 📋 NPB 매직넘버 계산기 기능 명세서

## 🎯 프로젝트 개요
**NPB 매직넘버 계산기**는 기존 KBO 버전의 모든 기능을 NPB 리그 특성에 맞게 적용한 일본프로야구 전용 시스템입니다.

---

## 🏗️ 시스템 아키텍처

### 📁 코드 구조 (KBO 기반 → NPB 적용)

```
npb-magic-number/
├── 🌐 Frontend (새로 개발)
│   ├── npb-index.html           # NPB 전용 메인 페이지
│   ├── css/npb-styles.css       # NPB 테마 스타일
│   └── js/npb-main.js           # NPB 프론트엔드 로직
│
├── 📊 Core System (KBO 기능 적용)
│   ├── npb-calculate-magic-numbers.js    # NPB 매직넘버 계산
│   ├── npb-process-season-data.js        # NPB 시즌 데이터 처리  
│   ├── climax-series-calculator.js       # 클라이맥스 시리즈 계산
│   └── interleague-analyzer.js           # 교류전 분석
│
├── 📈 Analysis Modules (KBO 분석 적용)
│   ├── npb-weekly-analysis.js            # 주간 분석
│   ├── npb-clutch-analysis.js            # 클러치 분석
│   ├── npb-home-away-analysis.js         # 홈/원정 분석
│   ├── npb-series-analysis.js            # 시리즈 분석
│   ├── npb-monthly-analysis.js           # 월간 분석
│   └── npb-head-to-head.js               # 상대전적 (12x12)
│
├── 🗄️ Data Management (KBO 시스템 적용)
│   ├── npb-database.js                   # NPB SQLite DB 관리
│   ├── npb-backup-manager.js             # 백업 관리
│   ├── npb-daily-snapshot.js             # 일일 스냅샷
│   └── npb-data-validator.js             # 데이터 검증
│
├── 🕷️ Data Collection (새로 개발)
│   ├── npb-main-crawler.py              # NPB 메인 크롤러
│   ├── yahoo-sports-crawler.py          # 야후 스포츠 크롤러
│   └── npb-official-crawler.py          # NPB 공식 크롤러
│
└── 🎨 Visualization (KBO 차트 적용)
    ├── npb-rank-chart.js                # NPB 순위 차트
    ├── npb-scrollable-chart.js          # 스크롤 차트
    ├── npb-simple-chart.js              # 간단 차트
    └── magic-number-matrix.js           # 매직넘버 매트릭스
```

---

## 🏟️ NPB 전용 핵심 기능

### 🥇 **1. NPB 매직넘버 계산 시스템**

#### 1.1 리그 우승 매직넘버
**기능**: 각 리그 (CL/PL) 우승을 위한 매직넘버 계산
**KBO 대비 차이점**: 
- 6팀 리그 × 2개 (KBO는 10팀 단일 리그)
- 무승부 경기 제외한 승률 계산

```javascript
// NPB 우승 매직넘버 계산 로직
function calculateLeagueChampionMagic(team, leagueStandings) {
  const secondPlace = leagueStandings[1];
  const teamMaxWins = team.wins + team.remainingGames;
  const secondMaxWins = secondPlace.wins + secondPlace.remainingGames;
  return Math.max(0, secondMaxWins - team.wins + 1);
}
```

#### 1.2 클라이맥스 시리즈 진출 매직넘버
**기능**: CS 1단계 진출 (2,3위) 및 CS 파이널 직행 (1위) 매직넘버
**KBO 대비 차이점**: 
- 상위 3팀 진출 (KBO는 5팀)
- 1위팀 1승 어드밴티지 시스템

```javascript
// CS 진출 매직넘버 계산
function calculateCSMagicNumber(team, leagueStandings) {
  const fourthPlace = leagueStandings[3];
  const teamMaxWins = team.wins + team.remainingGames;
  const fourthMaxWins = fourthPlace.wins + fourthPlace.remainingGames;
  return Math.max(0, fourthMaxWins - team.wins + 1);
}
```

#### 1.3 일본시리즈 진출 시나리오
**기능**: CL/PL 각 리그 우승팀의 일본시리즈 진출 경로 분석
**신규 기능**: KBO에는 없는 NPB 전용 기능

### 🔄 **2. 교류전 (인터리그) 분석 시스템**

#### 2.1 교류전 승률 분석
**기능**: CL vs PL 교류전 성적 별도 분석
**KBO 대비 차이점**: KBO에는 없는 NPB 전용 기능

#### 2.2 교류전 영향 분석
**기능**: 교류전 결과가 각 리그 순위에 미치는 영향도 분석

### 📊 **3. 데이터 분석 모듈 (KBO 기능 적용)**

#### 3.1 주간/월간 성적 분석 
**KBO 기능 적용**: `weekly-analysis.js` → `npb-weekly-analysis.js`
- 주간별 성적 패턴 분석
- 요일별 승률 통계
- 최근 10경기 트렌드

#### 3.2 클러치 상황 분석
**KBO 기능 적용**: `clutch-analysis.js` → `npb-clutch-analysis.js`
- 1점차, 2점차 경기 승률
- 연장전 성적 (NPB 12회 연장까지)
- 접전 상황 성적 분석

#### 3.3 홈/원정 성적 분석
**KBO 기능 적용**: `home-away-analysis.js` → `npb-home-away-analysis.js`
- 홈구장별 승률 분석
- 원정 성적 비교
- 홈 어드밴티지 계산

#### 3.4 시리즈 성적 분석
**KBO 기능 적용**: `series-analysis.js` → `npb-series-analysis.js`
- 3경기 시리즈 승률
- 연속 경기 성적 패턴

#### 3.5 상대전적 분석 (12x12 매트릭스)
**KBO 기능 적용**: `enhanced-head-to-head.js` → `npb-head-to-head.js`
**NPB 특화**: 12팀 × 12팀 상대전적 매트릭스 (KBO 10팀에서 확장)

---

## 🎨 사용자 인터페이스 (UI/UX)

### 🖼️ **메인 대시보드 (새로 개발)**

#### 4.1 NPB 리그별 순위표
**KBO 기능 적용**: 단일 순위표 → CL/PL 분리 표시
```html
<div class="league-standings">
  <div class="central-league">...</div>
  <div class="pacific-league">...</div>
</div>
```

#### 4.2 매직넘버 매트릭스
**KBO 기능 적용**: `magic-number-matrix` 컴포넌트
- CL/PL 리그별 매직넘버 표시
- 클라이맥스 시리즈 진출 상황 시각화

#### 4.3 팀 로고 및 컬러 테마
**새로 개발**: NPB 12개 팀 전용 디자인
```javascript
const npbTeams = {
  // Central League
  "요미우리": { fullName: "요미우리 자이언츠", color: "#F97709", league: "CL" },
  "한신": { fullName: "한신 타이거스", color: "#FFE201", league: "CL" },
  "중일": { fullName: "중일 드래곤즈", color: "#002C5B", league: "CL" },
  "야쿠르트": { fullName: "야쿠르트 스왈로즈", color: "#008B45", league: "CL" },
  "DeNA": { fullName: "요코하마 DeNA 베이스타즈", color: "#005BAB", league: "CL" },
  "히로시마": { fullName: "히로시마 토요 카프", color: "#BE0026", league: "CL" },
  
  // Pacific League  
  "소프트뱅크": { fullName: "후쿠오카 소프트뱅크 호크스", color: "#F8D022", league: "PL" },
  "로데": { fullName: "지바 로데 마린즈", color: "#000000", league: "PL" },
  "오릭스": { fullName: "오릭스 버팔로즈", color: "#B51E36", league: "PL" },
  "라쿠텐": { fullName: "토호쿠 라쿠텐 골든 이글스", color: "#7E0428", league: "PL" },
  "닛폰햄": { fullName: "홋카이도 닛폰햄 파이터즈", color: "#2E5985", league: "PL" },
  "세이부": { fullName: "사이타마 세이부 라이온즈", color: "#1B3B8B", league: "PL" }
};
```

### 📱 **모바일 최적화 (KBO 기능 적용)**
- 반응형 레이아웃
- 터치 친화적 인터페이스  
- PWA 지원

---

## 🗄️ 데이터 모델 및 구조

### 📋 **NPB 전용 데이터 파일**

#### 5.1 NPB 통합 서비스 데이터
**파일명**: `npb-service-data.json`
**KBO 기능 적용**: `service-data.json` 구조 기반

```json
{
  "lastUpdated": "2025-08-27T15:30:00+09:00",
  "season": "2025",
  "centralLeague": [
    {
      "team": "요미우리",
      "wins": 65, "losses": 45, "draws": 2,
      "winRate": 0.591,
      "rank": 1,
      "magicNumbers": {
        "champion": 8,
        "climaxSeries": 0
      }
    }
  ],
  "pacificLeague": [...],
  "interleagueRecords": {...}
}
```

#### 5.2 클라이맥스 시리즈 시나리오
**파일명**: `climax-series-scenarios.json`
**신규 기능**: NPB 전용 플레이오프 시나리오

```json
{
  "centralLeague": {
    "firstStage": {
      "team2": "한신", "team3": "중일",
      "probability": { "한신": 0.65, "중일": 0.35 }
    },
    "finalStage": {
      "champion": "요미우리",
      "challenger": "TBD",
      "advantage": 1
    }
  }
}
```

#### 5.3 교류전 기록
**파일명**: `interleague-records.json`  
**신규 기능**: NPB 전용 교류전 데이터

### 🗂️ **SQLite 데이터베이스 (KBO 기능 적용)**
**KBO 기능 적용**: `enhanced-kbo-database.js` → `npb-database.js`

```sql
-- NPB 게임 기록 테이블
CREATE TABLE npb_games (
  id INTEGER PRIMARY KEY,
  date TEXT,
  home_team TEXT,
  away_team TEXT,
  home_score INTEGER,
  away_score INTEGER,
  result TEXT, -- 'W', 'L', 'D' (무승부 포함)
  league_type TEXT -- 'CL', 'PL', 'INTERLEAGUE'
);

-- NPB 팀 정보 테이블
CREATE TABLE npb_teams (
  team_code TEXT PRIMARY KEY,
  full_name TEXT,
  league TEXT, -- 'CL' or 'PL'
  color TEXT,
  stadium TEXT
);
```

---

## 🕷️ 데이터 수집 시스템

### 🔍 **NPB 크롤러 (새로 개발)**

#### 6.1 NPB 공식 사이트 크롤러
**파일명**: `npb-official-crawler.py`
**기능**: NPB 공식 순위표 및 경기 결과 수집

#### 6.2 야후 스포츠 크롤러  
**파일명**: `yahoo-sports-crawler.py`
**기능**: 상세 경기 기록 및 선수 통계

#### 6.3 데이터 처리 파이프라인
**KBO 기능 적용**: `process-season-data.js` → `npb-process-season-data.js`

```javascript
// NPB 데이터 처리 플로우
function processNPBSeasonData() {
  1. 원시 크롤링 데이터 로드
  2. 무승부 처리 및 승률 계산
  3. CL/PL 리그별 순위 계산
  4. 교류전 기록 분리 처리
  5. 클라이맥스 시리즈 시나리오 생성
  6. JSON/SQLite 저장
}
```

---

## 🤖 자동화 및 배포

### ⏰ **GitHub Actions (KBO 기능 적용)**
**워크플로우**: `.github/workflows/npb-auto-crawling.yml`
**KBO 대비 차이점**: JST 시간대, NPB 경기 스케줄 적용

```yaml
# NPB 자동 업데이트 스케줄 (JST 기준)
schedule:
  - cron: '0 6 * * *'   # JST 15:00 
  - cron: '30 7 * * *'  # JST 16:30
  - cron: '0 9 * * *'   # JST 18:00
  - cron: '30 10 * * *' # JST 19:30
  - cron: '0 12 * * *'  # JST 21:00
```

### 📊 **백업 및 히스토리 (KBO 기능 적용)**
**KBO 기능 적용**: `backup-manager.js` → `npb-backup-manager.js`
- 일일 NPB 순위 스냅샷
- 클라이맥스 시리즈 진출 상황 기록

---

## 📈 성능 및 최적화

### ⚡ **프론트엔드 최적화 (KBO 기능 적용)**
**KBO 기능 적용**: EventManager 클래스, 메모리 관리 시스템
- 이벤트 리스너 자동 정리
- 디버그/프로덕션 모드 분리
- 지연 로딩 및 캐싱

### 🖥️ **백엔드 최적화 (KBO 기능 적용)**  
- SQLite 인덱스 최적화
- JSON 데이터 압축
- 배치 처리 시스템

---

## 🧪 품질 보증

### 🔍 **테스트 전략**
**KBO 기능 적용**: 기존 테스트 케이스를 NPB에 맞게 수정

```javascript
// NPB 매직넘버 계산 테스트
describe('NPB Magic Number Calculator', () => {
  it('should calculate CL champion magic number correctly', () => {
    // 센트럴 리그 우승 매직넘버 테스트
  });
  
  it('should calculate Climax Series scenarios', () => {
    // 클라이맥스 시리즈 시나리오 테스트
  });
  
  it('should handle draws in win rate calculation', () => {
    // 무승부 포함 승률 계산 테스트
  });
});
```

### 📊 **데이터 품질 검증**
**KBO 기능 적용**: `npb-data-validator.js`
- NPB 데이터 무결성 검사
- 무승부 경기 처리 검증
- 교류전 기록 일관성 확인

---

## 🔧 개발 환경 설정

### 📦 **의존성 관리 (package.json)**
```json
{
  "name": "npb-magic-number-calculator",
  "scripts": {
    "npb-process": "node npb-process-season-data.js",
    "npb-crawl": "python npb-main-crawler.py", 
    "npb-analysis": "node npb-weekly-analysis.js && node npb-clutch-analysis.js",
    "npb-backup": "node npb-backup-manager.js",
    "npb-test": "jest npb-tests/",
    "npb-serve": "http-server -p 8080"
  }
}
```

### 🛠️ **개발 도구**
- **ESLint**: NPB 전용 코딩 표준
- **Prettier**: 코드 포맷팅
- **Jest**: 유닛 테스트 프레임워크
- **Python**: 크롤링 스크립트

---

## 📋 기능 개발 우선순위

### 🎯 **Phase 1: 핵심 기능 (필수)**
- [ ] NPB 팀 데이터 설정
- [ ] CL/PL 리그별 순위 시스템  
- [ ] 기본 매직넘버 계산
- [ ] 클라이맥스 시리즈 계산
- [ ] NPB 메인 크롤러

### 🚀 **Phase 2: 분석 기능 (중요)**  
- [ ] 주간/월간 분석 (KBO 적용)
- [ ] 클러치 분석 (KBO 적용)
- [ ] 홈/원정 분석 (KBO 적용)
- [ ] 상대전적 12x12 매트릭스
- [ ] 교류전 분석

### 🎨 **Phase 3: UI/UX (중요)**
- [ ] NPB 전용 HTML/CSS 개발
- [ ] 리그별 분리 인터페이스
- [ ] 모바일 반응형 적용
- [ ] PWA 기능 (KBO 적용)

### 🔧 **Phase 4: 고급 기능 (선택)**
- [ ] 일본시리즈 시뮬레이션
- [ ] 선수 개별 통계
- [ ] 다국어 지원 (일본어)
- [ ] 실시간 알림 시스템

---

## 📊 KBO vs NPB 기능 매핑표

| 기능 분류 | KBO 기능 | NPB 적용 | 개발 난이도 | 우선순위 |
|---------|---------|---------|------------|----------|
| **매직넘버 계산** | 단일리그 10팀 | 2리그 6팀씩 | ⭐⭐⭐ | 1 |
| **플레이오프** | 5팀 PO | 3팀 CS + 1승 어드밴티지 | ⭐⭐⭐⭐ | 1 |
| **순위표** | 10팀 단일표 | CL/PL 분리표 | ⭐⭐ | 1 |
| **상대전적** | 10x10 매트릭스 | 12x12 매트릭스 | ⭐⭐ | 2 |
| **주간 분석** | KBO 적용 | NPB 적용 | ⭐⭐ | 2 |
| **클러치 분석** | KBO 적용 | NPB 적용 + 무승부 | ⭐⭐⭐ | 2 |
| **홈/원정 분석** | KBO 적용 | NPB 적용 | ⭐⭐ | 2 |
| **교류전 분석** | 없음 | NPB 신규 개발 | ⭐⭐⭐⭐ | 2 |
| **데이터 크롤링** | KBO 사이트 | NPB 사이트 | ⭐⭐⭐⭐⭐ | 1 |
| **자동화** | KST 기준 | JST 기준 | ⭐⭐ | 3 |
| **UI/UX** | KBO 테마 | NPB 테마 | ⭐⭐⭐ | 3 |

**난이도**: ⭐(쉬움) ~ ⭐⭐⭐⭐⭐(어려움)  
**우선순위**: 1(필수) > 2(중요) > 3(선택)

---

## 📞 기술 지원 및 참고 자료

### 📚 **KBO 코드 참고 파일 목록**
- `script.js` → `npb-main.js` (프론트엔드 로직)
- `calculate-magic-numbers.js` → `npb-calculate-magic-numbers.js`
- `process-season-data.js` → `npb-process-season-data.js`  
- `weekly-analysis.js` → `npb-weekly-analysis.js`
- `clutch-analysis.js` → `npb-clutch-analysis.js`
- `home-away-analysis.js` → `npb-home-away-analysis.js`
- `enhanced-head-to-head.js` → `npb-head-to-head.js`
- `backup-manager.js` → `npb-backup-manager.js`

### 🔗 **외부 참고 자료**
- NPB 공식 사이트: http://npb.or.jp/
- NPB STATS: http://npbstats.com/
- 클라이맥스 시리즈 규정: Wikipedia 참조

---

## 📅 문서 관리 정보

**📅 최초 작성**: 2025년 8월 27일  
**👨‍💻 작성자**: SanghunBruceHam  
**📋 기준 버전**: KBO 매직넘버 계산기 v2.0.0  
**🎯 목표 버전**: NPB 매직넘버 계산기 v1.0.0  
**📂 연관 문서**: NPB_PROJECT_DOCUMENTATION.md

---

*이 기능 명세서는 KBO 매직넘버 계산기의 모든 기능을 NPB에 적용하기 위한 종합 개발 가이드입니다. 각 기능별 개발 우선순위와 구현 방법을 상세히 제시하고 있습니다.*