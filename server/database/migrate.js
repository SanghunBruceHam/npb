#!/usr/bin/env node

// NPB Dashboard Database Migration Script
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

class DatabaseMigrator {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'npb_dashboard_dev',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });

        this.schemaPath = path.join(__dirname, '../..', 'database', 'schema.sql');
    }

    async migrate() {
        const client = await this.pool.connect();
        
        try {
            console.log('🚀 Starting NPB Dashboard database migration...');
            
            // Check if schema file exists
            if (!fs.existsSync(this.schemaPath)) {
                throw new Error(`Schema file not found: ${this.schemaPath}`);
            }

            // Read and execute schema
            const schema = fs.readFileSync(this.schemaPath, 'utf8');
            console.log('📖 Reading database schema...');

            // Split schema into individual statements and execute them
            const statements = this.splitSQLStatements(schema);
            
            console.log(`📝 Executing ${statements.length} SQL statements...`);

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i].trim();
                if (statement) {
                    try {
                        await client.query(statement);
                        console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
                    } catch (error) {
                        // Skip errors for statements that might already exist
                        if (error.code === '42P07' || error.code === '42P06') { // relation/schema already exists
                            console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message.split('\n')[0]}`);
                        } else {
                            console.error(`❌ Error in statement ${i + 1}:`, statement.substring(0, 100) + '...');
                            throw error;
                        }
                    }
                }
            }

            // Verify tables were created
            await this.verifyTables(client);

            console.log('✅ Database migration completed successfully!');
            
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    splitSQLStatements(sql) {
        // Remove comments
        const cleanSQL = sql
            .replace(/--.*$/gm, '') // Remove line comments
            .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove block comments
            .replace(/\n\s*\n/g, '\n'); // Remove empty lines

        const statements = [];
        let current = '';
        let inDollarQuote = false;
        let dollarTag = '';
        
        const lines = cleanSQL.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines
            if (!trimmed) continue;
            
            // Check for dollar-quoted strings
            if (!inDollarQuote) {
                const dollarMatch = trimmed.match(/\$(\w*)\$/);
                if (dollarMatch) {
                    inDollarQuote = true;
                    dollarTag = dollarMatch[0];
                }
            } else {
                // Check if we're closing the dollar quote
                if (trimmed.includes(dollarTag) && trimmed !== dollarTag) {
                    inDollarQuote = false;
                    dollarTag = '';
                }
            }
            
            current += line + '\n';
            
            // If not in dollar quote and line ends with semicolon, it's end of statement
            if (!inDollarQuote && trimmed.endsWith(';')) {
                statements.push(current.trim());
                current = '';
            }
        }
        
        // Add any remaining content
        if (current.trim()) {
            statements.push(current.trim());
        }
        
        return statements.filter(statement => statement.length > 0);
    }

    async verifyTables(client) {
        console.log('🔍 Verifying database tables...');
        
        const expectedTables = [
            'teams',
            'seasons', 
            'games',
            'standings',
            'head_to_head_records',
            'magic_numbers',
            'player_stats',
            'team_stats'
        ];

        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        const existingTables = result.rows.map(row => row.table_name);
        console.log('📊 Existing tables:', existingTables.join(', '));

        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            console.warn('⚠️  Missing tables:', missingTables.join(', '));
        }

        console.log(`✅ Verification complete: ${existingTables.length} tables found`);
    }

    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
            client.release();
            
            console.log('✅ Database connection successful!');
            console.log('🕐 Current time:', result.rows[0].current_time);
            console.log('🐘 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0]);
            
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            console.error('💡 Make sure PostgreSQL is running and check your .env configuration');
            return false;
        }
    }

    async close() {
        await this.pool.end();
    }
}

// CLI execution
async function main() {
    const migrator = new DatabaseMigrator();
    
    try {
        // Test connection first
        const connected = await migrator.testConnection();
        if (!connected) {
            process.exit(1);
        }

        // Run migration
        await migrator.migrate();
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('💡 You can now run: npm run db:seed');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure PostgreSQL is running');
        } else if (error.code === '3D000') {
            console.error('💡 Database does not exist. Create it first:');
            console.error('   createdb npb_dashboard_dev');
        } else if (error.code === '28P01') {
            console.error('💡 Check your database credentials in .env file');
        }
        
        process.exit(1);
    } finally {
        await migrator.close();
    }
}

// Export for testing
module.exports = { DatabaseMigrator };

// Run if called directly
if (require.main === module) {
    main();
}