#!/usr/bin/env python3
"""
크롤러 파일 정리 스크립트
Crawler file cleanup script
"""

import os
import shutil
from pathlib import Path
import logging

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger('crawler_cleanup')

def clean_pycache():
    """Python 캐시 파일 정리"""
    logger = setup_logging()
    
    project_root = Path(__file__).parent.parent
    removed_count = 0
    
    # __pycache__ 디렉토리 제거
    for pycache_dir in project_root.rglob("__pycache__"):
        try:
            shutil.rmtree(pycache_dir)
            removed_count += 1
            logger.info(f"Removed: {pycache_dir}")
        except Exception as e:
            logger.error(f"Failed to remove {pycache_dir}: {e}")
    
    # .pyc 파일 제거
    for pyc_file in project_root.rglob("*.pyc"):
        try:
            pyc_file.unlink()
            removed_count += 1
            logger.info(f"Removed: {pyc_file}")
        except Exception as e:
            logger.error(f"Failed to remove {pyc_file}: {e}")
    
    logger.info(f"✅ Cleaned {removed_count} cache files/directories")
    return removed_count

def clean_large_logs():
    """큰 로그 파일 정리"""
    logger = setup_logging()
    
    project_root = Path(__file__).parent.parent
    removed_count = 0
    size_limit = 10 * 1024 * 1024  # 10MB
    
    for log_file in project_root.rglob("*.log"):
        try:
            if log_file.stat().st_size > size_limit:
                log_file.unlink()
                removed_count += 1
                logger.info(f"Removed large log: {log_file}")
        except Exception as e:
            logger.error(f"Failed to check/remove {log_file}: {e}")
    
    logger.info(f"✅ Cleaned {removed_count} large log files")
    return removed_count

def clean_temp_files():
    """임시 파일 정리"""
    logger = setup_logging()
    
    project_root = Path(__file__).parent.parent
    removed_count = 0
    
    temp_patterns = ["*.tmp", "*.temp", "*.bak", "*.backup"]
    
    for pattern in temp_patterns:
        for temp_file in project_root.rglob(pattern):
            try:
                temp_file.unlink()
                removed_count += 1
                logger.info(f"Removed temp file: {temp_file}")
            except Exception as e:
                logger.error(f"Failed to remove {temp_file}: {e}")
    
    logger.info(f"✅ Cleaned {removed_count} temporary files")
    return removed_count

def optimize_data_structure():
    """데이터 구조 최적화"""
    logger = setup_logging()
    
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    
    # 필요한 디렉토리 생성
    required_dirs = [
        data_dir / "raw",
        data_dir / "processed", 
        data_dir / "backups",
        data_dir / "archive",
        data_dir / "temp"
    ]
    
    for dir_path in required_dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Ensured directory exists: {dir_path}")
    
    logger.info("✅ Data structure optimized")

def get_directory_size(path):
    """디렉토리 크기 계산"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            try:
                total_size += os.path.getsize(file_path)
            except (OSError, IOError):
                pass
    return total_size

def main():
    """메인 정리 함수"""
    logger = setup_logging()
    
    project_root = Path(__file__).parent.parent
    
    logger.info("🧹 Starting crawler cleanup...")
    
    # 정리 전 크기 체크
    initial_size = get_directory_size(project_root)
    logger.info(f"Initial project size: {initial_size / (1024*1024):.1f} MB")
    
    # 정리 작업
    pycache_removed = clean_pycache()
    logs_removed = clean_large_logs() 
    temp_removed = clean_temp_files()
    optimize_data_structure()
    
    # 정리 후 크기 체크
    final_size = get_directory_size(project_root)
    saved_size = initial_size - final_size
    
    logger.info(f"Final project size: {final_size / (1024*1024):.1f} MB")
    logger.info(f"Space saved: {saved_size / (1024*1024):.1f} MB")
    
    logger.info("✅ Crawler cleanup completed!")
    
    return {
        'pycache_removed': pycache_removed,
        'logs_removed': logs_removed,
        'temp_removed': temp_removed,
        'space_saved_mb': saved_size / (1024*1024)
    }

if __name__ == "__main__":
    main()