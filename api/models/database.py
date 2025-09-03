"""
Database connection and models
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pathlib import Path

# Load environment from current dir and project root as fallback
load_dotenv()
root_env = Path(__file__).resolve().parents[2] / '.env'
if root_env.exists():
    load_dotenv(dotenv_path=root_env, override=False)

class Database:
    def __init__(self):
        self.config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'npb_dashboard_dev'),
            'user': os.getenv('DB_USER', 'sanghunbruceham'),
            'password': os.getenv('DB_PASSWORD', '')
        }
    
    def get_connection(self):
        """데이터베이스 연결"""
        return psycopg2.connect(**self.config)
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """쿼리 실행 및 결과 반환"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return [dict(row) for row in cur.fetchall()]
    
    def execute_single(self, query: str, params: tuple = None) -> Optional[Dict]:
        """단일 결과 반환"""
        results = self.execute_query(query, params)
        return results[0] if results else None

db = Database()
