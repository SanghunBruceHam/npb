#!/usr/bin/env python3
"""
Database setup script for NPB stats
Creates database, user, and runs initial schema
"""

import psycopg2
from psycopg2 import sql
import os
import sys

def create_database():
    """Create NPB database and user"""
    # Connect to PostgreSQL as superuser
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",  # You may need to adjust this
            password=""  # You may need to add password
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'npb_stats'")
        exists = cur.fetchone()
        
        if exists:
            print("Database 'npb_stats' already exists. Dropping and recreating...")
            # Terminate existing connections
            cur.execute("""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = 'npb_stats'
                AND pid <> pg_backend_pid()
            """)
            cur.execute("DROP DATABASE IF EXISTS npb_stats")
        
        # Create database
        cur.execute("CREATE DATABASE npb_stats WITH ENCODING 'UTF8'")
        print("Database 'npb_stats' created successfully")
        
        # Create user if not exists
        cur.execute("SELECT 1 FROM pg_user WHERE usename = 'npb_user'")
        if not cur.fetchone():
            cur.execute("CREATE USER npb_user WITH PASSWORD 'npb_password'")
            print("User 'npb_user' created")
        
        # Grant privileges
        cur.execute("GRANT ALL PRIVILEGES ON DATABASE npb_stats TO npb_user")
        print("Privileges granted to npb_user")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error creating database: {e}")
        sys.exit(1)

def run_schema():
    """Run the schema creation SQL"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="npb_stats",
            user="npb_user",
            password="npb_password"
        )
        cur = conn.cursor()
        
        # Read and execute schema file
        schema_file = os.path.join(os.path.dirname(__file__), 'create_tables.sql')
        with open(schema_file, 'r') as f:
            sql_commands = f.read()
        
        cur.execute(sql_commands)
        conn.commit()
        print("Schema created successfully")
        
        # Verify tables were created
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        print("\nCreated tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Verify teams were inserted
        cur.execute("SELECT COUNT(*) FROM teams")
        team_count = cur.fetchone()[0]
        print(f"\nInserted {team_count} teams")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error running schema: {e}")
        sys.exit(1)

def test_connection():
    """Test the database connection"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="npb_stats",
            user="npb_user",
            password="npb_password"
        )
        cur = conn.cursor()
        
        # Test query
        cur.execute("""
            SELECT team_name_jp, team_abbr, league 
            FROM teams 
            ORDER BY league, team_name_jp
        """)
        teams = cur.fetchall()
        
        print("\nDatabase connection test successful!")
        print("\nTeams in database:")
        current_league = None
        for team in teams:
            if team[2] != current_league:
                current_league = team[2]
                print(f"\n{current_league} League:")
            print(f"  {team[1]}: {team[0]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Connection test failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("NPB Database Setup")
    print("=" * 50)
    
    # Create database
    print("\n1. Creating database...")
    create_database()
    
    # Run schema
    print("\n2. Creating schema...")
    run_schema()
    
    # Test connection
    print("\n3. Testing connection...")
    test_connection()
    
    print("\n" + "=" * 50)
    print("Database setup completed successfully!")
    print("\nConnection details:")
    print("  Host: localhost")
    print("  Database: npb_stats")
    print("  User: npb_user")
    print("  Password: npb_password")
    print("  Port: 5432")