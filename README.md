# 🏆 KBO 매직넘버 계산기

> **2025 KBO 리그 실시간 매직넘버 계산기 & 데이터 자동화 시스템**

![KBO Logo](magic-number/icons/kbo-magic-number-icon.png)

## 📊 프로젝트 개요

KBO(한국야구위원회) 2025시즌의 매직넘버, 플레이오프 진출 조건, 우승 가능성을 실시간으로 계산하고 표시하는 웹 서비스입니다.

- **🌐 웹사이트**: https://kbo.mahalohana-bruce.com/magic-number/
- **🤖 자동 업데이트**: 매일 18:00, 22:00, 00:00 (KST)
- **📱 PWA 지원**: 모바일 앱으로 설치 가능

## 🏗️ 프로젝트 구조

```
📦 kbo/                          # 📌 이 프로젝트 (KBO 매직넘버)
├── 🌐 magic-number/             # 웹사이트 메인 폴더
│   ├── index.html              # 메인 웹페이지
│   ├── kbo-rankings.json       # 📊 실시간 데이터
│   ├── manifest.json           # PWA 설정
│   ├── sitemap.xml            # SEO 사이트맵
│   ├── robots.txt             # 검색엔진 설정
│   ├── rss.xml                # RSS 피드
│   └── icons/                 # PWA 아이콘들
│
├── 🤖 자동화 시스템/
│   ├── .github/workflows/      # GitHub Actions
│   ├── setup-cron.sh          # Linux/Mac 자동화
│   ├── setup-scheduler.ps1    # Windows 자동화
│   └── AUTOMATION_GUIDE.md    # 자동화 가이드
│
├── 🔧 스크래핑 도구/
│   ├── scrape-kbo-records.js   # 메인 스크래퍼
│   ├── scrape-kbo-final.js     # 최종 데이터 처리
│   ├── scrape-kbo-advanced.js  # 고급 스크래핑
│   └── scripts/               # 추가 유틸리티들
│
└── 📋 설정 파일들/
    ├── package.json           # Node.js 의존성
    ├── README.md             # 📌 이 파일
    └── AUTOMATION_GUIDE.md   # 사용 가이드
```

## 🚀 주요 기능

### 📊 실시간 데이터
- **팀 순위표**: 승, 패, 무, 승률, 게임차
- **매직넘버**: 우승/플레이오프 진출을 위한 필요 승수
- **홈/원정 성적**: 팀별 홈구장/원정 상세 기록
- **상대전적**: 팀간 직접 대결 기록
- **최근 10경기**: 팀별 최근 폼

### 🎯 고급 분석
- **플레이오프 진출 조건**: 72승 기준 매직넘버
- **1위 탈환 가능성**: 역대 1위 기준 필요 승률
- **우승 조건**: 실시간 우승 매직넘버 계산
- **잔여 경기 분석**: 남은 경기에서 필요한 승률

## 🤖 데이터 자동화

### 📅 업데이트 스케줄
- **18:00**: 경기 시작 전/중 업데이트
- **22:00**: 대부분 경기 종료 후
- **00:00**: 모든 경기 종료 후 최종 업데이트

### 🔄 자동화 방법
1. **GitHub Actions** (추천) - 이미 설정 완료 ✅
2. **Linux/Mac cron** - `./setup-cron.sh`
3. **Windows 스케줄러** - `.\setup-scheduler.ps1 -Install`

자세한 내용은 [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) 참조

## 🛠️ 기술 스택

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Data**: JSON (KBO 공식 홈페이지 스크래핑)
- **Automation**: GitHub Actions, Node.js, Bash/PowerShell
- **Scraping**: Axios, Cheerio
- **SEO**: Sitemap, RSS, Open Graph, PWA

## 📦 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/SanghunBruceHam/kbo.git
cd kbo
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 데이터 업데이트 (수동)
```bash
npm run update-data
```

### 4. 자동화 설정 (선택)
```bash
# Linux/Mac
./setup-cron.sh

# Windows (PowerShell)
.\setup-scheduler.ps1 -Install
```

## 🌐 배포

### GitHub Pages (현재)
- **URL**: https://kbo.mahalohana-bruce.com/magic-number/
- **자동 배포**: GitHub Actions으로 자동화됨

### 로컬 서버
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server 필요)
npx http-server magic-number/

# 접속: http://localhost:8000
```

## 📊 데이터 소스

- **KBO 공식 홈페이지**: https://www.koreabaseball.com/
  - 팀 순위: TeamRankDaily.aspx
  - 경기 일정: Schedule.aspx
- **업데이트 주기**: 하루 3회 자동 업데이트
- **데이터 형식**: JSON (magic-number/kbo-rankings.json)

## 🔍 SEO 최적화

- ✅ **사이트맵**: sitemap.xml
- ✅ **robots.txt**: 검색엔진 최적화
- ✅ **Open Graph**: 소셜 미디어 공유
- ✅ **PWA**: 모바일 앱 설치 지원
- ✅ **RSS 피드**: 업데이트 알림

## 📱 PWA 기능

- **오프라인 지원**: 캐시된 데이터로 동작
- **모바일 최적화**: 반응형 디자인
- **앱 설치**: 홈 화면에 추가 가능
- **푸시 알림**: 업데이트 알림 (예정)

## 🤝 기여 방법

1. **Issues**: 버그 리포트, 기능 제안
2. **Pull Request**: 코드 개선, 새 기능
3. **데이터 검증**: 계산 결과 검토
4. **UI/UX 개선**: 디자인 제안

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

## 👨‍💻 개발자

- **개발자**: SanghunBruceHam
- **이메일**: sanghunbruceham@gmail.com
- **GitHub**: https://github.com/SanghunBruceHam

## 🙏 감사

- **KBO**: 공식 데이터 제공
- **GitHub**: 무료 호스팅 및 자동화
- **Community**: 피드백 및 개선 제안

---

## 🚨 중요 알림

> **⚠️ 이 프로젝트는 KBO 매직넘버 계산기 전용입니다**
> 
> 다른 GitHub 프로젝트들과 혼동하지 마세요:
> - 📁 폴더명: `kbo/`
> - 🏷️ 프로젝트명: KBO 매직넘버 계산기
> - 🌐 웹사이트: kbo.mahalohana-bruce.com/magic-number/
> - 🤖 자동화: 하루 3회 KBO 데이터 업데이트

---

**⭐ 이 프로젝트가 유용하다면 Star를 눌러주세요!**