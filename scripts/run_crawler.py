#!/usr/bin/env python3
"""
Script to run NPB crawler and export data
"""

import sys
import os
from datetime import datetime, timedelta
import argparse

# Add crawler directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'crawler'))

from npb_crawler_v2 import NPBCrawler

def main():
    parser = argparse.ArgumentParser(description='Run NPB Crawler')
    parser.add_argument('--start-date', type=str, help='Start date (YYYY-MM-DD)', default='2025-03-28')
    parser.add_argument('--end-date', type=str, help='End date (YYYY-MM-DD)', default=None)
    parser.add_argument('--clear-data', action='store_true', help='Clear existing data before crawling')
    parser.add_argument('--export-only', action='store_true', help='Only export data to TXT, no crawling')
    
    args = parser.parse_args()
    
    # Database configuration
    db_config = {
        'host': 'localhost',
        'database': 'npb_stats',
        'user': 'npb_user',
        'password': 'npb_password',
        'port': 5432
    }
    
    # Initialize crawler
    crawler = NPBCrawler(db_config)
    
    if args.export_only:
        print("Exporting data to TXT files only...")
        crawler.export_to_txt()
        return
    
    # Parse dates
    start_date = datetime.strptime(args.start_date, '%Y-%m-%d')
    end_date = datetime.strptime(args.end_date, '%Y-%m-%d') if args.end_date else datetime.now()
    
    print(f"NPB Crawler - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    print(f"Clear existing data: {args.clear_data}")
    print("=" * 60)
    
    # Clear data if requested
    if args.clear_data:
        print("Clearing existing data...")
        crawler.clear_existing_data()
    
    # Run crawler
    crawler.run_full_crawl(start_date, end_date)
    
    print("\nCrawling completed!")
    print("Data has been saved to database and exported to TXT files.")

if __name__ == "__main__":
    main()