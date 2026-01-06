# Code to Image Lambda API

A serverless AWS Lambda API that converts code snippets into beautiful, syntax-highlighted images (PNG or SVG).

## Features

- 🎨 **Syntax Highlighting** - 18+ languages using Shiki (VS Code quality)
- 🖼️ **Dual Format** - SVG (fast, default) or PNG (high quality, 2x retina)
- 🎭 **8 Themes** - GitHub Dark/Light, Dracula, Monokai, Nord, and more
- ⚡ **Fast** - SVG in <500ms, PNG in 1.5-2.5s (warm)
- 💰 **Cost Effective** - ~$0.0001 (SVG) to $0.001 (PNG) per request
- 🔒 **Secure** - API key authentication via JAAS (Java Authentication & Authorization Service)
- 📊 **Quota Management** - Built-in quota tracking and enforcement
- 🌈 **Customizable** - Background, padding, line numbers, window controls

## Prerequisites

- Node.js 18+ or 20+
- AWS Account with CLI configured
- Serverless Framework: `npm install -g serverless`

## Installation

```bash
# Clone or navigate to project directory
cd code-to-image-lambda

# Install dependencies
npm install

# Configure JAAS service URL (required)
export JAAS_BASE_URL="https://jaas.example.com/api"
# export JAAS_BASE_URL="http://localhost:8080/api"

# Optional: Configure product name (default: codetoimage)
export JAAS_PRODUCT_NAME="codetoimage"

# Optional: Configure timeout (default: 5000ms)
export JAAS_TIMEOUT="5000"
```

## Local Development

```bash
# Start local server on http://localhost:3000
npm run local

# In another terminal, test with curl
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "code": "console.log(\"Hello World\")",
    "format": "svg"
  }' > code.svg
```

## Deployment

### 1. Configure AWS Credentials

```bash
# Configure AWS CLI (if not already done)
aws configure
```

### 2. Deploy to AWS

```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Or specify region
serverless deploy --region us-west-2
```

### 3. Note the Endpoint

After deployment, you'll see output like:

```
endpoints:
  POST - https://abc123def.execute-api.us-east-1.amazonaws.com/dev/generate
```

## API Usage

### Request

**Endpoint:** `POST /generate`

**Headers:**
```
Content-Type: application/json
X-API-Key: your-api-key-here
```

**Alternative Header (Bearer Token):**
```
Authorization: Bearer your-api-key-here
```

**Body:**
```json
{
  "code": "function hello() { console.log('Hello'); }",
  "language": "javascript",
  "theme": "github-dark",
  "format": "svg",
  "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "padding": 64,
  "showLineNumbers": true,
  "showWindowControls": true
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `code` | string | ✅ Yes | - | The code to syntax highlight |
| `language` | string | No | `javascript` | Programming language (see supported languages below) |
| `theme` | string | No | `github-dark` | Color theme (see supported themes below) |
| `format` | string | No | `svg` | Output format: `svg` or `png` |
| `background` | string | No | Purple gradient | CSS background (gradient or color) |
| `padding` | number | No | `64` | Padding in pixels (16-128 recommended) |
| `showLineNumbers` | boolean | No | `true` | Show line numbers |
| `showWindowControls` | boolean | No | `true` | Show macOS-style window dots |

**Authentication:**

API keys are validated via JAAS (Java Authentication & Authorization Service). Provide your API key using one of these methods:
- **X-API-Key header** (recommended): `X-API-Key: your-api-key-here`
- **Authorization Bearer**: `Authorization: Bearer your-api-key-here`

### Response

**Success (200):**
- **Content-Type:** `image/svg+xml` or `image/png`
- **Body:** Binary image data (SVG string or base64-encoded PNG)
- **Headers:**
  - `X-RateLimit-Remaining`: Remaining quota for the API key

**Error (401):**
```json
{
  "error": "Invalid API key"
}
```

**Error (429):**
```json
{
  "error": "Monthly quota exceeded. Please upgrade your plan or wait for quota reset."
}
```

**Error (400):**
```json
{
  "error": "Missing required field: code"
}
```

**Error (503):**
```json
{
  "error": "Authentication service temporarily unavailable",
  "message": "Please try again later."
}
```

## Examples

### 1. Simple SVG (JavaScript)

```bash
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "code": "const greeting = \"Hello, World!\"\nconsole.log(greeting)"
  }' > hello.svg
```

### 2. PNG with Python

```bash
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "language": "python",
    "theme": "dracula",
    "format": "png"
  }' > fibonacci.png
```

### 3. Go Code with Custom Styling

```bash
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "code": "package main\n\nfunc main() {\n    println(\"Hello, Go!\")\n}",
    "language": "go",
    "theme": "nord",
    "background": "#1a1a2e",
    "padding": 80,
    "showLineNumbers": false
  }' > hello.svg
```

### 4. Using JavaScript Fetch API

```javascript
const response = await fetch('https://your-api-url/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    code: 'function add(a, b) { return a + b; }',
    language: 'javascript',
    format: 'png'
  })
})

// Check for errors
if (!response.ok) {
  const error = await response.json()
  if (response.status === 429) {
    console.error('Quota exceeded:', error.error)
  } else if (response.status === 401) {
    console.error('Invalid API key')
  }
  throw new Error(error.error || 'Request failed')
}

const imageBlob = await response.blob()
const imageUrl = URL.createObjectURL(imageBlob)

// Get remaining quota from headers
const remainingQuota = response.headers.get('X-RateLimit-Remaining')
console.log('Remaining quota:', remainingQuota)

// Use imageUrl in <img> tag
document.getElementById('code-img').src = imageUrl
```

## Supported Languages

- JavaScript (`javascript`, `js`)
- TypeScript (`typescript`, `ts`)
- Python (`python`, `py`)
- Java (`java`)
- C (`c`)
- C++ (`cpp`, `c++`)
- C# (`csharp`, `cs`)
- Go (`go`)
- Rust (`rust`, `rs`)
- Ruby (`ruby`, `rb`)
- PHP (`php`)
- HTML (`html`)
- CSS (`css`)
- JSON (`json`)
- YAML (`yaml`, `yml`)
- Markdown (`markdown`, `md`)
- SQL (`sql`)
- Bash/Shell (`bash`, `sh`, `shell`)

## Supported Themes

- `github-dark` (default)
- `github-light`
- `dracula`
- `monokai`
- `nord`
- `one-dark-pro`
- `tokyo-night`
- `catppuccin-mocha`

## Performance

| Metric | SVG | PNG |
|--------|-----|-----|
| Cold start | 2-3s | 4-6s |
| Warm request | 200-500ms | 1.5-2.5s |
| Cost (per request) | ~$0.0001 | ~$0.001 |
| Memory usage | 512MB | 2GB |

## Monitoring

### View Logs

```bash
# Tail logs in real-time
npm run logs

# Or using serverless directly
serverless logs -f generateImage -t
```

### Check Deployment Info

```bash
serverless info
```

## Cleanup

To remove all AWS resources:

```bash
npm run remove
# Or: serverless remove
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JAAS_BASE_URL` | ✅ Yes | - | Base URL of JAAS service (e.g., `https://jaas.example.com/api`) |
| `JAAS_PRODUCT_NAME` | No | `codetoimage` | Product name configured in JAAS |
| `JAAS_TIMEOUT` | No | `5000` | Request timeout in milliseconds |

### Setting Environment Variables

**For Local Development:**
```bash
export JAAS_BASE_URL="http://localhost:8080/api"
export JAAS_PRODUCT_NAME="codetoimage"
```

**For Deployment:**
```bash
# Set before deploying
export JAAS_BASE_URL="https://jaas.example.com/api"
serverless deploy --stage prod
```

Or add to `.env` file (with serverless-dotenv-plugin):
```env
JAAS_BASE_URL=https://jaas.example.com/api
JAAS_PRODUCT_NAME=codetoimage
JAAS_TIMEOUT=5000
```

## Troubleshooting

### "API key is required"

Make sure you're providing the API key via header:
- `X-API-Key: your-api-key-here` (recommended)
- `Authorization: Bearer your-api-key-here`

### "Invalid API key"

- Verify your API key is correct
- Check that the API key is active in JAAS
- Ensure the API key has access to the `codetoimage` product

### "Monthly quota exceeded"

Your API key has reached its monthly quota limit. Options:
- Upgrade your subscription plan
- Wait for the monthly quota reset
- Contact support to add more quota

### "Authentication service temporarily unavailable"

- Check that `JAAS_BASE_URL` is correctly configured
- Verify JAAS service is running and accessible
- Check network connectivity from Lambda to JAAS
- Review Lambda CloudWatch logs for detailed error messages

### "Syntax highlighting failed"

Check that the `language` parameter is valid. See supported languages above.

### PNG takes too long / times out

- Cold starts can take 4-6 seconds for PNG generation
- Consider using SVG format (much faster)
- Increase Lambda timeout if needed in `serverless.yml`

### "Could not find .code-window element"

This is an internal error. Check Lambda logs for details:

```bash
npm run logs
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /generate
       │ X-API-Key: ...
       │ {code, ...}
       ▼
┌─────────────────────┐
│  API Gateway        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Lambda (Node.js 20)            │
│  ┌──────────────────────────┐   │
│  │ 1. Extract API key      │   │
│  │ 2. Validate via JAAS     │───┼──▶ JAAS Service
│  │ 3. Check quota          │   │   (Authentication)
│  │ 4. Shiki highlighting   │   │
│  │ 5. Build HTML template   │   │
│  │ 6a. SVG (string wrap)    │   │
│  │ 6b. PNG (Puppeteer)      │   │
│  └──────────────────────────┘   │
│  + Chromium Lambda Layer         │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────┐
│  Image Data  │
│  (SVG/PNG)   │
└──────────────┘
```

## Cost Estimation

Based on AWS Lambda pricing (us-east-1):

**SVG Generation:**
- Memory: 512MB
- Duration: ~0.5s
- Cost: $0.0001 per request
- **10,000 requests/month: ~$1**

**PNG Generation:**
- Memory: 2048MB (2GB)
- Duration: ~2s
- Cost: $0.001 per request
- **10,000 requests/month: ~$10**

*Free tier: 1M free requests + 400,000 GB-seconds per month*

## Security Best Practices

1. **Rotate tokens regularly** - Update `API_TOKENS` environment variable
2. **Use HTTPS only** - API Gateway enforces this by default
3. **Monitor usage** - Set CloudWatch alarms for unusual activity
4. **Limit token distribution** - Only share tokens with authorized users
5. **Enable WAF** (optional) - Add AWS WAF for DDoS protection

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review AWS Lambda CloudWatch logs
3. Open an issue in the repository
