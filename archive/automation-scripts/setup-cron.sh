#!/bin/bash

# KBO 데이터 자동 업데이트 cron 설정 스크립트

echo "🚀 KBO 데이터 자동 업데이트 cron 설정을 시작합니다..."

# 현재 디렉토리 경로
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

echo "📁 프로젝트 경로: $PROJECT_DIR"

# 로그 디렉토리 생성
mkdir -p "$PROJECT_DIR/logs"

# 최신 통합 자동 업데이트 스크립트로 심볼릭 링크 생성
if [ -f "$PROJECT_DIR/daily-update.sh" ]; then
    echo "✅ 최신 daily-update.sh 스크립트 사용"
    # 기존 auto-update.sh가 있다면 백업
    if [ -f "$PROJECT_DIR/auto-update.sh" ]; then
        mv "$PROJECT_DIR/auto-update.sh" "$PROJECT_DIR/auto-update.sh.bak"
    fi
    # daily-update.sh로 심볼릭 링크 생성
    ln -sf "$PROJECT_DIR/daily-update.sh" "$PROJECT_DIR/auto-update.sh"
else
    echo "❌ daily-update.sh를 찾을 수 없습니다. 먼저 통합 크롤링 시스템을 설정하세요."
    exit 1
fi

# 실행 권한 부여
chmod +x "$PROJECT_DIR/auto-update.sh"

echo "✅ 자동 업데이트 스크립트 생성 완료: $PROJECT_DIR/auto-update.sh"

# crontab 백업
if crontab -l > /dev/null 2>&1; then
    crontab -l > "$PROJECT_DIR/crontab_backup.txt"
    echo "📋 기존 crontab 백업 완료: $PROJECT_DIR/crontab_backup.txt"
fi

# 새로운 cron 작업들 생성
cat > "$PROJECT_DIR/kbo_cron_jobs.txt" << EOF
# KBO 데이터 자동 업데이트 (18:00, 22:00, 00:00)
0 18 * * * $PROJECT_DIR/auto-update.sh
0 22 * * * $PROJECT_DIR/auto-update.sh  
0 0 * * * $PROJECT_DIR/auto-update.sh
EOF

echo ""
echo "🕒 cron 작업 설정:"
echo "----------------------------------------"
cat "$PROJECT_DIR/kbo_cron_jobs.txt"
echo "----------------------------------------"
echo ""

# 사용자에게 cron 설정 확인
read -p "❓ 위의 cron 작업들을 설치하시겠습니까? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 기존 crontab에 새 작업 추가
    (crontab -l 2>/dev/null || true; cat "$PROJECT_DIR/kbo_cron_jobs.txt") | crontab -
    
    if [ $? -eq 0 ]; then
        echo "✅ cron 작업이 성공적으로 설치되었습니다!"
        echo ""
        echo "📋 현재 설정된 cron 작업들:"
        crontab -l
        echo ""
        echo "📁 로그 파일 위치: $PROJECT_DIR/logs/"
        echo "🔧 수동 실행: $PROJECT_DIR/auto-update.sh"
    else
        echo "❌ cron 작업 설치에 실패했습니다."
    fi
else
    echo "ℹ️  cron 작업이 설치되지 않았습니다."
    echo "수동으로 설치하려면 다음 명령어를 실행하세요:"
    echo "crontab -e"
    echo "그리고 다음 내용을 추가하세요:"
    cat "$PROJECT_DIR/kbo_cron_jobs.txt"
fi

echo ""
echo "🎉 설정 완료!"
echo "📖 사용법:"
echo "  - 수동 실행: ./auto-update.sh"
echo "  - 로그 확인: tail -f logs/update_*.log"  
echo "  - cron 확인: crontab -l"
echo "  - cron 제거: crontab -e (수동으로 해당 라인들 삭제)"