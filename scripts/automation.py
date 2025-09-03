#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NPB Daily Crawler Script
매일 자동 크롤링 및 데이터 정리 스크립트
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'crawler'))

import subprocess
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
import json
import psycopg2
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# 로깅 설정
def setup_logging():
    log_dir = Path(__file__).parent.parent / "logs" / "daily_crawler"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = log_dir / f"daily_{datetime.now().strftime('%Y%m%d')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger('daily_crawler')

logger = setup_logging()

class DailyCrawler:
    def __init__(self):
        self.crawler_path = Path(__file__).parent.parent / "crawler" / "npb_crawler.py"
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'npb_dashboard_dev'),
            'user': os.getenv('DB_USER', 'sanghunbruceham'),
            'password': os.getenv('DB_PASSWORD', '')
        }
        
    def run_crawler(self, days_back=3):
        """크롤러 실행"""
        try:
            logger.info(f"Starting crawler for last {days_back} days...")
            
            cmd = [str(self.crawler_path), str(days_back)]
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=300  # 5분 타임아웃
            )
            
            if result.returncode == 0:
                logger.info("✅ Crawler completed successfully")
                logger.info(f"Output: {result.stdout}")
                return True
            else:
                logger.error(f"❌ Crawler failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("❌ Crawler timed out")
            return False
        except Exception as e:
            logger.error(f"❌ Crawler error: {e}")
            return False
    
    def cleanup_old_data(self, days_to_keep=90):
        """오래된 데이터 정리"""
        try:
            logger.info(f"Cleaning up data older than {days_to_keep} days...")
            
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:
                    # 오래된 크롤링 로그 삭제
                    cur.execute(
                        "DELETE FROM crawl_logs WHERE crawl_timestamp < %s",
                        (cutoff_date,)
                    )
                    deleted_logs = cur.rowcount
                    
                    # 매우 오래된 게임 데이터는 보관 (삭제하지 않음)
                    logger.info(f"✅ Cleaned up {deleted_logs} old crawl logs")
                    
        except Exception as e:
            logger.error(f"❌ Cleanup failed: {e}")
    
    def backup_data(self):
        """데이터 백업"""
        try:
            logger.info("Creating daily data backup...")
            
            backup_dir = Path(__file__).parent.parent / "data" / "backups"
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            today = datetime.now().strftime('%Y%m%d')
            
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:
                    # 최근 게임 데이터 백업
                    cur.execute("""
                        SELECT json_agg(g.*)
                        FROM games g 
                        WHERE g.game_date >= CURRENT_DATE - INTERVAL '7 days'
                    """)
                    games_data = cur.fetchone()[0]
                    
                    if games_data:
                        backup_file = backup_dir / f"games_backup_{today}.json"
                        with open(backup_file, 'w', encoding='utf-8') as f:
                            json.dump(games_data, f, ensure_ascii=False, indent=2, default=str)
                        
                        logger.info(f"✅ Data backed up to {backup_file}")
                    
        except Exception as e:
            logger.error(f"❌ Backup failed: {e}")
    
    def check_data_health(self):
        """데이터 상태 점검"""
        try:
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor() as cur:
                    # 오늘 게임 데이터 확인
                    cur.execute("""
                        SELECT COUNT(*) 
                        FROM games 
                        WHERE game_date = CURRENT_DATE
                    """)
                    today_games = cur.fetchone()[0]
                    
                    # 최근 7일 게임 수 확인
                    cur.execute("""
                        SELECT COUNT(*) 
                        FROM games 
                        WHERE game_date >= CURRENT_DATE - INTERVAL '7 days'
                    """)
                    week_games = cur.fetchone()[0]
                    
                    logger.info(f"📊 Health Check - Today: {today_games} games, Week: {week_games} games")
                    
                    # 이상 감지
                    if week_games < 20:  # 일주일에 20경기 미만이면 이상
                        logger.warning("⚠️ Low game count detected - check crawler")
                        return False
                    
                    return True
                    
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False
    
    def run_daily_maintenance(self):
        """일일 정기 작업 실행"""
        logger.info("🚀 Starting daily NPB maintenance...")
        
        success = True
        
        # 1. 결과 경기 크롤링
        if not self.run_crawler():
            success = False
        
        # 예정 경기는 results_crawler에서 함께 처리
        
        # 2. DB → JSON 동기화 (자동)
        logger.info("🔄 Syncing DB to JSON...")
        try:
            import subprocess
            sync_cmd = [
                str(Path(__file__).parent / "data_manager.py"),
                "--sync"
            ]
            result = subprocess.run(sync_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("✅ DB to JSON sync completed")
            else:
                logger.error(f"❌ DB to JSON sync failed: {result.stderr}")
                success = False
        except Exception as e:
            logger.error(f"❌ JSON sync error: {e}")
            success = False
        
        # 3. 데이터 상태 점검
        if not self.check_data_health():
            success = False
        
        # 4. 데이터 백업
        self.backup_data()
        
        # 5. 오래된 데이터 정리
        self.cleanup_old_data()
        
        if success:
            logger.info("✅ Daily maintenance completed successfully")
        else:
            logger.error("❌ Daily maintenance completed with errors")
        
        return success

def main():
    crawler = DailyCrawler()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--crawler-only':
            success = crawler.run_crawler()
        elif sys.argv[1] == '--backup-only':
            crawler.backup_data()
            success = True
        elif sys.argv[1] == '--cleanup-only':
            crawler.cleanup_old_data()
            success = True
        else:
            success = crawler.run_daily_maintenance()
    else:
        success = crawler.run_daily_maintenance()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()