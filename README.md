# Obligra Verify Node.js SDK

Node.js SDK for capturing retained decision records with Obligra Verify.

## Overview

Obligra Verify provides decision record infrastructure for AI-assisted workflows.

The Verify SDK allows applications to capture retained decision records that can later be retrieved, reviewed, and verified as part of operational, audit, compliance, and governance workflows.

This SDK is intended for developers building AI-assisted operational workflows that require durable records of AI-generated outputs and associated workflow context.

## Status

Early Integration Preview

This SDK is under active development and is not yet recommended for production use.

## Requirements

- Node.js 18 or later
- No additional runtime dependencies (the SDK uses only Node.js built-in APIs)

## Installation

```bash
npm install github:obligra/verify-node-sdk
```

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
VERIFY_BASE_URL=https://verify-console.preview.emergentagent.com/api/v1 \
VERIFY_API_KEY=obv_sandbox_YOUR.KEY \
node server.mjs
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
- AI input
- AI output
- Metadata
- Capture timestamp

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
- Zero runtime dependencies — uses only Node.js built-in `fetch`, `URL`, `AbortController`

## Documentation

Additional documentation is available in the `/docs` folder.

- Architecture Overview
- Quick Start
- Configuration
- Capture Decision Records
- API Reference
- Errors and Retries
- FAQ

The Architecture Overview document provides:

- Standard SDK capture workflow
- Customer-owned AWS proxy deployment pattern
- Decision record lifecycle
- Review and retrieval workflow concepts
- SDK design principles

## Examples

Examples are available in the `examples/` directory included in this repository.

The current example demonstrates basic decision record capture using the Obligra Verify Node.js SDK.

Additional reference implementations, deployment patterns, and workflow examples will be published as they are finalized.

## Support

For support inquiries:

contact@obligra.ai

For security issues:

security@obligra.ai

## License

Apache License 2.0