#!/bin/bash
# NPB 웹 프론트엔드 실행 스크립트

cd web

echo "🌐 Starting NPB Dashboard Frontend..."
echo "📁 Working directory: $(pwd)"

# 패키지 설치
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🚀 Frontend starting at http://localhost:3000"
echo "📚 API Backend should be running at http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop"

npm run dev