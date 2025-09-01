const { Pool } = require('pg');
const redis = require('redis');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'npb_dashboard_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Redis connection
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0,
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('Redis connection refused');
            return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
            return new Error('Redis retry attempts exhausted');
        }
        return Math.min(options.attempt * 100, 3000);
    }
});

// Database connection test
async function testConnection() {
    try {
        // Test PostgreSQL connection
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ PostgreSQL connection successful:', {
            currentTime: result.rows[0].current_time,
            version: result.rows[0].pg_version.split(' ')[0]
        });
        client.release();

        // Test Redis connection
        if (process.env.NODE_ENV !== 'test') {
            await redisClient.connect();
            await redisClient.set('connection_test', 'success', 'EX', 10);
            const testValue = await redisClient.get('connection_test');
            console.log('✅ Redis connection successful:', { testValue });
        }

        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', {
            error: error.message,
            code: error.code
        });
        return false;
    }
}

// Database query helper with connection pooling
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('Database query executed:', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration: `${duration}ms`,
                rows: result.rowCount
            });
        }
        
        return result;
    } catch (error) {
        console.error('Database query error:', {
            error: error.message,
            query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            params: params
        });
        throw error;
    }
}

// Transaction helper
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Redis helpers
const cache = {
    async get(key) {
        try {
            if (!redisClient.isOpen) await redisClient.connect();
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Redis GET error:', error.message);
            return null;
        }
    },

    async set(key, value, ttl = 300) {
        try {
            if (!redisClient.isOpen) await redisClient.connect();
            const serialized = JSON.stringify(value);
            await redisClient.setEx(key, ttl, serialized);
            return true;
        } catch (error) {
            console.error('Redis SET error:', error.message);
            return false;
        }
    },

    async del(key) {
        try {
            if (!redisClient.isOpen) await redisClient.connect();
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Redis DEL error:', error.message);
            return false;
        }
    },

    async exists(key) {
        try {
            if (!redisClient.isOpen) await redisClient.connect();
            const exists = await redisClient.exists(key);
            return exists === 1;
        } catch (error) {
            console.error('Redis EXISTS error:', error.message);
            return false;
        }
    }
};

// Graceful shutdown
async function closeConnections() {
    console.log('Closing database connections...');
    try {
        await pool.end();
        if (redisClient.isOpen) {
            await redisClient.disconnect();
        }
        console.log('✅ Database connections closed successfully');
    } catch (error) {
        console.error('❌ Error closing database connections:', error.message);
    }
}

// Connection event handlers
pool.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('New PostgreSQL connection established');
    }
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err.message);
});

redisClient.on('error', (err) => {
    console.error('Redis client error:', err.message);
});

redisClient.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('Redis connection established');
    }
});

// Initialize connections
async function initializeConnections() {
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.error('Failed to establish database connections');
            process.exit(1);
        }
        console.log('🚀 Database connections initialized successfully');
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        process.exit(1);
    }
}

module.exports = {
    pool,
    redisClient,
    query,
    transaction,
    cache,
    testConnection,
    closeConnections,
    initializeConnections
};