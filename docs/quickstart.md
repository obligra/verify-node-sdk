# Quick Start

This guide walks through capturing a retained decision record using the Obligra Verify Node.js SDK.

## Prerequisites

* Node.js 18 or later
* A Verify API key (generate via the Verify Console or `POST /api-keys`)
* Access to a Verify environment (sandbox is created automatically on signup)

## Install the SDK

```bash
npm install @obligra/verify-sdk
```

## Configure the SDK

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});
```

## Capture a Decision Record

```javascript
const result = await verify.captureDecisionRecord({
  workflowId: "claim-review",
  operationalContext: {
    claimId: "claim-12345",
    reviewType: "ai-assisted",
    outcome: "approved",
    region: "us-east-1"
  },
  model: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514"
  }
});

console.log(result.decisionRecordId); // "dr_..."
console.log(result.status);           // "recorded"
```

## Response

A successful capture returns:

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

## Required Fields

| Field | Type | Description |
|---|---|---|
| `workflowId` | string | Identifies the workflow (e.g. `"claim-review"`, `"fraud-analysis"`) |
| `operationalContext` | object | Key-value pairs (strings) describing the decision context |
| `model` | object | `{ provider, modelId }` — the AI model used |

## Convenience Fields

The SDK also accepts these fields and maps them into the API payload:

| Field | Maps to |
|---|---|
| `retrievalKey` | `operationalContext.retrievalKey` |
| `decisionType` | `operationalContext.decisionType` |
| `prompt` | `operationalContext.prompt` (truncated to 512 chars) |
| `response` | `operationalContext.response` (truncated to 512 chars) |
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
    console.error(`[${err.code}] ${err.message}`);
    console.error(`  Status: ${err.statusCode}`);
    console.error(`  Retryable: ${err.retryable}`);
  }
}
```

| Error Code | HTTP Status | Retryable | Meaning |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | No | API key is invalid or revoked |
| `FORBIDDEN` | 403 | No | API key does not have required scope |
| `BAD_REQUEST` | 400 | No | Payload validation failed |
| `RATE_LIMITED` | 429 | Yes | Too many requests |
| `INTERNAL_ERROR` | 500 | Yes | Server error |
| `TIMEOUT` | — | Yes | Request exceeded timeout |
| `NETWORK_ERROR` | — | Yes | Connection failed |

## Next Steps

* [Configuration](./configuration.md) — timeouts, retries, base URL
* [Capture Decision Records](./capture-decision-record.md) — full field reference
* [API Reference](./api-reference.md) — all methods
* [Errors and Retries](./errors-and-retries.md) — retry behavior
