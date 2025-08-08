# KBO 자동화 시스템 GitHub Actions 가이드

## 🚀 개요

GitHub Actions를 사용하여 **완전 자동화된 KBO 데이터 시스템**을 구축했습니다. 매일 자동으로 KBO 경기 결과를 크롤링하고, 웹서비스 데이터를 업데이트하며, GitHub Pages에 배포까지 완료합니다.

## ✨ 2025년 8월 최신 업데이트

### 🔄 **단일 통합 워크플로우**
- **타이밍 문제 완전 해결**: 데이터 업데이트 직후 즉시 웹사이트 배포
- **PathManager 기반**: 안정적인 경로 관리 시스템
- **일일 히스토리**: 매일 순위 변동 자동 저장
- **npm 스크립트**: 크로스플랫폼 호환성 보장

## ⚙️ 설정 방법

### 1. Repository 설정

1. GitHub 저장소 Settings → Actions → General
2. "Allow all actions and reusable workflows" 선택
3. Settings → Pages → Source: "GitHub Actions" 선택

### 2. 자동 실행 스케줄

**매일 3회 자동 실행 (한국시간 기준):**
- 🌅 **오후 6시 (18:00)** - 초기 경기 결과 수집
- 🌆 **오후 10시 (22:00)** - 중간 경기 결과 업데이트  
- 🌙 **밤 12시 (00:00)** - 최종 경기 결과 완성

### 3. 수동 실행

```bash
# GitHub 웹사이트에서
Repository → Actions → "KBO 자동 데이터 크롤링 및 업데이트" → Run workflow

# 수동 실행 옵션:
- 크롤링 건너뛰기: 데이터 처리만 실행 (크롤링 제외)
```

## 🔄 통합 자동화 프로세스

### **단일 워크플로우 실행 단계**

```yaml
name: KBO 자동 데이터 크롤링 및 업데이트

# 매일 3회 실행
schedule:
  - cron: '0 9 * * *'   # UTC 09:00 = KST 18:00
  - cron: '0 13 * * *'  # UTC 13:00 = KST 22:00  
  - cron: '0 15 * * *'  # UTC 15:00 = KST 00:00
```

### **1. 환경 설정**
- Ubuntu 최신 버전
- Python 3.11 + pip 캐시
- Node.js 18 + npm 캐시
- Chrome 브라우저 (크롤링용)

### **2. 경로 시스템 검증**
```bash
npm test  # PathManager 경로 검증 시스템
```

### **3. KBO 데이터 크롤링**
```bash
npm run crawl  # 크로스플랫폼 크롤러 실행
```
- 다음 스포츠에서 완료된 경기만 수집
- PathManager 기반 안전한 경로 관리

### **4. 데이터 처리 및 분석**
```bash
npm run process  # 시즌 데이터 완전 자동화 처리
```
- 순위표, 매직넘버, 상대전적 계산
- 플레이오프 진출 분석

### **5. 매직넘버 매트릭스 생성**
```bash
npm run matrix  # 나무위키 스타일 매트릭스
```

### **6. 일일 스냅샷 저장 (NEW!)**
```bash
npm run snapshot  # 일일 순위 히스토리 저장
```
- 매일의 순위 변동 추적
- 전날 대비 변화 계산

### **7. 자동 커밋 및 푸시**
```bash
# 변경사항이 있을 때만 실행
git add .
git commit -m "🤖 KBO 데이터 자동 업데이트 - YYYY-MM-DD HH:MM"
git push
```

### **8. GitHub Pages 즉시 배포 (NEW!)**
```bash
# 커밋 직후 바로 웹사이트 배포
- uses: actions/configure-pages@v4
- uses: actions/upload-pages-artifact@v3
- uses: actions/deploy-pages@v4
```

## 📁 업데이트되는 파일들

### **웹서비스 데이터**
- `magic-number/data/service-data.json` - 통합 서비스 데이터
- `magic-number/data/kbo-rankings.json` - 팀 순위 및 기록  
- `magic-number/data/kbo-records.json` - 팀간 상대전적

### **히스토리 데이터 (NEW!)**
- `magic-number/history/daily/YYYY-MM-DD.json` - 일일 스냅샷
- `magic-number/history/monthly/YYYY-MM.json` - 월별 요약

### **원본 데이터**
- `magic-number/data/YYYY-season-data-clean.txt` - 시즌 경기 데이터

## 🔍 모니터링 및 관리

### **실행 상태 확인**
1. Repository → Actions 탭
2. "KBO 자동 데이터 크롤링 및 업데이트" 워크플로우 선택
3. 최근 실행 결과 및 로그 확인

### **실행 결과 해석**
```
✅ 성공: 새로운 경기 데이터 수집 및 웹사이트 배포 완료
⚠️ 경고: 완료된 경기 없음 (정상 - 휴식일 또는 경기 진행 중)
❌ 실패: 로그 확인 필요 (크롤링 또는 배포 오류)
```

### **로그에서 확인할 수 있는 정보**
- 처리된 경기 수
- 파일 크기 변화
- 일일 히스토리 누적 개수
- GitHub Pages 배포 URL
- 각 단계별 실행 시간

## 🛠️ 문제 해결

### **자주 발생하는 상황**

1. **완료된 경기가 없는 경우**
   ```
   ⚠️ 크롤링된 파일이 없습니다 (완료된 경기가 없을 수 있음)
   ```
   - **정상 상황입니다** (휴식일 또는 경기 진행 중)
   - 경기가 완료되면 다음 실행에서 자동 수집됩니다

2. **크롤링 실패**
   - 웹사이트 구조 변경 가능성
   - 네트워크 연결 문제
   - Actions 로그에서 상세 오류 확인

3. **배포 실패**
   - GitHub Pages 설정 확인 필요
   - Repository 권한 설정 확인

### **수동 디버깅 및 테스트**

```bash
# 로컬에서 테스트 (개선된 명령어)
npm test           # 경로 시스템 검증
npm run crawl      # 크롤링 테스트
npm run process    # 데이터 처리 테스트
npm run matrix     # 매트릭스 생성 테스트
npm run snapshot   # 스냅샷 저장 테스트
npm run serve      # 로컬 서버 실행
```

## 📊 성능 및 리소스 사용

### **예상 실행 시간**
- 환경 설정: 1-2분
- 크롤링: 2-3분
- 데이터 처리: 30초
- 매트릭스 생성: 10초
- 히스토리 저장: 5초
- 커밋/푸시: 30초
- GitHub Pages 배포: 1-2분
- **총 소요시간: 약 5-7분**

### **GitHub Actions 무료 한도**
- 월 2,000분 무료 제공
- 일일 3회 × 6분 × 30일 = 약 540분/월 사용
- **무료 한도의 27% 사용** (충분히 여유있음)

## 🎯 주요 개선사항 (2025년 8월)

### **Before (기존 문제)**
- ❌ 데이터 업데이트와 웹사이트 배포가 분리된 워크플로우
- ❌ 타이밍 미스매치로 배포 누락 발생
- ❌ 구식 경로 참조로 인한 실행 오류
- ❌ 일일 순위 변동 히스토리 부재

### **After (완전 해결)**
- ✅ **단일 통합 워크플로우**로 타이밍 문제 해결
- ✅ **PathManager 기반** 안정적 경로 관리
- ✅ **npm 스크립트** 크로스플랫폼 호환성
- ✅ **일일 히스토리 자동 저장** 시스템
- ✅ **조건부 실행**으로 효율적 리소스 사용

## 🔧 고급 설정 및 커스터마이징

### **실행 스케줄 변경**
```yaml
# cron 표현식 수정 (.github/workflows/kbo-auto-crawling.yml)
schedule:
  - cron: '0 9 * * *'   # 원하는 시간으로 변경 (UTC 기준)
```

### **알림 설정 추가**
```yaml
# Slack 알림 예시
- name: Slack 알림
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### **환경별 실행**
- Development/Production 브랜치별 실행
- 특정 조건에서만 실행 (예: 시즌 기간만)
- 다른 시간대 지원

## 📝 커밋 메시지 형식

```
🤖 KBO 데이터 자동 업데이트 - 2025-08-07 18:00

🌅 오후 6시 경기 결과 업데이트
🎯 PathManager 기반 안정적 데이터 처리 완료
📊 순위표, 매직넘버, 상대전적 업데이트
📸 일일 스냅샷 히스토리 저장

🤖 Generated with GitHub Actions
Co-Authored-By: KBO-Auto-Crawler <action@github.com>
```

## 🎉 완전 자동화의 장점

### **PC 독립적 운영**
- ✅ 로컬 PC 꺼져도 자동 실행
- ✅ 안정적인 Ubuntu 클라우드 환경
- ✅ 무료 GitHub Actions 활용

### **완전 자동화**
- ✅ 매일 정해진 시간 자동 실행
- ✅ 완료된 경기만 정확히 수집
- ✅ 자동 커밋, 배포, 웹사이트 업데이트
- ✅ 일일 순위 히스토리 자동 누적

### **모니터링 및 관리**
- ✅ 실행 로그 완전 기록
- ✅ 실패 시 즉시 확인 가능
- ✅ 수동 실행으로 즉시 업데이트 가능
- ✅ 파일 크기, 히스토리 개수 등 상세 정보 제공

## 🚀 결론

**2025년 8월 완전 개선된 자동화 시스템**으로 이제 모든 것이 자동으로 처리됩니다:

1. ✅ **KBO 데이터 크롤링** - npm run crawl
2. ✅ **데이터 처리 및 분석** - npm run process  
3. ✅ **매직넘버 매트릭스** - npm run matrix
4. ✅ **일일 히스토리 저장** - npm run snapshot
5. ✅ **웹사이트 자동 배포** - GitHub Pages

**타이밍 문제, 경로 오류, 수동 배포 등 모든 문제가 해결되었습니다!** 🎯