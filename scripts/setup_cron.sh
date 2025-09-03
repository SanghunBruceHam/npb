#!/bin/bash
"""
NPB Daily Crawler Cron Setup Script
매일 자동 크롤링을 위한 cron job 설정
"""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 NPB Daily Crawler Cron Setup${NC}"
echo "=================================="

# 프로젝트 경로 설정
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAILY_CRAWLER="$PROJECT_DIR/scripts/daily_crawler.py"

echo -e "${YELLOW}📂 Project directory: $PROJECT_DIR${NC}"

# Python 가상환경 확인
if [[ -f "$PROJECT_DIR/crawler/venv/bin/python3" ]]; then
    PYTHON_PATH="$PROJECT_DIR/crawler/venv/bin/python3"
    echo -e "${GREEN}✅ Found Python venv: $PYTHON_PATH${NC}"
else
    PYTHON_PATH=$(which python3)
    echo -e "${YELLOW}⚠️ Using system Python: $PYTHON_PATH${NC}"
fi

# 실행 권한 부여
chmod +x "$DAILY_CRAWLER"
echo -e "${GREEN}✅ Made daily_crawler.py executable${NC}"

# 크롤러 가상환경 Python 경로 업데이트
if [[ -f "$PROJECT_DIR/crawler/venv/bin/python3" ]]; then
    PYTHON_PATH="$PROJECT_DIR/crawler/venv/bin/python3"
    echo -e "${GREEN}✅ Using crawler venv Python: $PYTHON_PATH${NC}"
else
    echo -e "${RED}❌ Crawler venv not found at $PROJECT_DIR/crawler/venv/${NC}"
    echo -e "${YELLOW}⚠️ Please run: cd $PROJECT_DIR/crawler && ./setup.sh${NC}"
    exit 1
fi

# 로그 디렉토리 생성
mkdir -p "$PROJECT_DIR/logs/daily_crawler"
mkdir -p "$PROJECT_DIR/data/backups"
echo -e "${GREEN}✅ Created log and backup directories${NC}"

# Cron job 내용 생성
CRON_ENTRY="# NPB Daily Crawler - 매일 오전 6시, 오후 6시 실행
0 6,18 * * * cd $PROJECT_DIR && $PYTHON_PATH $DAILY_CRAWLER >> $PROJECT_DIR/logs/daily_crawler/cron.log 2>&1

# NPB 주간 정리 작업 - 매주 일요일 오전 3시
0 3 * * 0 cd $PROJECT_DIR && $PYTHON_PATH $DAILY_CRAWLER --cleanup-only >> $PROJECT_DIR/logs/daily_crawler/weekly_cleanup.log 2>&1"

echo -e "${YELLOW}📝 Cron job to be added:${NC}"
echo "$CRON_ENTRY"
echo ""

# 기존 NPB cron job 제거
echo -e "${YELLOW}🧹 Removing existing NPB cron jobs...${NC}"
crontab -l 2>/dev/null | grep -v "NPB Daily Crawler" | grep -v "daily_crawler.py" | crontab -

# 새 cron job 추가
echo -e "${YELLOW}➕ Adding new cron job...${NC}"
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

# 확인
echo -e "${GREEN}✅ Cron job installed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Current cron jobs:${NC}"
crontab -l | grep -A2 -B2 "NPB"

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "Manual execution commands:"
echo "• Full maintenance:    $PYTHON_PATH $DAILY_CRAWLER"
echo "• Results crawler:     $PYTHON_PATH $PROJECT_DIR/crawler/results_crawler.py --test"
echo "• Upcoming crawler:    $PYTHON_PATH $PROJECT_DIR/crawler/upcoming_crawler.py 7"
echo "• Unified crawler:     $PYTHON_PATH $PROJECT_DIR/crawler/unified_crawler.py"
echo "• Daily maintenance:   $PYTHON_PATH $DAILY_CRAWLER --crawler-only"
echo "• Backup only:         $PYTHON_PATH $DAILY_CRAWLER --backup-only"
echo "• Cleanup only:        $PYTHON_PATH $DAILY_CRAWLER --cleanup-only"
echo ""
echo "Log files:"
echo "• Cron logs:          $PROJECT_DIR/logs/daily_crawler/"
echo "• Crawler logs:       $PROJECT_DIR/crawler/logs/"
echo "• Data backups:       $PROJECT_DIR/data/backups/"
echo ""
echo "Data management:"
echo "• Sync DB to JSON:    $PYTHON_PATH $PROJECT_DIR/scripts/data_manager.py --sync"
echo "• Archive old data:   $PYTHON_PATH $PROJECT_DIR/scripts/data_manager.py --archive"
echo "• Data summary:       $PYTHON_PATH $PROJECT_DIR/scripts/data_manager.py --summary"
echo ""
echo -e "${YELLOW}⚠️  Note: Cron jobs will run at 6 AM and 6 PM daily${NC}"
echo -e "${YELLOW}⚠️  Weekly cleanup runs at 3 AM every Sunday${NC}"