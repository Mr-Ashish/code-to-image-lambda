/**
 * AWS Lambda Handler for Code-to-Image API
 * Converts code snippets into beautiful syntax-highlighted images
 */

const { buildHtmlTemplate } = require('./htmlTemplate');
const { generateSVG } = require('./svgGenerator');
const { generatePNG } = require('./imageGenerator');
const { verifyToken } = require('./db/tokenVerifier');

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

    // Extract parameters
    const {
      code,
      token,
      language = 'javascript',
      theme = 'github-dark',
      format = 'svg',
      background,
      padding,
      showLineNumbers,
      showWindowControls,
    } = body;

    // Validate token
    if (!token) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing API token' }),
      };
    }

    // Verify token against database
    let tokenVerification;
    try {
      tokenVerification = await verifyToken(token);
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        statusCode: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Service temporarily unavailable',
          message: 'Unable to verify token. Please try again later.',
        }),
      };
    }

    if (!tokenVerification.isValid) {
      const errorMessage =
        tokenVerification.error || 'Invalid or missing API token';
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: errorMessage }),
      };
    }

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

    // Step 4: Return binary response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
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
