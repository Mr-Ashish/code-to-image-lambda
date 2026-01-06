/**
 * JAAS (Java Authentication & Authorization Service) Client
 * Handles API key validation and quota management via JAAS service
 */

const https = require('https');
const http = require('http');

// JAAS service configuration
const JAAS_BASE_URL = process.env.JAAS_BASE_URL || '';
const JAAS_PRODUCT_NAME = process.env.JAAS_PRODUCT_NAME || 'codetoimage';
const JAAS_TIMEOUT = parseInt(process.env.JAAS_TIMEOUT || '5000', 10); // 5 seconds default

/**
 * Validate API key with JAAS service
 * @param {string} apiKey - The API key to validate
 * @param {string} clientIp - Client IP address (optional, for logging)
 * @returns {Promise<Object>} Validation result
 *   { valid: boolean, apiKeyId?: number, remainingQuota?: number, error?: string, statusCode?: number }
 */
async function validateApiKey(apiKey, clientIp = null) {
  if (!JAAS_BASE_URL) {
    console.error('JAAS_BASE_URL environment variable is not set');
    return {
      valid: false,
      error: 'Authentication service configuration error',
      statusCode: 503,
    };
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return {
      valid: false,
      error: 'API key is required',
      statusCode: 401,
    };
  }

  console.log('Validating API key with JAAS:', {
    baseUrl: JAAS_BASE_URL,
    productName: JAAS_PRODUCT_NAME,
    apiKeyPrefix: apiKey.substring(0, 10) + '...',
  });

  let url;
  try {
    url = new URL(`${JAAS_BASE_URL}/validate`);
  } catch (urlError) {
    console.error('Invalid JAAS_BASE_URL:', JAAS_BASE_URL, urlError);
    return {
      valid: false,
      error: 'Invalid authentication service URL configuration',
      statusCode: 503,
    };
  }
  const requestBody = JSON.stringify({
    apiKey: apiKey,
    productName: JAAS_PRODUCT_NAME,
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    },
    timeout: JAAS_TIMEOUT,
  };

  // Use https if URL is https, otherwise http
  const client = url.protocol === 'https:' ? https : http;

  try {
    const response = await makeRequest(client, url, options, requestBody);

    // Log response for debugging
    console.log('JAAS Response Status:', response.statusCode);
    console.log('JAAS Response Body Length:', response.body?.length || 0);
    console.log('JAAS Response Body Preview:', response.body?.substring(0, 200) || '(empty)');

    // Check if response body is empty
    if (!response.body || response.body.trim().length === 0) {
      console.error('JAAS returned empty response body');
      return {
        valid: false,
        error: 'Authentication service returned empty response',
        statusCode: 503,
      };
    }

    // Parse response
    let responseData;
    try {
      responseData = JSON.parse(response.body);
    } catch (parseError) {
      console.error('Failed to parse JAAS response:', parseError);
      console.error('Response body that failed to parse:', response.body);
      return {
        valid: false,
        error: 'Invalid response from authentication service',
        statusCode: 503,
      };
    }

    // Handle different status codes
    if (response.statusCode === 200 && responseData.valid === true) {
      // Valid API key with quota
      return {
        valid: true,
        apiKeyId: responseData.apiKeyId,
        remainingQuota: responseData.remainingQuota,
        productName: responseData.productName,
      };
    } else if (response.statusCode === 401) {
      // Invalid API key or quota exceeded
      const errorMessage = responseData.error || 'Invalid API key';
      
      // Check if it's a quota error (for better UX)
      if (errorMessage.toLowerCase().includes('quota')) {
        return {
          valid: false,
          error: 'Monthly quota exceeded. Please upgrade your plan or wait for quota reset.',
          statusCode: 429, // Too Many Requests (standard for quota exceeded)
          quotaExceeded: true,
        };
      }

      // Generic invalid key error (don't reveal if key exists)
      return {
        valid: false,
        error: 'Invalid API key',
        statusCode: 401,
      };
    } else if (response.statusCode === 429) {
      // Rate limit exceeded (from JAAS)
      return {
        valid: false,
        error: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
      };
    } else {
      // Other errors (500, 503, etc.)
      console.error(`JAAS returned status ${response.statusCode}:`, responseData);
      return {
        valid: false,
        error: 'Authentication service temporarily unavailable',
        statusCode: 503,
      };
    }
  } catch (error) {
    console.error('JAAS validation error:', error);

    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        valid: false,
        error: 'Authentication service timeout. Please try again later.',
        statusCode: 503,
      };
    }

    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        valid: false,
        error: 'Authentication service unavailable',
        statusCode: 503,
      };
    }

    // Generic error
    return {
      valid: false,
      error: 'Authentication service error',
      statusCode: 503,
    };
  }
}

/**
 * Make HTTP/HTTPS request (promise-based)
 * @param {Object} client - http or https module
 * @param {URL} url - Request URL
 * @param {Object} options - Request options
 * @param {string} body - Request body
 * @returns {Promise<Object>} Response with statusCode and body
 */
function makeRequest(client, url, options, body) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      ...options,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
    };

    console.log('Making request to JAAS:', {
      method: requestOptions.method,
      hostname: requestOptions.hostname,
      port: requestOptions.port,
      path: requestOptions.path,
    });

    const req = client.request(requestOptions, (res) => {
      let responseBody = '';

      // Handle response errors
      res.on('error', (error) => {
        console.error('JAAS response stream error:', error);
        reject(error);
      });

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        console.log('JAAS response received:', {
          statusCode: res.statusCode,
          headers: res.headers,
          bodyLength: responseBody.length,
          bodyPreview: responseBody.substring(0, 100),
        });
        resolve({
          statusCode: res.statusCode,
          body: responseBody,
          headers: res.headers,
        });
      });
    });

    req.on('error', (error) => {
      console.error('JAAS request error:', {
        code: error.code,
        message: error.message,
        syscall: error.syscall,
        address: error.address,
        port: error.port,
      });
      reject(error);
    });

    // Set timeout on the request socket
    req.setTimeout(options.timeout || JAAS_TIMEOUT, () => {
      console.error('JAAS request timeout after', options.timeout || JAAS_TIMEOUT, 'ms');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Write request body
    if (body) {
      req.write(body);
    }

    req.end();
  });
}

module.exports = {
  validateApiKey,
};

