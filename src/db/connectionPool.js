/**
 * PostgreSQL Connection Pool Manager
 * Manages database connection pool with lazy initialization for Lambda
 */

const { Pool } = require('pg')
const { getDatabaseCredentials } = require('../utils/secretsManager')

// Reuse connection pool across warm Lambda invocations
let pool = null
let isInitializing = false
let initPromise = null

/**
 * Get or create database connection pool
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
async function getPool() {
  // Return existing pool if available
  if (pool) {
    return pool
  }

  // If already initializing, wait for that promise
  if (isInitializing && initPromise) {
    return initPromise
  }

  // Start initialization
  isInitializing = true
  initPromise = initializePool()
  
  try {
    pool = await initPromise
    return pool
  } finally {
    isInitializing = false
    initPromise = null
  }
}

/**
 * Initialize the connection pool
 * @returns {Promise<Pool>} Initialized connection pool
 */
async function initializePool() {
  try {
    const secretName = process.env.DB_SECRET_NAME
    if (!secretName) {
      throw new Error('DB_SECRET_NAME environment variable is not set')
    }

    // Get credentials from Secrets Manager
    const credentials = await getDatabaseCredentials(secretName)

    // Get pool configuration from environment
    const poolSize = parseInt(process.env.DB_POOL_SIZE || '2', 10)
    const connectionTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10)
    const idleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10)

    // Create connection pool
    const newPool = new Pool({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      user: credentials.user,
      password: credentials.password,
      max: poolSize, // Maximum number of clients in the pool
      min: 1, // Minimum number of clients in the pool
      idleTimeoutMillis: idleTimeout, // Close idle clients after 30 seconds
      connectionTimeoutMillis: connectionTimeout, // Return an error after 10 seconds if connection cannot be established
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    })

    // Handle pool errors
    newPool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err)
      // Reset pool on error to force reconnection
      pool = null
    })

    // Test the connection
    const client = await newPool.connect()
    client.release()

    console.log('Database connection pool initialized successfully')
    return newPool
  } catch (error) {
    console.error('Failed to initialize database connection pool:', error)
    pool = null
    throw error
  }
}

/**
 * Execute a query using the connection pool
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const poolInstance = await getPool()
  return poolInstance.query(text, params)
}

/**
 * Close the connection pool (for cleanup/testing)
 * @returns {Promise<void>}
 */
async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    console.log('Database connection pool closed')
  }
}

module.exports = {
  getPool,
  query,
  closePool
}

