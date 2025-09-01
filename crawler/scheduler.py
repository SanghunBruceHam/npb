#!/usr/bin/env python3
"""
NPB Crawler Scheduler
크롤러 스케줄링 및 자동 실행
"""

import schedule
import time
import sys
import os
from datetime import datetime
from loguru import logger
from npb_crawler import NPBCrawler
from config import CRAWLER_CONFIG

class CrawlerScheduler:
    """크롤러 스케줄러"""
    
    def __init__(self):
        self.crawler = NPBCrawler()
        self.setup_logging()
        self.setup_schedules()
    
    def setup_logging(self):
        """로깅 설정"""
        logger.remove()
        logger.add(
            sys.stdout,
            level="INFO",
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>"
        )
        
        logger.add(
            "logs/scheduler.log",
            level="INFO", 
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name} - {message}",
            rotation="10 MB",
            retention="30 days"
        )
    
    def setup_schedules(self):
        """스케줄 설정"""
        # 전체 업데이트 (6시간마다)
        schedule.every(6).hours.do(self.run_full_crawl)
        
        # 순위표 업데이트 (1시간마다)
        schedule.every().hour.do(self.run_standings_crawl)
        
        # 경기 결과 업데이트 (30분마다) 
        schedule.every(30).minutes.do(self.run_games_crawl)
        
        # 일일 정리 작업 (매일 새벽 3시)
        schedule.every().day.at("03:00").do(self.run_daily_cleanup)
        
        logger.info("Crawler schedules configured")
        logger.info("- Full crawl: every 6 hours")
        logger.info("- Standings: every hour")
        logger.info("- Games: every 30 minutes")
        logger.info("- Daily cleanup: 03:00")
    
    def run_full_crawl(self):
        """전체 크롤링 실행"""
        logger.info("Starting scheduled full crawl...")
        try:
            success = self.crawler.run_full_crawl()
            status = "completed successfully" if success else "failed"
            logger.info(f"Scheduled full crawl {status}")
        except Exception as e:
            logger.error(f"Scheduled full crawl failed: {e}")
    
    def run_standings_crawl(self):
        """순위표 크롤링"""
        logger.info("Starting scheduled standings crawl...")
        try:
            standings = self.crawler.parse_npb_standings()
            if standings:
                success = self.crawler.update_standings(standings)
                if success:
                    logger.info(f"Updated standings for {len(standings)} teams")
                else:
                    logger.warning("Failed to update standings")
            else:
                logger.warning("No standings data collected")
        except Exception as e:
            logger.error(f"Scheduled standings crawl failed: {e}")
    
    def run_games_crawl(self):
        """경기 결과 크롤링"""
        logger.info("Starting scheduled games crawl...")
        try:
            games = self.crawler.parse_recent_games(days_back=3)
            if games:
                success = self.crawler.update_games(games)
                if success:
                    logger.info(f"Updated {len(games)} recent games")
                else:
                    logger.warning("Failed to update games")
            else:
                logger.info("No recent games to update")
        except Exception as e:
            logger.error(f"Scheduled games crawl failed: {e}")
    
    def run_daily_cleanup(self):
        """일일 정리 작업"""
        logger.info("Starting daily cleanup...")
        try:
            # 오래된 크롤 로그 정리 (30일 이상)
            with self.crawler.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM crawl_logs 
                        WHERE crawl_timestamp < CURRENT_TIMESTAMP - INTERVAL '30 days'
                    """)
                    deleted_logs = cur.rowcount
                    
                    # 중복 경기 데이터 정리
                    cur.execute("""
                        DELETE FROM games a
                        WHERE a.game_id NOT IN (
                            SELECT MIN(b.game_id)
                            FROM games b
                            WHERE b.home_team_id = a.home_team_id
                              AND b.away_team_id = a.away_team_id  
                              AND b.game_date = a.game_date
                        )
                    """)
                    deleted_games = cur.rowcount
                    
                    conn.commit()
                    
            logger.info(f"Daily cleanup completed: {deleted_logs} old logs, {deleted_games} duplicate games removed")
            
        except Exception as e:
            logger.error(f"Daily cleanup failed: {e}")
    
    def run_once(self, job_type: str = "full"):
        """일회성 실행"""
        logger.info(f"Running one-time {job_type} crawl...")
        
        if job_type == "full":
            self.run_full_crawl()
        elif job_type == "standings":
            self.run_standings_crawl()
        elif job_type == "games":
            self.run_games_crawl()
        elif job_type == "cleanup":
            self.run_daily_cleanup()
        else:
            logger.error(f"Unknown job type: {job_type}")
    
    def start(self):
        """스케줄러 시작"""
        logger.info("NPB Crawler Scheduler started")
        logger.info("Press Ctrl+C to stop")
        
        # 시작시 한번 전체 크롤링 실행
        self.run_full_crawl()
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # 1분마다 스케줄 체크
                
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            raise
    
    def status(self):
        """스케줄러 상태 출력"""
        logger.info("Scheduler Status:")
        logger.info(f"- Next full crawl: {schedule.next_run()}")
        logger.info(f"- Jobs scheduled: {len(schedule.jobs)}")
        
        for job in schedule.jobs:
            logger.info(f"  * {job}")

def main():
    """메인 실행 함수"""
    scheduler = CrawlerScheduler()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "start":
            scheduler.start()
        elif command == "status":
            scheduler.status()
        elif command in ["full", "standings", "games", "cleanup"]:
            scheduler.run_once(command)
        elif command == "test":
            logger.info("Running test crawl...")
            scheduler.run_once("full")
        else:
            print("Usage: python scheduler.py [start|status|full|standings|games|cleanup|test]")
            print("Commands:")
            print("  start      - Start the scheduler daemon")
            print("  status     - Show scheduler status")
            print("  full       - Run full crawl once")
            print("  standings  - Run standings crawl once")
            print("  games      - Run games crawl once") 
            print("  cleanup    - Run cleanup once")
            print("  test       - Run test crawl")
            sys.exit(1)
    else:
        # 기본값: 스케줄러 시작
        scheduler.start()

if __name__ == "__main__":
    main()