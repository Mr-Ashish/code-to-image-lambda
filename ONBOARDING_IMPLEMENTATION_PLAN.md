# API Key Onboarding & Management Implementation Plan

## Overview

This plan implements the API key onboarding and management endpoints described in `Mods.md` without affecting the existing `/generate` endpoint functionality. The system will add user onboarding, API key rotation, and key management capabilities.

## Current State Analysis

### Existing Functionality (Preserved)

- **POST /generate** - Image generation endpoint (unchanged)
- Uses JAAS (Just Another Auth Service) for API key validation
- Existing authentication flow remains intact

### New Functionality to Add

1. **POST /onboard** - User onboarding with email
2. **POST /request-key-rotation** - Request key rotation via email
3. **POST /rotate-key** - Rotate API key (protected by verification token)
4. **POST /revoke-key** - Revoke API key (admin endpoint)

## Architecture Decision

Since the current system uses JAAS for authentication, we have two options:

**Option A: JAAS-Native Approach** (Recommended if JAAS supports these operations)

- Integrate with JAAS API for onboarding/rotation
- JAAS handles user management, API key generation, rotation

**Option B: Hybrid Approach** (Recommended if JAAS doesn't support management)

- Use JAAS for validation (existing)
- Build management endpoints that interact with JAAS or manage keys separately
- Store user metadata in DynamoDB for tracking

**Assumption**: We'll implement Option B (Hybrid) to ensure flexibility and independence from JAAS capabilities.

## Implementation Plan

### Phase 1: Infrastructure Setup

#### 1.1 DynamoDB Tables

Create two DynamoDB tables for user and API key metadata:

**Users Table** (`users`)

- `user_id` (PK, String) - UUID
- `email` (String, GSI) - Email address (indexed for lookups)
- `status` (String) - `active` | `suspended`
- `created_at` (String) - ISO timestamp
- `updated_at` (String) - ISO timestamp

**API Keys Table** (`api_keys`)

- `api_key_id` (PK, String) - API Gateway key ID or JAAS key ID
- `user_id` (String, GSI) - Foreign key to users table
- `email` (String, GSI) - Email for quick lookups
- `plan` (String) - `free` | `pro` | `enterprise`
- `revoked` (Boolean) - Whether key is revoked
- `created_at` (String) - ISO timestamp
- `rotated_at` (String) - ISO timestamp (nullable)
- `last_used_at` (String) - ISO timestamp (nullable)

**Verification Tokens Table** (`verification_tokens`)

- `token` (PK, String) - Verification token (UUID)
- `email` (String) - Email address
- `purpose` (String) - `rotation` | `onboarding`
- `expires_at` (String) - ISO timestamp
- `used` (Boolean) - Whether token has been used
- `created_at` (String) - ISO timestamp

#### 1.2 AWS Services Required

- DynamoDB (for metadata storage)
- SES (Simple Email Service) for sending verification emails
- API Gateway (for new endpoints)
- Lambda (for new handlers)

### Phase 2: New Lambda Functions

#### 2.1 Onboarding Handler (`src/handlers/onboard.js`)

**Endpoint**: `POST /onboard`

**Functionality**:

1. Validate email format
2. Check if user already exists
3. Generate API key (via JAAS or API Gateway)
4. Create user record in DynamoDB
5. Create API key metadata record
6. Send welcome email with API key (one-time display)
7. Return API key in response (one-time only)

**Input**:

```json
{
  "email": "user@example.com"
}
```

**Output**:

```json
{
  "apiKey": "sk_live_xxx...",
  "message": "Store this key securely. It will not be shown again.",
  "userId": "uuid-here"
}
```

**Error Cases**:

- Invalid email format (400)
- User already exists (409)
- Email service failure (503)
- API key generation failure (500)

#### 2.2 Request Key Rotation Handler (`src/handlers/requestKeyRotation.js`)

**Endpoint**: `POST /request-key-rotation`

**Functionality**:

1. Validate email format
2. Check if user exists
3. Generate one-time verification token
4. Store token in DynamoDB with expiration (15 minutes)
5. Send email with rotation link/token
6. Return success (don't reveal if email exists)

**Input**:

```json
{
  "email": "user@example.com"
}
```

**Output**:

```json
{
  "message": "If an account exists with this email, a rotation link has been sent."
}
```

**Security**: Always returns same message (don't reveal if email exists)

#### 2.3 Rotate Key Handler (`src/handlers/rotateKey.js`)

**Endpoint**: `POST /rotate-key`

**Functionality**:

1. Validate verification token
2. Check token expiration and usage
3. Find user by email
4. Revoke old API key (mark as revoked in DB, disable in JAAS/API Gateway)
5. Generate new API key
6. Update API key metadata (set rotated_at, create new record)
7. Mark verification token as used
8. Send email with new API key
9. Return new API key (one-time only)

**Input**:

```json
{
  "token": "verification-token-uuid",
  "email": "user@example.com"
}
```

**Output**:

```json
{
  "apiKey": "sk_live_new_xxx...",
  "message": "Your old key has been revoked. Store this new key securely.",
  "revokedAt": "2024-01-01T00:00:00Z"
}
```

**Error Cases**:

- Invalid/expired token (401)
- Token already used (401)
- User not found (404)
- Key rotation failure (500)

#### 2.4 Revoke Key Handler (`src/handlers/revokeKey.js`)

**Endpoint**: `POST /revoke-key` (Admin only)

**Functionality**:

1. Validate admin authentication (API key or JWT)
2. Find API key by key ID or user email
3. Revoke key (disable in JAAS/API Gateway, mark revoked in DB)
4. Update user status if needed
5. Log revocation event
6. Return success

**Input**:

```json
{
  "apiKeyId": "key-id-here",
  "reason": "Abuse detected"
}
```

**Output**:

```json
{
  "message": "API key revoked successfully",
  "revokedAt": "2024-01-01T00:00:00Z"
}
```

**Security**: Requires admin API key or special authentication

### Phase 3: Supporting Modules

#### 3.1 Email Service (`src/utils/emailService.js`)

- Send verification emails
- Send API key emails (secure)
- Use AWS SES or external email service
- Template management

#### 3.2 DynamoDB Client (`src/db/dynamoClient.js`)

- User CRUD operations
- API key metadata operations
- Verification token operations
- Connection pooling/caching

#### 3.3 Token Generator (`src/utils/tokenGenerator.js`)

- Generate verification tokens (UUID)
- Generate API keys (if not using JAAS)
- Secure random generation

#### 3.4 JAAS Integration (`src/auth/jaasManagement.js`)

- Create API keys via JAAS
- Revoke API keys via JAAS
- Rotate keys via JAAS
- (If JAAS doesn't support these, use API Gateway instead)

### Phase 4: Serverless Configuration

#### 4.1 New Lambda Functions in `serverless.yml`

```yaml
functions:
  generateImage:
    # Existing function (unchanged)

  onboard:
    handler: src/handlers/onboard.handler
    events:
      - http:
          path: /onboard
          method: post
          cors: true

  requestKeyRotation:
    handler: src/handlers/requestKeyRotation.handler
    events:
      - http:
          path: /request-key-rotation
          method: post
          cors: true

  rotateKey:
    handler: src/handlers/rotateKey.handler
    events:
      - http:
          path: /rotate-key
          method: post
          cors: true

  revokeKey:
    handler: src/handlers/revokeKey.handler
    events:
      - http:
          path: /revoke-key
          method: post
          cors: true
```

#### 4.2 IAM Permissions

Add permissions for:

- DynamoDB (read/write to tables)
- SES (send emails)
- API Gateway (if managing keys directly)
- CloudWatch Logs (for all functions)

#### 4.3 Environment Variables

```yaml
environment:
  # Existing JAAS config (unchanged)
  JAAS_BASE_URL: ${env:JAAS_BASE_URL}
  JAAS_PRODUCT_NAME: ${env:JAAS_PRODUCT_NAME}

  # New config
  USERS_TABLE: ${self:service}-users-${self:provider.stage}
  API_KEYS_TABLE: ${self:service}-api-keys-${self:provider.stage}
  VERIFICATION_TOKENS_TABLE: ${self:service}-verification-tokens-${self:provider.stage}
  EMAIL_FROM: ${env:EMAIL_FROM, 'noreply@yourdomain.com'}
  EMAIL_REPLY_TO: ${env:EMAIL_REPLY_TO, 'support@yourdomain.com'}
  VERIFICATION_TOKEN_TTL: ${env:VERIFICATION_TOKEN_TTL, '900'} # 15 minutes
  ADMIN_API_KEY: ${env:ADMIN_API_KEY, ''} # For revoke-key endpoint
```

### Phase 5: File Structure

```
src/
├── handlers/
│   ├── onboard.js              # NEW
│   ├── requestKeyRotation.js   # NEW
│   ├── rotateKey.js            # NEW
│   └── revokeKey.js            # NEW
├── auth/
│   ├── jaasClient.js           # EXISTING (unchanged)
│   └── jaasManagement.js       # NEW (if needed)
├── db/
│   ├── connectionPool.js       # EXISTING (PostgreSQL, unchanged)
│   ├── tokenVerifier.js        # EXISTING (PostgreSQL, unchanged)
│   └── dynamoClient.js         # NEW (DynamoDB operations)
├── utils/
│   ├── secretsManager.js       # EXISTING (unchanged)
│   ├── emailService.js         # NEW
│   └── tokenGenerator.js       # NEW
├── index.js                    # EXISTING (unchanged - /generate endpoint)
├── htmlTemplate.js            # EXISTING (unchanged)
├── imageGenerator.js          # EXISTING (unchanged)
└── svgGenerator.js            # EXISTING (unchanged)
```

## Implementation Steps

### Step 1: Setup Infrastructure

1. Create DynamoDB tables (via serverless.yml or AWS Console)
2. Configure AWS SES (verify domain, set up sending limits)
3. Add IAM permissions to serverless.yml

### Step 2: Create Supporting Modules

1. `src/db/dynamoClient.js` - DynamoDB operations
2. `src/utils/emailService.js` - Email sending
3. `src/utils/tokenGenerator.js` - Token generation
4. `src/auth/jaasManagement.js` - JAAS integration (if needed)

### Step 3: Create Handler Functions

1. `src/handlers/onboard.js` - User onboarding
2. `src/handlers/requestKeyRotation.js` - Request rotation
3. `src/handlers/rotateKey.js` - Rotate key
4. `src/handlers/revokeKey.js` - Revoke key (admin)

### Step 4: Update Serverless Configuration

1. Add new Lambda functions
2. Add DynamoDB resources
3. Add IAM permissions
4. Add environment variables

### Step 5: Testing

1. Unit tests for each handler
2. Integration tests for flows
3. End-to-end testing
4. Security testing (token expiration, email validation)

## Security Considerations

1. **Email Verification**: All sensitive operations require email verification
2. **Token Expiration**: Verification tokens expire after 15 minutes
3. **One-Time Tokens**: Verification tokens can only be used once
4. **Rate Limiting**: Add rate limiting to prevent abuse (via API Gateway)
5. **Email Privacy**: Don't reveal if email exists in system
6. **API Key Storage**: Never store raw API keys in DynamoDB
7. **Admin Endpoint**: Protect `/revoke-key` with admin authentication
8. **Logging**: Log all key operations for audit trail

## Error Handling

All endpoints should:

- Return consistent error format
- Log errors for debugging
- Don't leak sensitive information
- Handle service failures gracefully (DynamoDB, SES, JAAS)

## Testing Strategy

1. **Unit Tests**: Test each handler function independently
2. **Integration Tests**: Test DynamoDB operations, email sending
3. **E2E Tests**: Test complete flows (onboard → rotate → revoke)
4. **Security Tests**: Test token expiration, email validation, admin auth

## Migration Notes

- Existing `/generate` endpoint remains completely unchanged
- No breaking changes to existing API
- New endpoints are additive only
- Can be deployed incrementally

## Dependencies to Add

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.x.x",
    "@aws-sdk/client-ses": "^3.x.x",
    "@aws-sdk/lib-dynamodb": "^3.x.x",
    "uuid": "^9.x.x"
  }
}
```

## Environment Variables to Add

```bash
# DynamoDB Tables
USERS_TABLE=code-to-image-api-users-dev
API_KEYS_TABLE=code-to-image-api-api-keys-dev
VERIFICATION_TOKENS_TABLE=code-to-image-api-verification-tokens-dev

# Email Configuration
EMAIL_FROM=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com

# Security
VERIFICATION_TOKEN_TTL=900  # 15 minutes in seconds
ADMIN_API_KEY=your-admin-api-key-here

# JAAS (existing, unchanged)
JAAS_BASE_URL=https://jaas.example.com/api
JAAS_PRODUCT_NAME=codetoimage
```

## Next Steps

1. Review this plan
2. Confirm JAAS capabilities (does it support key creation/rotation?)
3. Set up DynamoDB tables
4. Configure AWS SES
5. Implement supporting modules
6. Implement handlers
7. Test thoroughly
8. Deploy incrementally
