#!/bin/bash

# KBO 자동화 관리 스크립트
# Cron과 GitHub Actions 설정을 쉽게 관리

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 현재 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🤖 KBO 자동화 관리 시스템${NC}"
echo "======================================"
echo ""

# 메뉴 함수
show_menu() {
    echo "선택할 자동화 방법:"
    echo ""
    echo "1) 🕐 Cron 자동화 설정 (로컬 서버)"
    echo "2) ☁️  GitHub Actions 확인 (클라우드)"
    echo "3) 🧪 수동 테스트 실행"
    echo "4) 📊 현재 상태 확인"
    echo "5) 📝 로그 확인"
    echo "6) ❌ 종료"
    echo ""
}

# Cron 설정
setup_cron() {
    echo -e "${YELLOW}🕐 Cron 자동화 설정${NC}"
    echo "======================================"
    
    if [ -f "$SCRIPT_DIR/setup-cron.sh" ]; then
        echo "기존 cron 설정 스크립트를 실행합니다..."
        bash "$SCRIPT_DIR/setup-cron.sh"
    else
        echo -e "${RED}❌ setup-cron.sh 파일을 찾을 수 없습니다.${NC}"
    fi
}

# GitHub Actions 확인
check_github_actions() {
    echo -e "${YELLOW}☁️ GitHub Actions 확인${NC}"
    echo "======================================"
    
    if [ -f "$SCRIPT_DIR/.github/workflows/daily-kbo-update.yml" ]; then
        echo -e "${GREEN}✅ GitHub Actions 워크플로우가 설정되어 있습니다.${NC}"
        echo ""
        echo "📍 파일 위치: .github/workflows/daily-kbo-update.yml"
        echo "⏰ 실행 시간: 매일 오전 9시, 오후 9시"
        echo "🔗 GitHub에서 확인: https://github.com/SanghunBruceHam/kbo/actions"
        echo ""
        echo "💡 수동 실행 방법:"
        echo "   1. GitHub 저장소 방문"
        echo "   2. Actions 탭 클릭"
        echo "   3. 'KBO 데이터 일일 자동 업데이트' 워크플로우 선택"
        echo "   4. 'Run workflow' 버튼 클릭"
    else
        echo -e "${RED}❌ GitHub Actions 워크플로우가 설정되지 않았습니다.${NC}"
        echo "GitHub Actions 파일이 생성되었습니다. 다음 단계를 따르세요:"
        echo ""
        echo "1. 변경사항을 git에 커밋하고 푸시하세요:"
        echo "   git add .github/workflows/daily-kbo-update.yml"
        echo "   git commit -m '🤖 GitHub Actions 자동화 추가'"
        echo "   git push"
        echo ""
        echo "2. GitHub 저장소의 Actions 탭에서 워크플로우를 확인하세요."
    fi
}

# 수동 테스트
manual_test() {
    echo -e "${YELLOW}🧪 수동 테스트 실행${NC}"
    echo "======================================"
    
    if [ -f "$SCRIPT_DIR/daily-update.sh" ]; then
        echo "통합 업데이트 스크립트를 실행합니다..."
        echo ""
        bash "$SCRIPT_DIR/daily-update.sh"
    else
        echo -e "${RED}❌ daily-update.sh 파일을 찾을 수 없습니다.${NC}"
    fi
}

# 현재 상태 확인
check_status() {
    echo -e "${YELLOW}📊 현재 자동화 상태${NC}"
    echo "======================================"
    
    # Cron 확인
    echo "🕐 Cron 작업:"
    if crontab -l 2>/dev/null | grep -q "daily-update.sh\|auto-update.sh"; then
        echo -e "${GREEN}   ✅ Cron 작업이 설정되어 있습니다.${NC}"
        echo "   📋 설정된 작업:"
        crontab -l 2>/dev/null | grep -E "daily-update.sh|auto-update.sh" | sed 's/^/      /'
    else
        echo -e "${RED}   ❌ Cron 작업이 설정되지 않았습니다.${NC}"
    fi
    
    echo ""
    
    # GitHub Actions 확인
    echo "☁️ GitHub Actions:"
    if [ -f "$SCRIPT_DIR/.github/workflows/daily-kbo-update.yml" ]; then
        echo -e "${GREEN}   ✅ GitHub Actions 워크플로우가 있습니다.${NC}"
    else
        echo -e "${RED}   ❌ GitHub Actions 워크플로우가 없습니다.${NC}"
    fi
    
    echo ""
    
    # 마지막 업데이트 확인
    echo "📊 데이터 상태:"
    if [ -f "$SCRIPT_DIR/kbo-records.json" ]; then
        last_update=$(grep -o '"lastUpdated":"[^"]*' "$SCRIPT_DIR/kbo-records.json" | cut -d'"' -f4)
        echo -e "${GREEN}   ✅ 백엔드 데이터: $last_update${NC}"
    fi
    
    if [ -f "$SCRIPT_DIR/magic-number/kbo-rankings.json" ]; then
        web_update=$(grep -o '"lastUpdated":"[^"]*' "$SCRIPT_DIR/magic-number/kbo-rankings.json" | cut -d'"' -f4)
        echo -e "${GREEN}   ✅ 웹사이트 데이터: $web_update${NC}"
    fi
}

# 로그 확인
check_logs() {
    echo -e "${YELLOW}📝 로그 확인${NC}"
    echo "======================================"
    
    if [ -d "$SCRIPT_DIR/logs" ]; then
        echo "로그 디렉토리: $SCRIPT_DIR/logs"
        echo ""
        echo "최근 로그 파일들:"
        ls -la "$SCRIPT_DIR/logs" | tail -5
        echo ""
        
        # 최신 로그 파일 찾기
        latest_log=$(ls -t "$SCRIPT_DIR/logs"/*.log 2>/dev/null | head -1)
        if [ -n "$latest_log" ]; then
            echo "최신 로그 파일: $(basename "$latest_log")"
            echo ""
            read -p "최신 로그를 확인하시겠습니까? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "==================== 최신 로그 ===================="
                tail -20 "$latest_log"
                echo "================================================="
            fi
        fi
    else
        echo -e "${YELLOW}⚠️ 로그 디렉토리가 없습니다.${NC}"
        echo "자동화가 한번도 실행되지 않았을 수 있습니다."
    fi
}

# 메인 루프
main() {
    while true; do
        show_menu
        read -p "선택하세요 (1-6): " choice
        echo ""
        
        case $choice in
            1)
                setup_cron
                ;;
            2)
                check_github_actions
                ;;
            3)
                manual_test
                ;;
            4)
                check_status
                ;;
            5)
                check_logs
                ;;
            6)
                echo -e "${GREEN}👋 KBO 자동화 관리 시스템을 종료합니다.${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 잘못된 선택입니다. 1-6 중에서 선택하세요.${NC}"
                ;;
        esac
        
        echo ""
        read -p "계속하려면 Enter를 누르세요..."
        echo ""
    done
}

# 스크립트 실행
main