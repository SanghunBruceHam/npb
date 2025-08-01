# KBO Python 크롤러 설정 가이드

## 개요
LOPES-HUFS/KBO_data 프로젝트를 참고하여 개발된 Python 기반 KBO 데이터 수집 시스템입니다.

## 필수 조건
- Python 3.8 이상
- Chrome 브라우저 설치
- ChromeDriver (Selenium용)

## 설치 방법

### 1. Python 패키지 설치
```bash
pip install -r requirements.txt
```

### 2. ChromeDriver 설치

#### macOS (Homebrew 사용)
```bash
brew install chromedriver
```

#### 직접 다운로드
1. Chrome 버전 확인: `chrome://version/`
2. [ChromeDriver 다운로드](https://chromedriver.chromium.org/)
3. PATH에 추가

### 3. 실행
```bash
python kbo-python-crawler.py
```

## 주요 기능

### 1. 다음 스포츠 월별 크롤링
- Selenium WebDriver를 사용한 JavaScript 동적 로딩 대응
- 2025년 7월 KBO 경기 결과 자동 수집
- 팀명, 점수, 날짜 정보 추출

### 2. 데이터 형식
- JSON 형식으로 상세 정보 저장
- clean.txt 형식으로 간단한 형식 저장
- 기존 Node.js 시스템과 호환 가능

### 3. 자동화 기능
- 날짜별 그룹화
- 중복 제거
- 팀명 정규화 (SK→SSG, 기아→KIA 등)

## 사용 예제

```python
from kbo_python_crawler import KBOPythonCrawler

# 크롤러 초기화
crawler = KBOPythonCrawler()

# 2025년 7월 데이터 수집
games = crawler.run_full_crawling(2025, 7)

# 결과 확인
print(f"총 {len(games)}개 경기 수집")
```

## 출력 파일
- `kbo-2025-07-YYYYMMDD_HHMMSS.json`: 상세 경기 데이터
- `kbo-2025-07-YYYYMMDD_HHMMSS-clean.txt`: clean.txt 형식
- `daum-python-crawler-debug.png`: 디버그 스크린샷

## Node.js 시스템과 통합
생성된 clean.txt 파일을 기존 `scripts/process-season-data.js`로 처리하면 됩니다:

```bash
# Python으로 데이터 수집
python kbo-python-crawler.py

# Node.js로 데이터 처리
node scripts/process-season-data.js
```

## 장점
1. **JavaScript 동적 로딩 해결**: Selenium 사용으로 모든 데이터 접근 가능
2. **검증된 방법**: LOPES-HUFS 프로젝트의 검증된 접근법 활용
3. **유연한 확장**: 다양한 사이트와 기간 설정 가능
4. **기존 시스템 호환**: clean.txt 형식으로 기존 워크플로우 활용

## 문제 해결

### ChromeDriver 오류
```bash
# ChromeDriver 경로 확인
which chromedriver

# 권한 설정 (macOS)
xattr -d com.apple.quarantine /usr/local/bin/chromedriver
```

### 패키지 설치 오류
```bash
# 가상환경 사용 권장
python -m venv kbo-env
source kbo-env/bin/activate  # macOS/Linux
# 또는
kbo-env\Scripts\activate  # Windows

pip install -r requirements.txt
```