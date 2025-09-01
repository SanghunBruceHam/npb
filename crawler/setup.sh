#!/bin/bash

# NPB Crawler Setup Script
# 크롤러 환경 설정 스크립트

set -e

echo "🚀 NPB Crawler Setup Starting..."

# Python 버전 확인
python_version=$(python3 --version 2>&1 | cut -d" " -f2 | cut -d"." -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Python 3.8+ required, found: $python_version"
    exit 1
fi

echo "✅ Python version: $python_version"

# 가상환경 생성
VENV_DIR="venv"

if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv $VENV_DIR
else
    echo "✅ Virtual environment already exists"
fi

# 가상환경 활성화
echo "🔧 Activating virtual environment..."
source $VENV_DIR/bin/activate

# 의존성 설치
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Dependencies installed successfully"

# 로그 디렉토리 생성
echo "📁 Creating log directory..."
mkdir -p ../logs

# 권한 설정
echo "🔐 Setting permissions..."
chmod +x npb_crawler.py
chmod +x scheduler.py

# 설정 파일 검증
echo "🔍 Verifying configuration..."
python3 -c "
import config
print('✅ Config file loaded successfully')
print(f'✅ Teams configured: {len([team for league in config.NPB_TEAMS.values() for team in league.values()])}')
print(f'✅ Data sources configured: {len(config.DATA_SOURCES)}')
"

# 데이터베이스 연결 테스트
echo "🗄️ Testing database connection..."
python3 -c "
import os
import sys
sys.path.append('..')
from dotenv import load_dotenv
load_dotenv('../.env')

try:
    import psycopg2
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'npb_dashboard_dev'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', '')
    )
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM teams')
    team_count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    print(f'✅ Database connected successfully: {team_count} teams found')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    print('💡 Make sure PostgreSQL is running and database is migrated')
    exit(1)
"

echo ""
echo "🎉 NPB Crawler setup completed successfully!"
echo ""
echo "Usage:"
echo "  source venv/bin/activate          # Activate virtual environment"
echo "  python npb_crawler.py --test     # Run test crawl"
echo "  python scheduler.py start        # Start scheduled crawler"
echo "  python scheduler.py full         # Run full crawl once"
echo ""
echo "Environment variables (set in ../.env):"
echo "  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
echo "  LOG_LEVEL (DEBUG, INFO, WARNING, ERROR)"
echo ""