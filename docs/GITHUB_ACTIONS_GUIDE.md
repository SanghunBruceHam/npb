# KBO 자동 크롤링 GitHub Actions 가이드

## 🚀 개요

GitHub Actions를 사용하여 매일 자동으로 KBO 경기 결과를 크롤링하고 웹서비스 데이터를 업데이트하는 시스템입니다.

## ⚙️ 설정 방법

### 1. Repository 설정

1. GitHub 저장소에 코드 푸시
2. Repository Settings → Actions → General
3. "Allow all actions and reusable workflows" 선택

### 2. 자동 실행 스케줄

- **하루 3번 자동 실행**
  - 🌅 **오후 6시** (한국시간) - 초기 경기 결과 수집
  - 🌆 **오후 10시** (한국시간) - 중간 경기 결과 업데이트  
  - 🌙 **밤 12시** (한국시간) - 최종 경기 결과 완성
- 완료된 경기만 수집하여 데이터 업데이트

### 3. 수동 실행

```bash
# GitHub 웹사이트에서
Repository → Actions → "KBO 자동 데이터 크롤링 및 업데이트" → Run workflow
```

## 🔄 작동 과정

### 단계별 실행 과정

1. **환경 설정**
   - Ubuntu 최신 버전
   - Python 3.11 + pip 캐시
   - Node.js 18 + npm 캐시
   - Chrome 브라우저 + ChromeDriver

2. **크롤링 실행**
   ```python
   # Headless 모드로 실행
   python kbo-python-working-crawler.py
   ```
   - 다음 스포츠에서 완료된 경기만 수집
   - `kbo-YYYY-MM-DDHHMMSS-clean.txt` 파일 생성

3. **데이터 처리**
   ```javascript
   # 크롤링 데이터를 웹서비스 형식으로 변환
   node scripts/process-season-data.js
   ```

4. **자동 커밋**
   - 변경된 파일들 자동 커밋
   - 커밋 메시지에 실행 시간 포함

## 📁 업데이트되는 파일들

### 웹서비스 데이터
- `magic-number/kbo-rankings.json` - 팀 순위 및 기록
- `magic-number/kbo-records.json` - 팀간 상대전적
- `output/service-data.json` - 통합 서비스 데이터

### 원본 데이터
- `data/YYYY-season-data-crawled.txt` - 크롤링된 원본 데이터

## 🔍 모니터링

### 실행 상태 확인
1. Repository → Actions 탭
2. 최근 실행 결과 확인
3. 로그에서 상세 정보 확인

### 실행 결과
```
✅ 성공: 새로운 경기 데이터 수집 및 업데이트
⚠️ 경고: 완료된 경기 없음 (정상)
❌ 실패: 로그 확인 필요
```

## 🛠️ 문제 해결

### 자주 발생하는 상황

1. **완료된 경기가 없는 경우**
   ```
   ⚠️ 크롤링된 파일이 없습니다 (완료된 경기가 없을 수 있음)
   ```
   - 정상 상황입니다
   - 경기가 완료되면 자동으로 수집됩니다

2. **크롤링 실패**
   - 웹사이트 구조 변경 가능성
   - 네트워크 연결 문제
   - Actions 로그에서 상세 오류 확인

### 수동 디버깅

```bash
# 로컬에서 테스트
python kbo-python-working-crawler.py
node scripts/process-season-data.js
```

## 📊 실행 통계

### 예상 실행 시간
- 크롤링: 2-3분
- 데이터 처리: 30초
- 커밋/푸시: 30초
- **총 소요시간: 약 3-4분**

### GitHub Actions 무료 한도
- 월 2,000분 무료 제공
- 일일 3회 × 3-4분 × 30일 = 약 360분/월 사용
- **무료 한도의 18% 사용 (충분히 여유있음)**

## 🔧 고급 설정

### 알림 설정 (선택사항)
```yaml
# Slack 알림 추가 예시
- name: Slack 알림
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 다중 환경 지원
- Development/Production 브랜치별 실행
- 다른 시간대 스케줄 설정
- 특정 조건에서만 실행

## 📝 커밋 메시지 형식

```
🤖 KBO 데이터 자동 업데이트 - 2025-08-01 18:00

🌅 오후 6시 경기 결과 업데이트
🎯 자동 크롤링 및 데이터 처리 완료
📊 웹서비스 데이터 파일 업데이트

🤖 Generated with GitHub Actions
Co-Authored-By: KBO-Auto-Crawler <action@github.com>
```

## 🎯 장점

### PC 독립적 운영
- ✅ PC 꺼져도 자동 실행
- ✅ 안정적인 Ubuntu 환경
- ✅ 무료 GitHub Actions 활용

### 완전 자동화
- ✅ 매일 정해진 시간 실행
- ✅ 완료된 경기만 정확히 수집
- ✅ 자동 커밋 및 웹서비스 업데이트

### 모니터링 및 관리
- ✅ 실행 로그 완전 기록
- ✅ 실패 시 즉시 확인 가능
- ✅ 수동 실행으로 즉시 업데이트 가능