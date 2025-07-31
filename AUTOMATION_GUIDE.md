# 🤖 KBO 데이터 자동 업데이트 가이드

KBO 매직넘버 계산기의 데이터를 자동으로 업데이트하는 방법들을 제공합니다.

## 📊 업데이트 스케줄

모든 방법에서 동일한 스케줄로 실행됩니다:
- **18:00** - 경기 시작 시간
- **22:00** - 대부분 경기 종료 시간
- **00:00** - 모든 경기 종료 후 최종 업데이트

## 🚀 방법 1: GitHub Actions (추천)

가장 간단하고 안정적인 방법입니다.

### 장점
- ✅ 서버 없이 자동 실행
- ✅ 무료 (공개 저장소)
- ✅ 로그 확인 쉬움
- ✅ 설정 완료됨

### 설정 상태
- 파일: `.github/workflows/update-kbo-data.yml`
- 상태: **이미 설정 완료** ✅
- 수동 실행: GitHub → Actions → "KBO 데이터 자동 업데이트" → Run workflow

### 확인 방법
1. GitHub 저장소 → Actions 탭
2. "KBO 데이터 자동 업데이트" 워크플로우 확인
3. 실행 로그 및 결과 확인

---

## 🖥️ 방법 2: 로컬 서버 (Linux/Mac)

개인 서버나 로컬 컴퓨터에서 실행하는 방법입니다.

### 설치
```bash
# 1. cron 설정 스크립트 실행
./setup-cron.sh

# 2. 설치 확인
crontab -l
```

### 수동 실행
```bash
# 업데이트 실행
./auto-update.sh

# 로그 확인
tail -f logs/update_*.log
```

### 제거
```bash
crontab -e
# 관련 라인들 수동 삭제
```

---

## 🪟 방법 3: Windows 스케줄러

Windows 환경에서 실행하는 방법입니다.

### 설치
```powershell
# PowerShell을 관리자 권한으로 실행
.\setup-scheduler.ps1 -Install
```

### 관리
```powershell
# 테스트 실행
.\setup-scheduler.ps1 -Test

# 제거
.\setup-scheduler.ps1 -Uninstall

# 수동 실행
.\auto-update.ps1
```

### 확인
- Windows 작업 스케줄러에서 "KBODataUpdate" 검색
- 로그 파일: `logs/` 폴더 확인

---

## 📝 로그 관리

### 로그 파일 위치
- **Linux/Mac**: `logs/update_YYYY-MM-DD_HH-MM-SS.log`
- **Windows**: `logs\update_YYYY-MM-DD_HH-MM-SS.log`
- **GitHub Actions**: Actions 탭에서 확인

### 로그 확인
```bash
# 최신 로그 확인
tail -f logs/update_*.log

# 모든 로그 보기
ls -la logs/

# 특정 날짜 로그
cat logs/update_2025-07-31_*.log
```

### 자동 정리
- 7일 이상된 로그 파일은 자동 삭제됩니다.

---

## 🔧 문제 해결

### 일반적인 문제들

1. **Node.js 없음**
   ```bash
   # Node.js 설치 확인
   node --version
   npm --version
   ```

2. **권한 오류**
   ```bash
   # 스크립트 실행 권한 부여
   chmod +x auto-update.sh
   chmod +x setup-cron.sh
   ```

3. **Git 권한 오류**
   ```bash
   # Git 설정 확인
   git config --global user.name
   git config --global user.email
   ```

### GitHub Actions 문제

1. **워크플로우가 실행되지 않음**
   - Settings → Actions → General → Workflow permissions 확인
   - "Read and write permissions" 설정

2. **푸시 권한 오류**
   - Personal Access Token 확인
   - 저장소 권한 확인

### 로컬 실행 문제

1. **cron이 실행되지 않음**
   ```bash
   # cron 서비스 상태 확인
   systemctl status crond  # CentOS/RHEL
   systemctl status cron   # Ubuntu/Debian
   ```

2. **PATH 문제**
   ```bash
   # crontab에서 전체 경로 사용
   0 18 * * * /usr/bin/node /full/path/to/project/auto-update.sh
   ```

---

## 🎯 추천 설정

### 개발/테스트 환경
- **GitHub Actions** 사용 (무료, 간편)

### 프로덕션 환경
- **GitHub Actions** + **로컬 백업** 조합
- 또는 **전용 서버**에서 cron 실행

### 개인 사용
- **GitHub Actions**만으로도 충분

---

## 📊 모니터링

### 성공 확인 방법
1. **데이터 파일 변경**: `magic-number/kbo-rankings.json` 수정 시간 확인
2. **Git 커밋**: 자동 커밋 메시지 확인
3. **웹사이트**: https://kbo.mahalohana-bruce.com/magic-number/ 에서 최신 데이터 확인

### 알림 설정 (선택사항)
- GitHub Actions: 실패시 이메일 알림
- 로컬: 로그 모니터링 스크립트 추가
- Slack/Discord 웹훅 연동 가능

---

## 🚨 주의사항

1. **KBO 홈페이지 변경시** 스크래핑 코드 수정 필요
2. **과도한 요청 금지** - 현재 설정은 하루 3회로 적절함
3. **로그 모니터링** - 정기적으로 오류 확인 권장
4. **백업 보관** - 중요한 데이터는 별도 백업 권장

---

## 📞 지원

문제가 발생하거나 질문이 있으시면:
1. 로그 파일 확인
2. GitHub Issues에 문의
3. 수동 실행으로 임시 해결

**Happy Automating! 🎉**