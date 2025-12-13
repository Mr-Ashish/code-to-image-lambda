# Code to Image Lambda API

A serverless AWS Lambda API that converts code snippets into beautiful, syntax-highlighted images (PNG or SVG).

## Features

- 🎨 **Syntax Highlighting** - 18+ languages using Shiki (VS Code quality)
- 🖼️ **Dual Format** - SVG (fast, default) or PNG (high quality, 2x retina)
- 🎭 **8 Themes** - GitHub Dark/Light, Dracula, Monokai, Nord, and more
- ⚡ **Fast** - SVG in <500ms, PNG in 1.5-2.5s (warm)
- 💰 **Cost Effective** - ~$0.0001 (SVG) to $0.001 (PNG) per request
- 🔒 **Secure** - Token-based authentication
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

# Set your API tokens (comma-separated for multiple tokens)
export API_TOKENS="your-secret-token-1,your-secret-token-2"
```

## Local Development

```bash
# Start local server on http://localhost:3000
npm run local

# In another terminal, test with curl
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello World\")",
    "token": "your-secret-token-1",
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
```

**Body:**
```json
{
  "code": "function hello() { console.log('Hello'); }",
  "token": "your-api-token",
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
| `token` | string | ✅ Yes | - | Your API authentication token |
| `language` | string | No | `javascript` | Programming language (see supported languages below) |
| `theme` | string | No | `github-dark` | Color theme (see supported themes below) |
| `format` | string | No | `svg` | Output format: `svg` or `png` |
| `background` | string | No | Purple gradient | CSS background (gradient or color) |
| `padding` | number | No | `64` | Padding in pixels (16-128 recommended) |
| `showLineNumbers` | boolean | No | `true` | Show line numbers |
| `showWindowControls` | boolean | No | `true` | Show macOS-style window dots |

### Response

**Success (200):**
- **Content-Type:** `image/svg+xml` or `image/png`
- **Body:** Binary image data (SVG string or base64-encoded PNG)

**Error (401):**
```json
{
  "error": "Invalid or missing API token"
}
```

**Error (400):**
```json
{
  "error": "Missing required field: code"
}
```

## Examples

### 1. Simple SVG (JavaScript)

```bash
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const greeting = \"Hello, World!\"\nconsole.log(greeting)",
    "token": "your-token"
  }' > hello.svg
```

### 2. PNG with Python

```bash
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "token": "your-token",
    "language": "python",
    "theme": "dracula",
    "format": "png"
  }' > fibonacci.png
```

### 3. Go Code with Custom Styling

```bash
curl -X POST https://your-api-url/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "package main\n\nfunc main() {\n    println(\"Hello, Go!\")\n}",
    "token": "your-token",
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
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: 'function add(a, b) { return a + b; }',
    token: 'your-token',
    language: 'javascript',
    format: 'png'
  })
})

const imageBlob = await response.blob()
const imageUrl = URL.createObjectURL(imageBlob)

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

## Troubleshooting

### "Invalid or missing API token"

Make sure you've set the `API_TOKENS` environment variable before deployment:

```bash
export API_TOKENS="token1,token2"
serverless deploy
```

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
       │ {code, token, ...}
       ▼
┌─────────────────────┐
│  API Gateway        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Lambda (Node.js 20)            │
│  ┌──────────────────────────┐   │
│  │ 1. Validate token        │   │
│  │ 2. Shiki highlighting    │   │
│  │ 3. Build HTML template   │   │
│  │ 4a. SVG (string wrap)    │   │
│  │ 4b. PNG (Puppeteer)      │   │
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
