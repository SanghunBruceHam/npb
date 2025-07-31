#!/bin/bash

# KBO 매직넘버 계산기 프로젝트 정보 표시

echo "
🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆
🏆                                                          🏆
🏆             ⚾ KBO 매직넘버 계산기 ⚾                      🏆
🏆                                                          🏆
🏆   📊 2025 KBO 리그 실시간 매직넘버 & 플레이오프 진출 조건    🏆
🏆                                                          🏆
🏆   🌐 웹사이트: kbo.mahalohana-bruce.com/magic-number/     🏆
🏆   🤖 자동화: GitHub Actions (하루 3회)                   🏆
🏆   📱 PWA: 모바일 앱 설치 지원                             🏆
🏆                                                          🏆
🏆   ⚠️  다른 GitHub 프로젝트와 혼동하지 마세요!               🏆
🏆                                                          🏆
🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆🏆
"

echo "📋 프로젝트 정보:"
echo "  📁 폴더명: $(basename "$(pwd)")"
echo "  🏷️  프로젝트: KBO 매직넘버 계산기"
echo "  💻 기술: JavaScript, Node.js, GitHub Actions"
echo "  📅 마지막 업데이트: $(date '+%Y-%m-%d')"
echo ""

echo "🚀 주요 명령어:"
echo "  npm run update-data    - 데이터 수동 업데이트"
echo "  ./setup-cron.sh        - Linux/Mac 자동화 설정"
echo "  ./project-info.sh      - 이 정보 다시 보기"
echo ""

echo "📊 현재 상태:"
if [ -f "magic-number/kbo-rankings.json" ]; then
    LAST_MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "magic-number/kbo-rankings.json" 2>/dev/null || stat -c "%y" "magic-number/kbo-rankings.json" 2>/dev/null | cut -d'.' -f1)
    echo "  ✅ 데이터 파일: 존재 (최종 수정: $LAST_MODIFIED)"
else
    echo "  ❌ 데이터 파일: 없음"
fi

if [ -d ".github/workflows" ]; then
    echo "  ✅ GitHub Actions: 설정됨"
else
    echo "  ❌ GitHub Actions: 설정 안됨"
fi

if [ -f "auto-update.sh" ]; then
    echo "  ✅ 로컬 자동화: 설정됨"
else
    echo "  ⚠️  로컬 자동화: 설정 안됨"
fi

echo ""
echo "🌐 웹사이트에서 확인: https://kbo.mahalohana-bruce.com/magic-number/"
echo ""