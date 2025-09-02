#!/bin/bash
# NPB API 서버 실행 스크립트

cd api

# Python 가상환경 확인 및 생성
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

echo "🚀 Starting NPB API Server..."
echo "📁 Working directory: $(pwd)"

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치 (requirements.txt가 변경된 경우)
echo "📦 Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

# API 서버 실행
echo "🌐 Server starting at http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo "🔍 ReDoc: http://localhost:8000/redoc"
echo ""
echo "Press Ctrl+C to stop"

python main.py