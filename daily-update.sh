#!/bin/bash

# KBO 매일 자동 업데이트 스크립트
# 경기 결과 크롤링 + 백엔드 업데이트 + 웹사이트 데이터 자동 업데이트

echo "🌐 KBO 일일 자동 업데이트 시작..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# 스크립트 디렉토리로 이동
cd "$(dirname "$0")"

# Node.js 실행
echo "🚀 통합 크롤링 시스템 실행..."
node integrated-website-crawler.js

# 실행 결과 확인
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 일일 업데이트 완료!"
    echo "🌐 웹사이트: https://kbo.mahalohana-bruce.com/magic-number/"
    echo "📊 백엔드 데이터: kbo-records.json"
    echo "🎯 웹사이트 데이터: magic-number/kbo-rankings.json"
else
    echo ""
    echo "❌ 업데이트 실패"
fi

echo "========================================"
echo "🕐 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"