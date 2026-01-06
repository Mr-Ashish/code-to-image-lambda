/**
 * AWS Lambda Handler for Code-to-Image API
 * Converts code snippets into beautiful syntax-highlighted images
 */

const { buildHtmlTemplate } = require('./htmlTemplate');
const { generateSVG } = require('./svgGenerator');
const { generatePNG } = require('./imageGenerator');
const { validateApiKey } = require('./auth/jaasClient');

// Lazy load shiki (ES module) - cache for warm Lambda invocations
let shikiModule = null;
async function getShiki() {
  if (!shikiModule) {
    shikiModule = await import('shiki');
  }
  return shikiModule;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  try {
    // Parse request body
    let body;
    try {
      body =
        typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Extract API key from headers (standard practice: X-API-Key or Authorization Bearer)
    const apiKey =
      event.headers['x-api-key'] ||
      event.headers['X-API-Key'] ||
      (event.headers['authorization'] || event.headers['Authorization'] || '')
        .replace(/^Bearer\s+/i, '')
        .trim();

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'API key is required',
          message: 'Please provide your API key via X-API-Key header or Authorization Bearer token',
        }),
      };
    }

    // Extract client IP for logging (if available)
    const clientIp =
      event.requestContext?.identity?.sourceIp ||
      event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      event.headers['X-Forwarded-For']?.split(',')[0]?.trim() ||
      null;

    // Validate API key with JAAS
    let authResult;
    try {
      authResult = await validateApiKey(apiKey, clientIp);
    } catch (error) {
      console.error('API key validation error:', error);
      return {
        statusCode: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Authentication service temporarily unavailable',
          message: 'Please try again later.',
        }),
      };
    }

    if (!authResult.valid) {
      const statusCode = authResult.statusCode || 401;
      return {
        statusCode: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: authResult.error || 'Invalid API key',
          ...(authResult.remainingQuota !== undefined && {
            remainingQuota: authResult.remainingQuota,
          }),
        }),
      };
    }

    // Extract parameters from body
    const {
      code,
      language = 'javascript',
      theme = 'github-dark',
      format = 'svg',
      background,
      padding,
      showLineNumbers,
      showWindowControls,
    } = body;

    // Validate required fields
    if (!code) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing required field: code' }),
      };
    }

    // Validate format
    if (format !== 'svg' && format !== 'png') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid format. Must be "svg" or "png"',
        }),
      };
    }

    console.log(
      `Processing ${format.toUpperCase()} request for ${language} code (${
        code.length
      } chars)`
    );

    // Step 1: Syntax highlight with Shiki
    let highlightedCode;
    try {
      const shiki = await getShiki();
      highlightedCode = await shiki.codeToHtml(code, {
        lang: language,
        theme: theme,
      });
    } catch (error) {
      console.error('Shiki highlighting error:', error);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error:
            'Syntax highlighting failed. Check language and theme parameters.',
          details: error.message,
        }),
      };
    }

    // Step 2: Build HTML template
    const html = buildHtmlTemplate(highlightedCode, {
      background,
      padding,
      showLineNumbers,
      showWindowControls,
    });

    // Step 3: Generate image based on format
    let imageData, contentType;

    if (format === 'png') {
      // Generate PNG using Puppeteer
      console.log('Generating PNG with Puppeteer...');
      imageData = await generatePNG(html);
      contentType = 'image/png';
    } else {
      // Generate SVG (fast, no browser needed)
      console.log('Generating SVG...');
      imageData = generateSVG(html);
      contentType = 'image/svg+xml';
    }

    // Step 4: Return binary response with quota information in headers
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    // Add quota information to response headers (if available)
    if (authResult.remainingQuota !== undefined) {
      headers['X-RateLimit-Remaining'] = String(authResult.remainingQuota);
    }

    return {
      statusCode: 200,
      headers: headers,
      body:
        format === 'png'
          ? imageData.toString('base64') // PNG as base64 for API Gateway
          : imageData, // SVG as string
      isBase64Encoded: format === 'png',
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
