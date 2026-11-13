# Quick Start

This guide walks through capturing a retained decision record using the Obligra Verify Node.js SDK.

## Prerequisites

* Use Node.js 22 or 24 for this preview. The package declares Node.js 18+, but this candidate has not been validated on Node.js 18.
* A key for the intended Test workspace/environment with `records:write`, injected into `VERIFY_API_KEY` through your approved backend secret mechanism.
* A signed-in Verify Console session for retrieving and checking the resulting record.

## Install the SDK

```bash
mkdir verify-first-record
cd verify-first-record
npm init -y
npm install github:obligra/verify-node-sdk#REVIEWED_COMMIT
```

## Configure the SDK

Set `VERIFY_BASE_URL=https://api.obligra.ai` in your process environment. The SDK does not load `.env` automatically. If you use an approved, Git-ignored `.env` file, run `node --env-file=.env server.mjs` on Node.js 20.6+ instead of plain `node server.mjs`. See the [Node CLI documentation](https://nodejs.org/api/cli.html#--env-filefile). Never put real keys in shell history or recordings.

Save the following configuration and capture call together as `server.mjs`, or use the [complete error-handling example](../examples/quickstart/server.mjs). For `.js`, set `"type": "module"` in package.json. CommonJS requires [dynamic import inside an async function](../README.md#commonjs-require).

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  baseUrl: process.env.VERIFY_BASE_URL,
  environment: "sandbox"
});
```

## Capture a Decision Record

```javascript
const result = await verify.captureDecisionRecord({
  workflowId: "fictional-claim-review",
  prompt: "Summarize this fictional claim for review.",
  response: "This fictional claim needs a reviewer. No model was called.",
  operationalContext: {
    claimId: "fictional-claim-12345",
    reviewType: "ai-assisted",
    outcome: "approved",
    region: "us-east-1"
  },
  model: {
    provider: "synthetic",
    modelId: "no-model-call"
  }
});

console.log(result.decisionRecordId); // "dr_..."
console.log(result.status ?? "not returned");
```

Run `node server.mjs` once with credentials injected, or use the `--env-file` alternative above. The explicit `captureDecisionRecord` call initiates the transfer. No model is called. Do not rerun after an uncertain result until you have reconciled Records.

## Response

A successful capture requires HTTP 201 with a nonempty string `decisionRecordId`. This is an illustrative receipt; optional metadata is not guaranteed or synthesized:

```json
{
  "decisionRecordId": "dr_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "recorded",
  "verificationState": "not_verified",
  "workflowId": "claim-review",
  "environment": "sandbox",
  "createdAt": "2026-06-06T12:00:00.000Z",
  "capturedAt": "2026-06-06T12:00:00.000Z",
  "retentionUntil": "2026-06-13T12:00:00.000Z",
  "recordUrl": "https://console.obligra.ai/records/dr_a1b2c3d4-...",
  "retrievalKeys": ["claim-12345", "ai-assisted", "approved", "us-east-1"]
}
```

| Field | Description |
|---|---|
| `decisionRecordId` | Unique record identifier |
| `status` | `"recorded"` — the record has been persisted |
| `verificationState` | `"not_verified"` — verification has not yet been performed |
| `workflowId` | The workflow that generated this record |
| `environment` | The environment the API key is scoped to |
| `createdAt` | ISO 8601 timestamp when the record was created |
| `capturedAt` | Alias for `createdAt` (SDK convenience) |
| `retentionUntil` | When the record will expire based on environment retention policy |
| `recordUrl` | Direct link to view the record in the Verify Console |
| `retrievalKeys` | Values from `operationalContext` used for retrieval |

## Core Fields

| Field | Type | Description |
|---|---|---|
| `workflowId` | string | Identifies the workflow (e.g. `"claim-review"`, `"fraud-analysis"`) |
| `operationalContext` | object | Optional references; defaults to convenience fields or `{}` |
| `model` | object | Optional `{ provider, modelId }`; missing values default to `"unknown"` |

## Convenience Fields

The SDK also accepts these fields and maps them into the API payload:

| Field | Maps to |
|---|---|
| `retrievalKey` | `operationalContext.retrievalKey` |
| `decisionType` | `operationalContext.decisionType` |
| `prompt` | `aiAssistedContext.prompt` without truncation |
| `response` | `aiAssistedContext.output` without truncation |
| `metadata.model` | `model.modelId` |
| `metadata.modelProvider` | `model.provider` |

If you provide both `operationalContext` and convenience fields, explicit `operationalContext` values take precedence.

## Error Handling

```javascript
import { VerifyClient, VerifyError } from "@obligra/verify-sdk";

try {
  const result = await verify.captureDecisionRecord({ ... });
} catch (err) {
  if (err instanceof VerifyError) {
    console.error(`[${err.code}]`);
    console.error(`  Status: ${err.statusCode}`);
    if (err.outcomeUnknown) console.error("The record may have been saved. Check Records before another attempt.");
  }
}
```

| Error Code | HTTP Status | Retryable | Meaning |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | No | API key is invalid or revoked |
| `FORBIDDEN` | 403 | No | API key does not have required scope |
| `BAD_REQUEST` | 400 | No | Payload validation failed |
| `RATE_LIMITED` | 429 | No | Too many requests |
| `INTERNAL_ERROR` | 500 | No | Outcome unknown; reconcile Records |
| `TIMEOUT` | — | No | Total deadline exceeded; outcome unknown |
| `NETWORK_ERROR` | — | No | Connection/stream failed; outcome unknown |
| `CAPTURE_RESULT_UNCONFIRMED` | 2xx | No | Unexpected success status or unusable receipt; reconcile Records |

## Next Steps

Sign into the Console, select the same workspace and Test environment as the key, and locate the returned record ID. Compare the exact retained prompt, output and references, then run and inspect the integrity check. Integrity does not establish human review, model-output accuracy or compliance. Retrieval and integrity require Console Cognito authentication; the capture key cannot perform them through this SDK.

* [Configuration](./configuration.md) — timeouts, retries, base URL
* [Capture Decision Records](./capture-decision-record.md) — full field reference
* [API Reference](./api-reference.md) — all methods
* [Errors and Retries](./errors-and-retries.md) — retry behavior

## Current contract and acceptance limits

This branch is an unreleased correction. Replace `REVIEWED_COMMIT` only with the exact reviewed revision after its release gate; do not assume the default branch contains it. Authenticated live SDK capture/retrieval has not yet been validated for this revision.

Use the approved API-key capture origin (`https://api.obligra.ai` for the existing deployment). The SDK appends `/decision-records`; do not add the console API prefix `/api/v1`.

Keep searchable identifiers in `operationalContext` (up to 20 string values of at most 128 characters). Convenience `prompt` and `response` map without truncation to `aiAssistedContext.prompt` and `aiAssistedContext.output`. Explicit AI-context values take precedence. The full UTF-8 JSON request must fit 256 KiB. No model is called by capture.

Captures are never automatically retried. For `outcomeUnknown` errors, reconcile existing saved Records before another attempt. See [Errors and capture safety](errors-and-retries.md). Use only fictional or synthetic Test data during validation; keep keys server-side and out of logs/recordings.
