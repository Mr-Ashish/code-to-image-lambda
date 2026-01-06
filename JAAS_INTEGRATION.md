# JAAS Integration Guide

This document explains how the Lambda function integrates with JAAS (Java Authentication & Authorization Service) for API key authentication and quota management.

## Overview

The Lambda function now uses JAAS for:
- ✅ API key validation
- ✅ Quota management (monthly limits)
- ✅ Usage tracking
- ✅ Rate limiting

## Prerequisites

1. **JAAS Service Running**: JAAS must be deployed and accessible
2. **Product Created**: A product named `codetoimage` (or your custom name) must exist in JAAS
3. **API Keys Created**: Users must have API keys created in JAAS with access to the product

## Setup Steps

### 1. Create Product in JAAS

First, ensure the product exists in JAAS:

```bash
curl -X POST http://localhost:8080/api/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "codetoimage",
    "description": "Code to Image API Service"
  }'
```

### 2. Create User and API Key

When a user subscribes to your service:

```bash
# Create user
curl -X POST http://localhost:8080/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "fullName": "John Doe"
  }'

# Create API key with quota
curl -X POST http://localhost:8080/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "name": "Production API Key",
    "products": [
      {
        "productId": 1,
        "monthlyQuota": 10000
      }
    ]
  }'
```

**Important**: Save the API key returned - it's only shown once!

### 3. Configure Lambda Environment Variables

Set the JAAS base URL before deploying:

```bash
export JAAS_BASE_URL="https://jaas.example.com/api"
export JAAS_PRODUCT_NAME="codetoimage"
export JAAS_TIMEOUT="5000"

serverless deploy --stage prod
```

Or add to `.env` file:
```env
JAAS_BASE_URL=https://jaas.example.com/api
JAAS_PRODUCT_NAME=codetoimage
JAAS_TIMEOUT=5000
```

## How It Works

### Request Flow

```
1. Client sends request with X-API-Key header
   ↓
2. Lambda extracts API key from header
   ↓
3. Lambda calls JAAS /api/validate endpoint
   ↓
4. JAAS validates API key and checks quota
   ↓
5. If valid: JAAS consumes quota and returns success
   ↓
6. Lambda generates image and returns it
```

### Authentication

The Lambda accepts API keys via:
- **X-API-Key header** (recommended): `X-API-Key: jaas_xxxxx`
- **Authorization Bearer**: `Authorization: Bearer jaas_xxxxx`

### Quota Consumption

- Quota is consumed **on every image generation** (both SVG and PNG)
- Quota is consumed **before** image generation (when JAAS validates)
- If image generation fails after validation, quota is still consumed (standard practice)

### Error Handling

| Status Code | Meaning | Response |
|------------|---------|----------|
| 401 | Invalid API key | `{"error": "Invalid API key"}` |
| 429 | Quota exceeded | `{"error": "Monthly quota exceeded..."}` |
| 503 | JAAS unavailable | `{"error": "Authentication service temporarily unavailable"}` |

## Testing

### Test with Valid API Key

```bash
curl -X POST https://your-lambda-url/generate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: jaas_your_api_key_here" \
  -d '{
    "code": "console.log(\"Hello\")",
    "format": "svg"
  }' > output.svg
```

### Test Quota Exceeded

When quota is exceeded, you'll get:
```json
{
  "error": "Monthly quota exceeded. Please upgrade your plan or wait for quota reset."
}
```

### Test Invalid Key

```json
{
  "error": "Invalid API key"
}
```

## Monitoring

### Check Remaining Quota

Query JAAS directly:
```bash
curl "http://localhost:8080/api/validate/quota?apiKey=jaas_xxxxx&productName=codetoimage"
```

### View Usage Logs

Check JAAS usage logs for detailed API call tracking.

## Troubleshooting

### "Authentication service configuration error"

- Check `JAAS_BASE_URL` is set correctly
- Verify the URL is accessible from Lambda

### "Authentication service unavailable"

- Check JAAS service is running
- Verify network connectivity
- Check JAAS logs for errors

### "Invalid API key"

- Verify API key is correct
- Check API key is active in JAAS
- Ensure API key has access to `codetoimage` product

### Quota Issues

- Check quota in JAAS: `GET /api/admin/api-keys/{id}`
- Add quota: `PUT /api/admin/api-keys/{id}/add-quota`
- Check if quota reset date has passed

## Integration with Next.js App

The `codetoimage` Next.js app can use the same API keys. When a user creates an API key in the Next.js dashboard, it should also be created in JAAS with the same quota limits.

## Security Best Practices

1. **HTTPS Only**: Always use HTTPS for JAAS in production
2. **API Key Storage**: API keys are hashed in JAAS (BCrypt)
3. **Rate Limiting**: JAAS handles rate limiting per IP
4. **Error Messages**: Generic messages prevent information leakage
5. **Quota Tracking**: All usage is logged in JAAS for audit

## Migration from Token-Based Auth

If you were using the old token-based authentication:

1. ✅ Old token verification code is removed
2. ✅ PostgreSQL dependencies are no longer needed
3. ✅ All authentication now goes through JAAS
4. ✅ Update all clients to use `X-API-Key` header instead of `token` in body

## Support

For issues:
1. Check Lambda CloudWatch logs
2. Check JAAS service logs
3. Verify JAAS service is accessible
4. Review API key status in JAAS admin panel

