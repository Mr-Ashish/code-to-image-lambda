# Quick Start Guide

Get your Code-to-Image Lambda API running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd code-to-image-lambda
npm install
```

## Step 2: Configure JAAS Service

```bash
# Set JAAS service URL (required)
export JAAS_BASE_URL="https://jaas.example.com/api"

# Optional: Set product name (default: codetoimage)
export JAAS_PRODUCT_NAME="codetoimage"
```

**Note**: Make sure JAAS service is running and the `codetoimage` product exists. See [JAAS_INTEGRATION.md](JAAS_INTEGRATION.md) for details.

## Step 3: Test Locally (Optional)

```bash
# Start local server
npm run local

# In another terminal, test it (replace with your actual API key from JAAS)
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-from-jaas" \
  -d '{
    "code": "console.log(\"Hello World\")",
    "format": "svg"
  }' > test.svg

# Open test.svg in browser to verify
```

## Step 4: Deploy to AWS

```bash
# Make sure AWS CLI is configured
aws configure

# Deploy (takes 2-3 minutes)
npm run deploy:dev

# Save the endpoint URL from output
# Example: https://abc123.execute-api.us-east-1.amazonaws.com/dev/generate
```

## Step 5: Test Production Endpoint

```bash
# Replace YOUR_ENDPOINT and YOUR_API_KEY with actual values
curl -X POST https://YOUR_ENDPOINT/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "code": "function greet(name) {\n  return `Hello, ${name}!`\n}\n\nconsole.log(greet(\"World\"))",
    "language": "javascript",
    "theme": "github-dark",
    "format": "png"
  }' > greeting.png
```

## That's It! 🎉

Your API is now live and ready to convert code to images.

## Next Steps

- Read [README.md](README.md) for full documentation
- Read [JAAS_INTEGRATION.md](JAAS_INTEGRATION.md) for JAAS setup
- Try different languages and themes
- Integrate into your application
- Set up monitoring in AWS CloudWatch

## Common Issues

**"command not found: serverless"**
```bash
npm install -g serverless
```

**"API key is required"**
```bash
# Make sure you're providing the API key via header
# Use: -H "X-API-Key: your-api-key"
# Or: -H "Authorization: Bearer your-api-key"
```

**"Authentication service configuration error"**
```bash
# Make sure JAAS_BASE_URL is set
export JAAS_BASE_URL="https://jaas.example.com/api"
npm run deploy:dev
```

**"Authentication service unavailable"**
- Check JAAS service is running
- Verify JAAS_BASE_URL is correct
- Check network connectivity from Lambda to JAAS

**"No credentials found"**
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```
