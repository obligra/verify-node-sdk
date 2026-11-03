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
| Verify API | https://api.obligra.ai |
| Documentation | https://obligra.ai/resources |

## Status

**Public Preview**

- This branch contains a capture-contract and write-safety correction under review.
- Offline mocked-HTTP tests pass; authenticated end-to-end acceptance of this revision is still pending.
- Earlier validation reports describe earlier revisions and are not a current release acceptance result.
- Use only fictional or synthetic input in a Test environment during validation.

## Requirements

- Node.js 18 or later
- No additional runtime dependencies (the SDK uses only Node.js built-in APIs)

## Installation

After the candidate passes its release gate, install an exact reviewed GitHub commit (replace `REVIEWED_COMMIT`; the default branch is a different revision):

```bash
npm install github:obligra/verify-node-sdk#REVIEWED_COMMIT
```

> **Note:** npm package publication (`npm install @obligra/verify-sdk`) is planned for the production release. During the preview period, install from GitHub.

## Getting Credentials

1. Create or sign into your Verify Builder account at the Obligra Verify Console
2. Navigate to **API Keys**
3. Create a Verify API key from the Verify Console — copy the secret shown once (it cannot be retrieved again)
4. Set environment variables:

```bash
export VERIFY_API_KEY=obv_sandbox_YOUR_PREFIX.YOUR_SECRET
export VERIFY_BASE_URL=https://api.obligra.ai
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
VERIFY_BASE_URL=https://api.obligra.ai \
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
- One HTTP attempt per capture; uncertain writes are never retried automatically
- Configurable timeout
- Structured error responses (`VerifyError` with `code`, `statusCode`, `retryable`)
- Operational context and model metadata capture
- Convenience field mapping (`retrievalKey`, `decisionType`, `prompt`, `response`)
- Field validation — rejects `output`, `result`, `completion` with clear guidance
- Zero runtime dependencies — uses only Node.js built-in `fetch`, `URL`, `AbortController`

## Validation Status

This unreleased correction is covered by offline SDK tests and comparison with the current backend payload validator. It has not passed an authenticated capture/retrieval test in the deployed environment. No production or integration-readiness claim follows from mocked tests.

Before releasing, review the migration below, pin the exact candidate commit, then validate one explicitly authorized synthetic server-side capture and its saved receipt. Keep the key out of browser code, logs and recordings. If the result is uncertain, reconcile existing records before another attempt.

## Migration from 0.1.2

- `prompt` and `response` now map losslessly to `aiAssistedContext.prompt` and `aiAssistedContext.output`. Explicit AI-context values take precedence, including empty strings. Existing records are not changed.
- Move any legacy prompt/output values out of `operationalContext` before upgrading. Existing records are not rewritten.
- Search references stay in `operationalContext`: up to 20 string values, each at most 128 characters; names at most 64 characters. The complete UTF-8 JSON payload must fit 256 KiB. Invalid data is rejected before HTTP rather than shortened.
- Captures are attempted once, even if `maxRetries` is supplied. Network, timeout, 5xx and missing-receipt outcomes are marked `outcomeUnknown`; inspect saved Records before deciding whether another attempt is safe. There is no server idempotency guarantee in this contract.
- The API-key capture base URL is the origin `https://api.obligra.ai`; the SDK appends `/decision-records`. The Cognito-protected console API prefix `/api/v1` is a different route. Confirm your approved deployment endpoint before using a key.
- `capturedAt` aliases the server's `createdAt` only; no client timestamp or successful status is invented when missing.

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
