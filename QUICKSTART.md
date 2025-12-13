# Quick Start Guide

Get your Code-to-Image Lambda API running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd code-to-image-lambda
npm install
```

## Step 2: Set API Token

```bash
# Generate a secure token
openssl rand -base64 32

# Set it as environment variable
export API_TOKENS="paste-the-token-here"
```

## Step 3: Test Locally (Optional)

```bash
# Start local server
npm run local

# In another terminal, test it
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello World\")",
    "token": "paste-the-token-here",
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
# Replace YOUR_ENDPOINT and YOUR_TOKEN with actual values
curl -X POST https://YOUR_ENDPOINT/generate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function greet(name) {\n  return `Hello, ${name}!`\n}\n\nconsole.log(greet(\"World\"))",
    "token": "YOUR_TOKEN",
    "language": "javascript",
    "theme": "github-dark",
    "format": "png"
  }' > greeting.png
```

## That's It! 🎉

Your API is now live and ready to convert code to images.

## Next Steps

- Read [README.md](README.md) for full documentation
- Try different languages and themes
- Integrate into your application
- Set up monitoring in AWS CloudWatch

## Common Issues

**"command not found: serverless"**
```bash
npm install -g serverless
```

**"Invalid or missing API token"**
```bash
# Make sure you exported the token before deployment
export API_TOKENS="your-token"
npm run deploy:dev
```

**"No credentials found"**
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```
