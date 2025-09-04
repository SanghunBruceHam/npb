#!/bin/bash

# NPB 완전 새로운 Pipeline 실행 스크립트
# PostgreSQL 없는 버전: 웹 크롤링 → TXT → JavaScript → JSON

echo "🚀 Starting NPB NEW Pipeline (PostgreSQL FREE)"
echo "🔄 Flow: Web Crawling → TXT → JavaScript → JSON"
echo ""

# 기본값: 7일
DAYS=${1:-7}

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "사용법: $0 [days|--full-season|--test|--quick]"
    echo ""
    echo "옵션:"
    echo "  days           크롤링할 일수 (기본: 7일)"
    echo "  --full-season  전체 시즌 (3월 28일부터, 143경기 최대)"
    echo "  --test         테스트 모드 (3일)"
    echo "  --quick        빠른 모드 (1일)"
    echo "  --skip-crawl   크롤링 건너뛰고 변환만 수행"
    echo ""
    echo "예시:"
    echo "  $0                # 기본 7일"
    echo "  $0 14             # 14일"
    echo "  $0 --full-season  # 전체 시즌"
    echo "  $0 --test         # 테스트 모드"
    exit 0
fi

if [ "$1" = "--full-season" ]; then
    echo "📅 Target period: Full season (from March 28, 2025)"
else
    echo "📅 Target period: $DAYS"
fi
echo ""

# Python 가상환경 체크 및 활성화 (선택사항)
if [ -d "venv" ]; then
    echo "🐍 Activating Python virtual environment (./venv)..."
    source venv/bin/activate
elif [ -d "crawler/venv" ]; then
    echo "🐍 Activating Python virtual environment (crawler/venv)..."
    source crawler/venv/bin/activate
elif [ -d "crawler_venv" ]; then
    echo "🐍 Activating Python virtual environment (./crawler_venv)..."
    source crawler_venv/bin/activate
fi

# 새 파이프라인 실행
python3 scripts/new_pipeline.py "$@"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "🎉 NEW Pipeline completed successfully!"
    echo "🌐 Web service is ready!"
    echo ""
    echo "다음 명령으로 서비스 시작:"
    echo "  ./run_html.sh"
    echo ""
else
    echo ""
    echo "❌ Pipeline failed (exit code: $EXIT_CODE)"
    echo "로그를 확인하세요: logs/new_pipeline/"
    exit $EXIT_CODE
fi
