/**
 * Token Verification Module
 * Verifies API tokens against PostgreSQL database with in-memory caching
 */

const { query } = require('./connectionPool');

// Module-level cache (persists across warm Lambda invocations)
const tokenCache = new Map();

// Cache TTL in milliseconds (default: 5 minutes)
const CACHE_TTL = parseInt(process.env.TOKEN_CACHE_TTL || '300', 10) * 1000;

/**
 * Cache entry structure:
 * {
 *   result: { isValid: boolean, userId: string, expiresAt: Date, isActive: boolean },
 *   cachedAt: number (timestamp)
 * }
 */

/**
 * Verify an API token
 * @param {string} token - The API token to verify
 * @returns {Promise<Object>} Verification result: { isValid: boolean, userId: string | null, error?: string }
 */
async function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      userId: null,
      error: 'Token is required',
    };
  }

  // Check cache first
  const cached = tokenCache.get(token);
  if (cached) {
    const now = Date.now();
    const cacheAge = now - cached.cachedAt;

    // Check if cache entry is still valid (not expired)
    if (cacheAge < CACHE_TTL) {
      // Validate cached token hasn't expired
      if (cached.result.isValid && cached.result.expiresAt) {
        const tokenExpired = new Date(cached.result.expiresAt) < new Date();
        if (tokenExpired) {
          // Token expired, remove from cache and query DB
          tokenCache.delete(token);
        } else {
          // Cache hit - return cached result
          return cached.result;
        }
      } else {
        // Cache hit for invalid token (don't re-query invalid tokens)
        return cached.result;
      }
    } else {
      // Cache expired, remove it
      tokenCache.delete(token);
    }
  }

  // Cache miss or expired - query database
  try {
    const result = await queryDatabase(token);

    // Only cache valid tokens (to avoid caching invalid tokens indefinitely)
    if (result.isValid) {
      tokenCache.set(token, {
        result,
        cachedAt: Date.now(),
      });
    }

    return result;
  } catch (error) {
    console.error('Error verifying token:', error);
    // Don't cache errors - return error result
    return {
      isValid: false,
      userId: null,
      error: 'Token verification failed',
    };
  }
}

/**
 * Query database for token verification
 * @param {string} token - The API token to verify
 * @returns {Promise<Object>} Verification result
 */
async function queryDatabase(token) {
  try {
    // Query tokens table
    // IMPORTANT: Adjust this query to match your actual database schema
    // Expected table structure:
    //   - Table name: api_tokens (or your table name)
    //   - Columns: token (or token_hash), user_id, expires_at, is_active, created_at
    // If your table/columns differ, update the query below accordingly
    const result = await query(
      `SELECT 
        user_id,
        expires_at,
        is_active,
        created_at
      FROM api_tokens
      WHERE token = $1 OR token_hash = $1
      LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) {
      return {
        isValid: false,
        userId: null,
        error: 'Token not found',
      };
    }

    const tokenRecord = result.rows[0];
    const now = new Date();

    // Check if token is active
    if (tokenRecord.is_active === false) {
      return {
        isValid: false,
        userId: tokenRecord.user_id,
        error: 'Token is inactive',
      };
    }

    // Check if token has expired
    if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < now) {
      return {
        isValid: false,
        userId: tokenRecord.user_id,
        error: 'Token has expired',
        expiresAt: tokenRecord.expires_at,
      };
    }

    // Token is valid
    return {
      isValid: true,
      userId: tokenRecord.user_id,
      expiresAt: tokenRecord.expires_at,
      isActive: tokenRecord.is_active,
      createdAt: tokenRecord.created_at,
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Clear the token cache (useful for testing or forced refresh)
 */
function clearCache() {
  tokenCache.clear();
}

/**
 * Get cache statistics (useful for monitoring)
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
  return {
    size: tokenCache.size,
    ttl: CACHE_TTL,
  };
}

module.exports = {
  verifyToken,
  clearCache,
  getCacheStats,
};
