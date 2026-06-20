# Obligra Verify Node.js SDK

Node.js SDK for capturing retained decision records with Obligra Verify.

## Overview

Obligra Verify provides decision record infrastructure for AI-assisted workflows.

The Verify SDK allows applications to capture retained decision records that can later be retrieved, reviewed, and verified as part of operational, audit, compliance, and governance workflows.

This SDK is intended for developers building AI-assisted operational workflows that require durable records of AI-generated outputs and associated workflow context.

## Platform URLs

| | URL |
|---|---|
| Verify Console | https://console.obligra.ai |
| Verify API | https://api.obligra.ai/api/v1 |
| Documentation | https://obligra.ai/resources |

## Status

**Public Preview**

- Validated against the Obligra Verify production platform
- Suitable for development, testing, and preview deployments
- Production use supported for approved Verify environments
- Additional SDK enhancements and language support in progress

## Requirements

- Node.js 18 or later
- No additional runtime dependencies (the SDK uses only Node.js built-in APIs)

## Installation

Install directly from GitHub:

```bash
npm install github:obligra/verify-node-sdk
```

> **Note:** npm package publication (`npm install @obligra/verify-sdk`) is planned for the production release. During the preview period, install from GitHub.

## Getting Credentials

1. Create or sign into your Verify Builder account at the Obligra Verify Console
2. Navigate to **Settings → API Keys**
3. Create a Verify API key from the Verify Console — copy the secret shown once (it cannot be retrieved again)
4. Set environment variables:

```bash
export VERIFY_API_KEY=obv_sandbox_YOUR_PREFIX.YOUR_SECRET
export VERIFY_BASE_URL=https://api.obligra.ai/api/v1
```

## Security

Store Verify API keys securely.

Recommended options:

- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Environment variables managed by your deployment platform

Do not:

- Commit API keys to source control
- Embed API keys in frontend applications
- Hard-code API keys in application code
- Store API keys in browser-accessible storage

The Verify API key should only be accessible to trusted backend services.

## Quick Start

### Option A: Use `.mjs` (works immediately, no config needed)

Create `server.mjs`:

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  baseUrl: process.env.VERIFY_BASE_URL,
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});

const result = await verify.captureDecisionRecord({
  workflowId: "claim-review-001",
  prompt: "Summarize this claim for review.",
  response: "Based on the documentation provided, this claim meets approval criteria.",
  operationalContext: {
    claimId: "claim-12345",
    reviewType: "ai-assisted",
    outcome: "approved"
  },
  model: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514"
  }
});

console.log(result.decisionRecordId); // "dr_..."
console.log(result.status);           // "recorded"
console.log(result.verificationState); // "not_verified"
```

Run:

```bash
VERIFY_BASE_URL=https://api.obligra.ai/api/v1 \
VERIFY_API_KEY=obv_sandbox_YOUR.KEY \
node server.mjs
```

## What Happens Next?

When a decision record is successfully captured:

1. The record is retained by the Verify platform
2. A unique decision record identifier is returned
3. A console URL is generated
4. Authorized users can inspect the record in the Verify Console
5. Verification can be executed later to validate record integrity

Example console URL:

```
https://console.obligra.ai/records/dr_xxxxxxxx
```

### Option B: ESM project (set `type: module`)

If you prefer `.js` files, add `"type": "module"` to your `package.json`:

```bash
npm pkg set type=module
```

Then use the same `import` syntax in any `.js` file:

```javascript
import { VerifyClient } from "@obligra/verify-sdk";
```

### CommonJS (`require`)

The SDK is ESM-only. If your project uses CommonJS, use one of:

```javascript
// Dynamic import (works in CommonJS .js files with Node.js 18+)
const { VerifyClient } = await import("@obligra/verify-sdk");
```

Or rename your file to `.mjs` and use the standard `import` syntax.

## Core Concepts

### Decision Record

A decision record contains:

- Workflow context
- AI input (`prompt` field)
- AI output (`response` field)
- Metadata
- Capture timestamp

### Field Naming

| Field | Purpose | Example |
|---|---|---|
| `prompt` | The input sent to the model | `"Summarize this claim."` |
| `response` | The output returned by the model | `"Based on the evidence, this claim..."` |

The SDK validates field names and rejects common alternatives:

- `output` → use `response`
- `result` → use `response`
- `completion` → use `response`

Using an unsupported field name throws a clear error before any network request is made.

### Workflow ID

Identifies the workflow that generated the record.

Examples:

- claim-review
- clinical-summary
- audit-analysis
- fraud-review

### Retrieval Key

A customer-defined identifier used to locate records later.

Examples:

- claim number
- patient identifier
- audit identifier
- transaction identifier

## Features

- API key authentication (`X-Verify-Api-Key` header)
- Decision record capture via HTTPS
- Automatic retry with exponential backoff (429, 5xx)
- Configurable timeout
- Structured error responses (`VerifyError` with `code`, `statusCode`, `retryable`)
- Operational context and model metadata capture
- Convenience field mapping (`retrievalKey`, `decisionType`, `prompt`, `response`)
- Field validation — rejects `output`, `result`, `completion` with clear guidance
- Zero runtime dependencies — uses only Node.js built-in `fetch`, `URL`, `AbortController`

## Validation Status

| Check | Status |
|---|---|
| GitHub install | ✅ Validated |
| Clean-room install | ✅ Validated |
| API key authentication | ✅ Validated |
| Decision record capture | ✅ Validated |
| Record retrieval via console | ✅ Validated |
| Record verification via console | ✅ Validated |
| Review history audit trail | ✅ Validated |
| Runtime dependencies | Zero |
| npm audit | Clean (0 vulnerabilities) |

## Documentation

Additional documentation is available in the `/docs` folder.

- Architecture Overview
- Quick Start
- Configuration
- Capture Decision Records
- API Reference
- Errors and Retries
- FAQ

## Examples

Examples are available in the `examples/` directory included in this repository.

The current example demonstrates basic decision record capture using the Obligra Verify Node.js SDK.

## Support

For support inquiries:

contact@obligra.ai

For security issues:

security@obligra.ai

## License

Apache License 2.0
