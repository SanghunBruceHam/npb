# 📊 NPB 매직넘버 프로젝트 종합 문서화

## 🎯 프로젝트 개요

### 📖 프로젝트 정의
**NPB 매직넘버 계산기**는 2025 일본프로야구(NPB) 리그의 실시간 매직넘버, 클라이맥스 시리즈 진출 조건, 순위 분석을 자동화하는 종합 시스템입니다.

### 🌟 핵심 가치 제안
- **실시간 매직넘버 계산**: 각 팀의 우승 및 클라이맥스 시리즈 진출 매직넘버를 실시간으로 제공
- **양대 리그 분석**: 센트럴 리그(CL)와 퍼시픽 리그(PL) 별도 분석 시스템
- **클라이맥스 시리즈 시뮬레이션**: NPB 특유의 플레이오프 시스템 분석
- **종합 데이터 분석**: 홈/원정 성적, 교류전 성적, 상대전적 등 심층 분석 제공
- **자동화된 데이터 수집**: Python 크롤러를 통한 자동 데이터 갱신
- **Progressive Web App**: 모바일 최적화 웹 애플리케이션

---

## 🏟️ NPB 리그 시스템 분석

### 📊 리그 구조

#### 센트럴 리그 (Central League, CL)
1. **요미우리 자이언츠** (읽미우리)
2. **한신 타이거스** (한신)  
3. **중일 드래곤즈** (중일)
4. **야쿠르트 스왈로즈** (야쿠르트)
5. **요코하마 DeNA 베이스타즈** (DeNA)
6. **히로시마 토요 카프** (히로시마)

#### 퍼시픽 리그 (Pacific League, PL)
1. **후쿠오카 소프트뱅크 호크스** (소프트뱅크)
2. **지바 로데 마린즈** (로데)
3. **오릭스 버팔로즈** (오릭스)
4. **토호쿠 라쿠텐 골든 이글스** (라쿠텐)
5. **홋카이도 닛폰햄 파이터즈** (닛폰햄)
6. **사이타마 세이부 라이온즈** (세이부)

### 🏆 플레이오프 시스템 (클라이맥스 시리즈)

#### 클라이맥스 시리즈 1단계
- **참가팀**: 각 리그 2위, 3위
- **형식**: 3전 2승제
- **홈어드밴티지**: 2위팀 (2경기 홈게임)

#### 클라이맥스 시리즈 파이널
- **참가팀**: 각 리그 1위 vs 1단계 승리팀
- **형식**: 6전 4승제
- **특별규칙**: 1위팀 1승 어드밴티지 (3승만 하면 우승)
- **홈어드밴티지**: 1위팀 (최대 4경기 홈게임)

#### 일본시리즈
- **참가팀**: 센트럴 리그 우승팀 vs 퍼시픽 리그 우승팀  
- **형식**: 7전 4승제
- **홈어드밴티지**: 전년도 일본시리즈 우승 리그 (또는 교대)

### 📈 NPB 특징적 시스템들

#### 1. 교류전 (인터리그)
- **시기**: 5월-6월 (약 3주간)
- **방식**: 센트럴 vs 퍼시픽 리그 팀 간 대결
- **중요성**: 전체 순위에 직접 영향, 일본시리즈 홈어드밴티지 결정 요소

#### 2. 무승부 제도
- **연장**: 12회까지 연장 (일부 경우 15회)
- **무승부**: 시간/이닝 제한으로 경기 종료
- **순위 영향**: 승률 계산에서 무승부는 제외

#### 3. 지명타자 (DH) 제도
- **퍼시픽 리그**: DH 사용
- **센트럴 리그**: DH 사용 안함
- **교류전/일본시리즈**: 홈팀 기준으로 적용

---

## 🧮 NPB 매직넘버 계산 방법론

### 🥇 리그 우승 매직넘버

#### 기본 공식
```javascript
// 리그 우승 매직넘버 계산
function calculateLeagueChampionMagicNumber(team, league) {
  const secondPlaceTeam = getSecondPlaceTeam(league);
  const teamMaxWins = team.wins + team.remainingGames;
  const secondMaxWins = secondPlaceTeam.wins + secondPlaceTeam.remainingGames;
  
  // 2위팀이 모든 경기를 이겨도 따라올 수 없는 승수
  return Math.max(0, secondMaxWins - team.wins + 1);
}
```

### 🎯 클라이맥스 시리즈 진출 매직넘버

#### 1단계 진출 (2,3위) 매직넘버
```javascript
// 클라이맥스 시리즈 1단계 진출 매직넘버
function calculateCSMagicNumber(team, league) {
  const fourthPlaceTeam = getFourthPlaceTeam(league);
  const teamMaxWins = team.wins + team.remainingGames;
  const fourthMaxWins = fourthPlaceTeam.wins + fourthPlaceTeam.remainingGames;
  
  // 4위팀이 모든 경기를 이겨도 따라올 수 없는 승수
  return Math.max(0, fourthMaxWins - team.wins + 1);
}
```

#### 파이널 직행 (1위) 매직넘버
- 리그 우승과 동일
- 1승 어드밴티지 + 홈어드밴티지 획득

### 📊 트래직넘버 (탈락 넘버)

#### 리그 우승 트래직넘버
```javascript
function calculateChampionTragicNumber(team, league) {
  const firstPlaceTeam = getFirstPlaceTeam(league);
  const teamMaxWins = team.wins + team.remainingGames;
  const firstCurrentWins = firstPlaceTeam.wins;
  
  // 1위팀 현재 승수를 넘을 수 없게 되는 패수
  return Math.max(0, teamMaxWins - firstCurrentWins);
}
```

#### 클라이맥스 시리즈 탈락 트래직넘버
```javascript
function calculateCSTragicNumber(team, league) {
  const thirdPlaceTeam = getThirdPlaceTeam(league);
  const teamMaxWins = team.wins + team.remainingGames;
  const thirdCurrentWins = thirdPlaceTeam.wins;
  
  // 3위팀 현재 승수를 넘을 수 없게 되는 패수
  return Math.max(0, teamMaxWins - thirdCurrentWins);
}
```

---

## 🔗 NPB 데이터 소스 분석

### 📊 주요 데이터 소스

#### 1. NPB 공식 사이트
- **URL**: `https://npb.jp/`
- **데이터**: 공식 순위표, 경기 결과, 개인 기록
- **업데이트**: 경기 종료 후 실시간
- **신뢰도**: ★★★★★

#### 2. 야후 재팬 스포츠
- **URL**: `https://baseball.yahoo.co.jp/npb/`
- **데이터**: 상세 경기 기록, 선수 통계
- **업데이트**: 실시간
- **신뢰도**: ★★★★★

#### 3. 스포츠 나비
- **URL**: `https://baseball.yahoo.co.jp/npb/`
- **데이터**: 경기 스케줄, 순위 변동
- **업데이트**: 실시간
- **신뢰도**: ★★★★☆

#### 4. 베이스볼 레퍼런스 (영문)
- **URL**: `https://www.baseball-reference.com/register/league.cgi?id=b0b7a7b7`
- **데이터**: 세이버메트릭스 통계
- **업데이트**: 일일
- **신뢰도**: ★★★★☆

### 🕷️ 크롤링 전략

#### 데이터 우선순위
1. **경기 결과** (필수) - NPB 공식 사이트
2. **순위표** (필수) - NPB 공식 사이트  
3. **개별 경기 상세** (중요) - 야후 스포츠
4. **선수 기록** (선택) - 베이스볼 레퍼런스

#### 크롤링 주의사항
- **로봇 배제 표준 (robots.txt)** 준수
- **요청 간격**: 최소 2-3초
- **User-Agent**: 적절한 브라우저 식별자 사용
- **IP 차단 방지**: VPN/프록시 고려

---

## 🏗️ 시스템 아키텍처 설계

### 📁 프로젝트 구조 (NPB 버전)

```
npb/
├── 🌐 루트 레벨 (GitHub Pages 호스팅)
│   ├── index.html                 # 메인 대시보드
│   ├── README.md                  # NPB 프로젝트 소개
│   ├── NPB_PROJECT_DOCUMENTATION.md  # 이 종합 문서
│   ├── package.json              # Node.js 의존성 (NPB 설정)
│   ├── CNAME                     # npb-dashboard.co.kr
│   └── config/                   # 📂 NPB 설정 파일
│       ├── environment.js        # NPB 환경 설정
│       ├── npb-teams.js          # NPB 팀 정보
│       ├── paths.js              # JavaScript 경로 관리
│       └── paths.py              # Python 경로 관리
│
├── 🎯 magic-number/ (NPB 핵심 애플리케이션)
│   ├── index.html               # NPB 전용 웹 페이지
│   ├── css/
│   │   └── npb-styles.css      # NPB 테마 스타일
│   ├── 💻 js/ (JavaScript 모듈)
│   │   ├── npb-script.js           # NPB 프론트엔드 로직
│   │   ├── process-npb-data.js     # NPB 데이터 처리 엔진
│   │   ├── calculate-npb-magic.js  # NPB 매직넘버 계산
│   │   ├── climax-series-calc.js   # 클라이맥스 시리즈 계산
│   │   ├── interleague-analysis.js # 교류전 분석
│   │   ├── league-comparison.js    # CL vs PL 비교
│   │   └── [NPB 전용 분석 모듈들]
│   │
│   ├── 📊 data/ (NPB 데이터 저장소)
│   │   ├── 2025-npb-season.txt     # NPB 경기 결과 원본
│   │   ├── npb-service-data.json   # NPB 통합 서비스 데이터
│   │   ├── central-league.json     # 센트럴 리그 순위
│   │   ├── pacific-league.json     # 퍼시픽 리그 순위
│   │   ├── interleague-records.json # 교류전 기록
│   │   ├── climax-series-scenarios.json # CS 시나리오
│   │   └── npb-head-to-head.json   # NPB 상대전적
│   │
│   ├── 🔍 crawlers/ (NPB 데이터 수집)
│   │   ├── npb-main-crawler.py     # NPB 메인 크롤러
│   │   ├── yahoo-npb-crawler.py    # 야후 스포츠 크롤러
│   │   ├── npb-official-crawler.py # NPB 공식 크롤러
│   │   └── requirements.txt
│   │
│   ├── 🖼️ images/npb-teams/       # NPB 팀 로고 (12팀)
│   │   ├── central/               # 센트럴 리그 로고
│   │   └── pacific/               # 퍼시픽 리그 로고
│   │
│   └── 📚 docs/                  # NPB 문서
│       ├── npb-rules.md          # NPB 룰 설명
│       ├── climax-series.md      # 클라이맥스 시리즈 가이드
│       └── interleague-guide.md  # 교류전 가이드
│
└── .github/workflows/
    └── npb-auto-crawling.yml     # NPB 자동화 워크플로우
```

### 🛠️ NPB 전용 기술 스택

#### 🎨 Frontend (NPB 커스터마이징)
- **NPB 테마**: 일본 야구 특화 디자인
- **다국어 지원**: 일본어/한국어 버전
- **리그별 UI**: CL/PL 구분된 인터페이스

#### 🖥️ Backend (NPB 데이터 처리)
- **NPB 데이터 모델**: 무승부, DH 제도 반영
- **교류전 계산**: 인터리그 승률 별도 관리
- **클라이맥스 시리즈**: NPB 특수 플레이오프 로직

#### 🤖 자동화 (NPB 스케줄)
- **일본 시간 기준**: JST 타임존 적용
- **NPB 경기 일정**: 다양한 경기 시간 대응
- **무승부 처리**: 연장전 규칙 반영

---

## 📅 개발 로드맵

### 🎯 Phase 1: 기반 구축 (1-2주)
- [ ] NPB 팀 데이터 설정
- [ ] 기본 크롤러 개발 (NPB 공식 사이트)
- [ ] 센트럴/퍼시픽 리그 분리 로직
- [ ] 기본 매직넘버 계산 시스템

### 🚀 Phase 2: 핵심 기능 (2-3주)  
- [ ] 클라이맥스 시리즈 계산 로직
- [ ] 교류전 분석 시스템
- [ ] NPB 전용 UI/UX 구현
- [ ] 무승부 제도 반영

### 🎨 Phase 3: 고급 기능 (3-4주)
- [ ] 상대전적 매트릭스 (12x12)
- [ ] 일본시리즈 시뮬레이션
- [ ] 선수 개별 통계 (옵션)
- [ ] PWA 최적화

### 🔧 Phase 4: 운영 및 최적화 (지속)
- [ ] 자동화 시스템 안정화
- [ ] 성능 모니터링
- [ ] 사용자 피드백 반영
- [ ] 시즌 중 지속적 업데이트

---

## 🔍 기술적 도전과제

### 🌏 NPB 특유의 복잡성

#### 1. 무승부 처리
```javascript
// NPB 승률 계산 (무승부 제외)
function calculateNPBWinRate(wins, losses, draws) {
  const totalDecisiveGames = wins + losses;
  return totalDecisiveGames > 0 ? wins / totalDecisiveGames : 0;
}
```

#### 2. 교류전 승률 관리
```javascript
// 교류전 기록 별도 관리
const interleagueRecord = {
  centralVsPacific: {...},
  pacificVsCentral: {...}
};
```

#### 3. 클라이맥스 시리즈 시뮬레이션
```javascript
// 1위팀 1승 어드밴티지 반영
function simulateCSFinal(firstPlace, winner1stage) {
  firstPlace.advantageWins = 1; // 1위팀 어드밴티지
  return simulateSeries(firstPlace, winner1stage, 4); // 4승까지
}
```

### 🌐 데이터 소스 다양성
- **일본어 웹사이트**: 텍스트 파싱 복잡성
- **시간대 이슈**: JST vs KST 변환
- **다양한 데이터 포맷**: 통일된 처리 필요

---

## 📊 성공 지표 및 KPI

### 🎯 기능적 목표
- [ ] 12개 NPB 팀 완벽 지원
- [ ] 실시간 매직넘버 계산 (<5분 지연)
- [ ] 클라이맥스 시리즈 시나리오 제공
- [ ] 교류전 승률 정확한 반영

### 📈 성능 목표  
- [ ] 페이지 로딩 시간 3초 이내
- [ ] 모바일 반응성 95점 이상
- [ ] 데이터 정확도 99.9% 이상
- [ ] 일일 업타임 99% 이상

### 👥 사용자 목표
- [ ] 일일 방문자 300명 이상 (초기)
- [ ] 평균 세션 시간 3분 이상
- [ ] 재방문율 60% 이상
- [ ] 모바일 트래픽 70% 이상

---

## 🔒 위험 관리 및 대응

### ⚠️ 주요 위험 요소

#### 1. 데이터 소스 변경
- **위험도**: 높음
- **영향**: 크롤링 중단
- **대응**: 다중 데이터 소스 확보

#### 2. NPB 규정 변경  
- **위험도**: 중간
- **영향**: 계산 로직 오류
- **대응**: 규정 모니터링 시스템

#### 3. 서버 과부하
- **위험도**: 낮음  
- **영향**: 서비스 중단
- **대응**: GitHub Pages + CDN 활용

### 🛡️ 백업 계획
- **일일 데이터 백업**: 자동화
- **코드 버전 관리**: Git 분산 백업  
- **설정 파일 보존**: 환경별 분리 관리

---

## 🤝 커뮤니티 및 기여

### 👥 대상 사용자
- **NPB 팬**: 일본 프로야구 애호가
- **데이터 분석가**: 스포츠 통계 전문가  
- **개발자**: 오픈소스 기여자
- **언론/미디어**: 스포츠 기자 및 해설자

### 📝 기여 가이드라인
- **코드 표준**: ESLint + Prettier
- **커밋 메시지**: Conventional Commits
- **문서화**: JSDoc + Markdown
- **테스트**: Jest 단위 테스트

---

## 📞 연락처 및 지원

### 🔗 프로젝트 링크
- **웹사이트**: https://npb-dashboard.co.kr/
- **GitHub**: https://github.com/SanghunBruceHam/npb
- **문서**: 이 파일 및 연관 문서들

### 📧 개발자 연락처
- **GitHub**: @SanghunBruceHam
- **이메일**: GitHub 프로필 참조

---

## 📅 문서 관리

**📅 최초 작성**: 2025년 8월 27일  
**👨‍💻 작성자**: SanghunBruceHam  
**🌐 프로젝트 홈페이지**: https://npb-dashboard.co.kr/  
**📂 GitHub 저장소**: https://github.com/SanghunBruceHam/npb

---

*이 문서는 NPB 매직넘버 프로젝트의 전체적인 계획과 설계를 담고 있는 종합 기술 문서입니다. NPB 특유의 복잡한 시스템을 반영하여 KBO 버전에서 대폭 개선된 내용을 포함하고 있습니다.*