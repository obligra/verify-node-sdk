# Capture Decision Record

The primary purpose of the Obligra Verify SDK is to capture retained decision records.

A decision record preserves the context surrounding an AI-assisted operational decision so that it can later be retrieved, reviewed, and verified.

## Basic Example

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});

const result = await verify.captureDecisionRecord({
  workflowId: "claim-review",
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
```

## Request Fields

### Required

| Field | Type | Description |
|---|---|---|
| `workflowId` | string | Identifies the workflow that generated the decision |
| `operationalContext` | object | Key-value pairs (string values) describing the decision context |
| `model` | object | `{ provider: string, modelId: string }` — the AI model used |

### Optional (Convenience)

These fields are mapped into the API payload automatically:

| Field | Type | Maps to | Notes |
|---|---|---|---|
| `retrievalKey` | string | `operationalContext.retrievalKey` | Customer-defined retrieval identifier |
| `decisionType` | string | `operationalContext.decisionType` | Category of AI-assisted activity |
| `prompt` | string | `operationalContext.prompt` | Truncated to 512 characters |
| `response` | string | `operationalContext.response` | Truncated to 512 characters |
| `metadata` | object | `model` | `metadata.model` → `model.modelId`, `metadata.modelProvider` → `model.provider` |

If you provide both explicit fields and convenience fields, explicit values take precedence.

### workflowId

Identifies the workflow that generated the decision.

Examples: `claim-review`, `fraud-analysis`, `clinical-summary`, `audit-analysis`

### operationalContext

Key-value pairs providing workflow context. All values must be strings. Maximum 50 keys, 64 chars per key, 512 chars per value.

```javascript
operationalContext: {
  claimId: "claim-12345",
  reviewType: "automated",
  outcome: "approved",
  region: "us-east-1"
}
```

Values from `operationalContext` become retrieval keys — you can search records by any context value.

### model

Identifies the AI model that produced the decision output.

```javascript
model: {
  provider: "anthropic",
  modelId: "claude-sonnet-4-20250514"
}
```

## Response

HTTP 201 Created:

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
  "retrievalKeys": ["claim-12345", "automated", "approved", "us-east-1"]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `decisionRecordId` | string | Unique identifier assigned by Verify |
| `status` | string | `"recorded"` — the record has been persisted and retained |
| `verificationState` | string | `"not_verified"` — verification has not yet been performed |
| `workflowId` | string | Echo of the submitted workflow ID |
| `environment` | string | The environment name (determined by API key) |
| `createdAt` | string | ISO 8601 timestamp when the record was created |
| `capturedAt` | string | Alias for `createdAt` (SDK convenience field) |
| `retentionUntil` | string | ISO 8601 timestamp when the record expires per retention policy |
| `recordUrl` | string | Direct link to view the record in the Verify Console |
| `retrievalKeys` | array | Values from `operationalContext` used for future retrieval |
| `ledger` | object | (Optional) Ledger attestation status if ledger pipeline is active |

## Complete Example

```javascript
import { VerifyClient, VerifyError } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});

try {
  const result = await verify.captureDecisionRecord({
    workflowId: "fraud-analysis",
    operationalContext: {
      transactionId: "txn-99887",
      analysisType: "real-time",
      riskScore: "high",
      outcome: "escalated"
    },
    model: {
      provider: "anthropic",
      modelId: "claude-sonnet-4-20250514"
    }
  });

  console.log(`Recorded: ${result.decisionRecordId}`);
  console.log(`View: ${result.recordUrl}`);
  console.log(`Retained until: ${result.retentionUntil}`);
} catch (err) {
  if (err instanceof VerifyError) {
    console.error(`[${err.code}] ${err.message} (retryable: ${err.retryable})`);
  }
}
```

## Design Practices

### Use Stable Workflow Names

Good: `claim-review`, `fraud-analysis`, `clinical-summary`

Avoid: `claim-review-v1-test-john`, `workflow-temp-123`

### Use Meaningful Operational Context

Include fields that help with future retrieval and review:
- Business identifiers (claim ID, transaction ID, patient ID)
- Decision metadata (outcome, risk level, review type)
- Environment context (region, application name)

### Protect Credentials

- Store API keys in a secrets manager (AWS Secrets Manager, environment variables)
- Never commit API keys to source control
- Rotate keys if compromised

## Important

The Verify SDK exposes only the customer-facing capture interface. It does not expose internal platform implementation details, processing logic, or infrastructure design.
