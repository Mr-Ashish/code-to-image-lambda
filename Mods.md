# API Key–Based Onboarding & Management

This document describes **how to wrap an existing API** with **API key verification, rate limiting, and user onboarding** using **AWS API Gateway + Lambda + DynamoDB**, and defines **all user interaction flows** required to operate the system safely.

The goal is:

- Go to market fast
- Avoid building full authentication upfront
- Keep the system secure and scalable

---

## 1. Scope & Assumptions

### What you already have

- An existing API that performs computation and returns an image
- The API can be called via HTTP (Lambda, EC2, container, or external URL)

### What this system will add

- User onboarding (email-based)
- API key generation & rotation
- Per-user rate limiting & quotas
- Minimal data storage

### What this system will NOT include (v1)

- Passwords / login
- OAuth / JWT
- User dashboard
- Usage analytics UI

---

## 2. High-Level Architecture

```
User
  ↓
Onboarding API (public)
  ↓
AWS API Gateway (API Key + Usage Plan)
  ↓
Your Existing Image API
```

Key principles:

- API Gateway performs **API key validation & throttling**
- Your existing API is **not modified**
- DynamoDB stores **metadata only**, never secrets

---

## 3. Data Model (DynamoDB)

### 3.1 Users Table

Purpose: identify ownership and enable communication

Attributes:

- user_id (PK)
- email
- status (active | suspended)
- created_at

---

### 3.2 API Keys Table

Purpose: track API key lifecycle

Attributes:

- api_key_id (PK) ← API Gateway key ID
- user_id
- plan (free | pro | etc.)
- revoked (boolean)
- created_at
- rotated_at (optional)

Important:

- Raw API key value is **never stored**
- API Gateway stores the secret internally

---

## 4. API Gateway Configuration

### 4.1 Protected API (Your Existing API)

- Method: POST / generate-image
- API Key Required: TRUE
- Backend: your existing API (Lambda / HTTP / ALB)

API Gateway enforces:

- x-api-key presence
- validity of key
- rate limits & quotas

---

### 4.2 Usage Plans

Example plans:

**Free Plan**

- 10 requests / minute
- 100 requests / day

**Pro Plan**

- 60 requests / minute
- 10,000 requests / day

Usage plans are attached to:

- API stage (e.g., prod)
- Individual API keys

---

## 5. System APIs (You will build these)

### 5.1 POST /onboard

Public endpoint used once per user.

Input:

```
{ "email": "user@example.com" }
```

Actions:

1. Create user record
2. Create API Gateway API key
3. Attach key to default usage plan
4. Store metadata in DynamoDB
5. Return API key (one-time)

Output:

```
{
  "apiKey": "sk_live_xxx",
  "message": "Store this key securely. It will not be shown again."
}
```

---

### 5.2 POST /request-key-rotation

Public endpoint.

Input:

```
{ "email": "user@example.com" }
```

Actions:

1. Generate one-time verification token
2. Email verification link/token

---

### 5.3 POST /rotate-key

Protected by verification token.

Actions:

1. Disable old API Gateway key
2. Create new API key
3. Attach to same usage plan
4. Update DynamoDB metadata
5. Return new API key (one-time)

---

### 5.4 POST /revoke-key (admin)

Actions:

- Disable API Gateway key
- Mark revoked=true in DynamoDB

---

## 6. User Interaction Flows

### 6.1 New User Onboarding

```
User enters email
      ↓
System creates API key
      ↓
User receives key
      ↓
User calls API with x-api-key
```

User-facing copy:

> Your API key is shown once. Save it securely.

---

### 6.2 Making an API Request

```
POST /generate-image
Headers:
  x-api-key: sk_live_xxx
Body:
  { request payload }
```

Possible responses:

- 200 → success
- 403 → missing / invalid key
- 429 → rate limit exceeded

---

### 6.3 User Loses API Key

```
User requests reset
      ↓
Email verification
      ↓
Old key revoked
      ↓
New key generated
```

Important behavior:

- Old key stops working immediately
- New key must be updated in client code

---

### 6.4 Plan Upgrade (Manual or Stripe later)

```
User requests upgrade
      ↓
You move API key to higher usage plan
      ↓
Limits increase instantly
```

No new key required.

---

### 6.5 Abuse / Suspension

```
You disable API Gateway key
      ↓
All requests rejected at gateway
```

Backend is never invoked.

---

## 7. Security Model

- API keys are treated like passwords
- Keys are never retrievable
- Rotation is the only recovery path
- No per-request database reads
- Rate limiting happens before compute

---

## 8. Operational Notes

### Logging

- API Gateway logs: auth failures, throttling
- Backend logs: request payloads, compute errors

### Monitoring

- Requests per API key
- 4xx / 5xx rates
- Lambda duration

---

## 9. Future Enhancements (Non-breaking)

- Stripe billing → map plan → usage plan
- Dashboard for key rotation
- Usage analytics UI
- Multiple keys per user
- Team / org accounts

---

## 10. Summary

This system:

- Adds API monetization safely
- Requires minimal engineering effort
- Keeps your existing API untouched
- Scales from 1 to 100,000 users

This is a production-grade foundation used by real API-first startups.
