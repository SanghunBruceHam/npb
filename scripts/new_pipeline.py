#!/usr/bin/env python3
"""
완전 새로운 NPB Pipeline
웹 크롤링 → TXT 저장 → JavaScript 처리 → JSON 저장
"""

import sys
import os
import subprocess
from pathlib import Path
import logging
from datetime import datetime

# 프로젝트 경로 설정
project_root = Path(__file__).parent.parent

def setup_logging():
    """New Pipeline 전용 로깅 설정"""
    log_dir = project_root / "logs" / "new_pipeline"
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = log_dir / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger('new_pipeline')

def run_web_crawler(mode="7", use_legacy=False):
    """웹 크롤링 실행 (TXT 직접 저장)
    기본: 최소 경로(min_results_crawler.py) 사용
    --legacy-crawler 옵션으로 기존 simple_crawler 사용 가능
    """
    if mode == "full-season":
        logger.info("🕷️ Starting FULL SEASON web crawling (from March 28)...")
        timeout = 1800  # 30분 (전체 시즌)
    else:
        logger.info(f"🕷️ Starting web crawling for {mode} days...")
        timeout = 300   # 5분 (일반)

    try:
        if use_legacy:
            crawler_path = project_root / 'crawler' / 'simple_crawler.py'
        else:
            crawler_path = project_root / 'crawler' / 'min_results_crawler.py'

        if mode == "full-season":
            cmd = ['python3', str(crawler_path), '--full-season']
        else:
            # min crawler supports bare integer argument too
            cmd = ['python3', str(crawler_path), str(mode)]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if result.returncode == 0:
            logger.info("✅ Web crawling completed successfully")
            if result.stdout:
                logger.info(f"Crawler output: {result.stdout}")
            if result.stderr:
                logger.info(f"Crawler stderr: {result.stderr}")
            return True
        else:
            logger.error(f"❌ Web crawling failed: {result.stderr}")
            return False

    except Exception as e:
        logger.error(f"❌ Web crawling error: {e}")
        return False

def convert_txt_to_json():
    """TXT → JavaScript 처리 → JSON 저장"""
    logger.info("🔄 Converting TXT to JSON via JavaScript...")
    
    try:
        cmd = ['node', str(project_root / 'scripts' / 'simple_txt_to_json.js')]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            logger.info("✅ TXT to JSON conversion completed")
            logger.info(f"Conversion output: {result.stdout}")
            return True
        else:
            logger.error(f"❌ TXT to JSON conversion failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ TXT to JSON conversion error: {e}")
        return False

def validate_output_files():
    """출력 파일들 검증"""
    logger.info("🔍 Validating output files...")
    
    required_files = [
        'standings.json',
        'games.json', 
        'teams.json',
        'dashboard.json'
    ]
    
    data_dir = project_root / 'data'
    valid_files = 0
    
    for filename in required_files:
        file_path = data_dir / filename
        if file_path.exists() and file_path.stat().st_size > 0:
            size_kb = file_path.stat().st_size // 1024
            mod_time = datetime.fromtimestamp(file_path.stat().st_mtime)
            logger.info(f"✅ {filename} ({size_kb}KB) - {mod_time.strftime('%H:%M:%S')}")
            valid_files += 1
        else:
            logger.error(f"❌ {filename} - Missing or empty")
    
    return valid_files == len(required_files)

def generate_final_summary():
    """최종 파이프라인 요약 생성"""
    logger.info("📊 Generating final pipeline summary...")
    
    try:
        import json
        
        summary = []
        summary.append("=" * 80)
        summary.append(f"NPB 완전 새로운 Pipeline 완료 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        summary.append("=" * 80)
        summary.append("")
        summary.append("🚀 Pipeline 플로우:")
        summary.append("  웹 크롤링 → TXT 저장 → JavaScript 처리 → JSON 저장")
        summary.append("  📝 간단하고 빠른 파이프라인!")
        summary.append("")
        
        # JSON 데이터 검증
        data_dir = project_root / 'data'
        
        # 순위표 정보
        standings_file = data_dir / 'standings.json'
        if standings_file.exists():
            with open(standings_file, 'r', encoding='utf-8') as f:
                standings_data = json.load(f)
                central_teams = len(standings_data.get('central_league', {}).get('standings', []))
                pacific_teams = len(standings_data.get('pacific_league', {}).get('standings', []))
                summary.append(f"📊 순위 계산: 센트럴 {central_teams}팀, 퍼시픽 {pacific_teams}팀")
        
        # 경기 정보
        games_file = data_dir / 'games.json'
        if games_file.exists():
            with open(games_file, 'r', encoding='utf-8') as f:
                games_data = json.load(f)
                total_games = len(games_data) if isinstance(games_data, list) else 0
                draws = sum(1 for game in games_data if game.get('is_draw', False)) if isinstance(games_data, list) else 0
                summary.append(f"⚾ 경기 데이터: {total_games}경기 (무승부 {draws}경기)")
        
        # 대시보드 정보
        dashboard_file = data_dir / 'dashboard.json'
        if dashboard_file.exists():
            with open(dashboard_file, 'r', encoding='utf-8') as f:
                dashboard_data = json.load(f)
                today_games = dashboard_data.get('season_stats', {}).get('today_games', 0)
                week_games = dashboard_data.get('season_stats', {}).get('week_games', 0)
                summary.append(f"📈 대시보드: 오늘 {today_games}경기, 이번주 {week_games}경기")
        
        summary.append("")
        summary.append("🎯 파이프라인 완료:")
        summary.append("  ✅ 웹 크롤링으로 실시간 데이터 수집")
        summary.append("  ✅ TXT 형식으로 데이터 저장")
        summary.append("  ✅ JavaScript로 순위 계산")
        summary.append("  ✅ JSON 파일 생성 (index.html 호환)")
        summary.append("  ✅ 외부 의존성 최소화")
        summary.append("")
        summary.append("🌐 서비스 준비 완료!")
        summary.append("  실행: ./run_html.sh")
        
        summary_text = '\n'.join(summary)
        logger.info(f"Final Pipeline Summary:\n{summary_text}")
        
        # 요약을 파일로도 저장
        summary_file = project_root / 'logs' / 'new_pipeline' / f"final_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary_text)
        
        logger.info(f"📋 Final summary saved to: {summary_file}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Summary generation error: {e}")
        return False

def main():
    """새로운 Pipeline 메인 실행"""
    global logger
    logger = setup_logging()
    
    logger.info("🚀 Starting NPB NEW PIPELINE")
    logger.info("🔄 Flow: Web Crawling → TXT → JavaScript → JSON")
    
    success_count = 0
    total_steps = 4
    
    # 인자 파싱
    args = sys.argv[1:]
    skip_crawl = False
    if '--skip-crawl' in args:
        skip_crawl = True
        args = [a for a in args if a != '--skip-crawl']

    use_legacy = False
    if '--legacy-crawler' in args:
        use_legacy = True
        args = [a for a in args if a != '--legacy-crawler']
    
    # 크롤링 모드 설정
    crawl_mode = "7"  # 기본 7일
    if len(args) > 0:
        if args[0] == '--full-season':
            crawl_mode = "full-season"
        elif args[0] == '--test':
            crawl_mode = "3"
        elif args[0] == '--quick':
            crawl_mode = "1"
        else:
            try:
                crawl_mode = str(int(args[0]))
            except ValueError:
                logger.error(f"Invalid argument: {args[0]}")
                sys.exit(1)
    
    # Step 1: 웹 크롤링 (TXT 저장)
    if skip_crawl:
        logger.info("Step 1/4: Skipping web crawl (--skip-crawl)")
        success_count += 1
    else:
        if crawl_mode == "full-season":
            logger.info("Step 1/4: Full season web crawling (from March 28)")
        else:
            logger.info(f"Step 1/4: Web crawling ({crawl_mode} days)")
        if run_web_crawler(crawl_mode, use_legacy=use_legacy):
            success_count += 1
    
    # Step 2: TXT → JSON 변환 (JavaScript 처리)  
    logger.info("Step 2/4: TXT to JSON conversion")
    if convert_txt_to_json():
        success_count += 1
    
    # Step 3: 출력 파일 검증
    logger.info("Step 3/4: Output file validation")
    if validate_output_files():
        success_count += 1
    
    # Step 4: 최종 요약
    logger.info("Step 4/4: Final summary generation")
    if generate_final_summary():
        success_count += 1
    
    # 최종 결과
    logger.info(f"🎯 NEW Pipeline completed: {success_count}/{total_steps} steps successful")
    
    if success_count == total_steps:
        logger.info("✅ All pipeline steps completed successfully!")
        logger.info("🌐 Ready for web service!")
        logger.info("🚀 Run: ./run_html.sh")
        logger.info("💾 Simple & Fast!")
        sys.exit(0)
    else:
        logger.error(f"❌ Pipeline failed: {total_steps - success_count} steps failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
