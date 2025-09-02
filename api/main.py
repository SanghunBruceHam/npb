"""
NPB Dashboard API Server
FastAPI 기반 NPB 데이터 API 서버
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from routes import dashboard, standings, games, teams
from models.database import db

# FastAPI 앱 초기화
app = FastAPI(
    title="NPB Dashboard API",
    description="일본 프로야구(NPB) 데이터 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(dashboard.router)
app.include_router(standings.router)
app.include_router(games.router)
app.include_router(teams.router)

# 기본 엔드포인트
@app.get("/")
async def root():
    """API 루트"""
    return {
        "message": "NPB Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "dashboard": "/dashboard",
            "standings": "/standings",
            "games": "/games",
            "teams": "/teams"
        }
    }

@app.get("/health")
async def health_check():
    """서버 상태 체크"""
    try:
        # 데이터베이스 연결 테스트
        result = db.execute_single("SELECT 1 as test")
        
        if result and result['test'] == 1:
            db_status = "healthy"
        else:
            db_status = "unhealthy"
            
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "database": db_status,
        "message": "NPB Dashboard API Health Check"
    }

@app.get("/api-info")
async def api_info():
    """API 정보"""
    return {
        "api_name": "NPB Dashboard API",
        "version": "1.0.0",
        "description": "일본 프로야구(NPB) 데이터 제공 API",
        "features": [
            "실시간 순위표",
            "경기 결과 조회", 
            "팀별 상세 통계",
            "매직넘버 계산",
            "상대전적 분석"
        ],
        "data_source": "니칸스포츠 (nikkansports.com)",
        "update_frequency": "30분마다 (JST 16:30-23:30)",
        "endpoints": {
            "dashboard": {
                "path": "/dashboard",
                "description": "메인 대시보드 데이터"
            },
            "standings": {
                "path": "/standings", 
                "description": "순위표 및 매직넘버"
            },
            "games": {
                "path": "/games",
                "description": "경기 결과 조회"
            },
            "teams": {
                "path": "/teams",
                "description": "팀별 상세 정보"
            }
        }
    }

# 예외 처리
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Not found", "message": "요청한 리소스를 찾을 수 없습니다."}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": "서버 내부 오류가 발생했습니다."}
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )