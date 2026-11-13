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

- This source includes a capture-contract and write-safety correction; live acceptance remains pending.
- Offline mocked-HTTP tests pass; authenticated end-to-end acceptance of this revision is still pending.
- Earlier validation reports describe earlier revisions and are not a current release acceptance result.
- Use only fictional or synthetic input in a Test environment during validation.

## Requirements

- Use Node.js 22 or 24 for this preview. The package declares Node.js 18+, but Node.js 18 compatibility has not yet been validated for this candidate.
- No additional runtime dependencies (the SDK uses only Node.js built-in APIs)

## Installation

For an authorized Test evaluation, install an exact reviewed GitHub commit (replace `REVIEWED_COMMIT`; confirm which revision you are evaluating):

```bash
npm install github:obligra/verify-node-sdk#REVIEWED_COMMIT
```

> **Note:** npm package publication (`npm install @obligra/verify-sdk`) is planned for the production release. During the preview period, install from GitHub.

## Getting Credentials

1. Create or sign into your Verify Builder account at the Obligra Verify Console
2. Navigate to **API Keys**
3. Use a key for your intended **Test** workspace/environment with `records:write`. If you need a new key, create it in the Console and save the one-time secret through your approved secret mechanism.
4. Inject `VERIFY_API_KEY` into the backend process through that mechanism, then set the capture origin:

```bash
export VERIFY_BASE_URL=https://api.obligra.ai
```

The SDK reads `process.env`; it does **not** load `.env` automatically. For an approved local `.env` file, Node.js 20.6+ supports `node --env-file=.env server.mjs`. Keep that file out of Git and recordings. Otherwise export/inject the variables before `node server.mjs`.

The key determines the real workspace and environment. `environment: "sandbox"` is the SDK's required legacy label for Test; it does not change a key's scope or protect against using a Production key. Retrieval and integrity checks use your signed-in Console session, not this capture key.

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

### Option A: Use `.mjs`

Create `server.mjs` after installing and configuring the SDK. Running it submits one fictional record. It does not call a model; your application chooses when to call `captureDecisionRecord` and which data to include.

```javascript
import { VerifyClient, VerifyError } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  baseUrl: process.env.VERIFY_BASE_URL,
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});

try {
  const receipt = await verify.captureDecisionRecord({
    workflowId: "fictional-first-record",
    retrievalKey: "fictional-case-001",
    prompt: "Summarize the fictional case for review.",
    response: "This fictional case needs a reviewer. No model was called.",
    model: { provider: "synthetic", modelId: "no-model-call" }
  });
  console.log("Record ID:", receipt.decisionRecordId);
  console.log("Created:", receipt.createdAt ?? "not returned");
  console.log("Status:", receipt.status ?? "not returned");
} catch (error) {
  // Log sanitized fields, not the key, payload or raw server error body.
  console.error(error instanceof VerifyError ? error.code : "UNEXPECTED_ERROR");
  if (error.outcomeUnknown) {
    console.error("The record may have been saved. Check Records before another attempt.");
  }
  process.exitCode = 1;
}
```

Run:

```bash
node server.mjs
```

## What Happens Next?

The SDK accepts a capture receipt only from HTTP 201 with a nonempty `decisionRecordId`. Other successful HTTP statuses and missing/malformed receipts remain unconfirmed. Optional metadata is returned as supplied by the server; the SDK does not invent status or timestamps.

1. Sign into the Verify Console and select the same workspace and Test environment as the key.
2. Find the returned record ID, or search for `fictional-case-001`.
3. Compare the retained prompt, output and references with exactly what you submitted.
4. Run the record's integrity check and inspect its actual result. Integrity verification is not human review, model-output correctness or a compliance certification.

The capture key cannot retrieve records or perform integrity checks through this SDK. Use the Console's Cognito-authenticated session for those operations.

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
// server.cjs — dynamic import must be inside an async function.
async function main() {
  const { VerifyClient, VerifyError } = await import("@obligra/verify-sdk");
  const verify = new VerifyClient({
    apiKey: process.env.VERIFY_API_KEY,
    baseUrl: process.env.VERIFY_BASE_URL,
    environment: "sandbox"
  });
  // Put the same single capture call and error handling shown above here.
}
main().catch(() => { process.exitCode = 1; });
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
- Configurable total deadline covering the connection, response headers and body
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
- Captures are attempted once, even if `maxRetries` is supplied. Network/stream failures, timeouts, 408/409/5xx, unexpected 2xx and missing-receipt outcomes are marked `outcomeUnknown`; inspect saved Records before deciding whether another attempt is safe. There is no server idempotency guarantee in this contract.
- `timeoutMs` now covers response-body consumption as well as connection/headers. It must be an integer from 1 to 2147483647; invalid values are rejected before HTTP.
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
