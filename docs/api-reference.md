# API Reference

Public SDK interface for the Obligra Verify Node.js SDK.

## Import

```javascript
import { VerifyClient, VerifyError } from "@obligra/verify-sdk";
```

## VerifyClient

### Constructor

```javascript
new VerifyClient(options)
```

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `apiKey` | string | Yes | `process.env.VERIFY_API_KEY` | Verify API key |
| `environment` | string | Yes | `process.env.VERIFY_ENVIRONMENT` | Target environment |
| `baseUrl` | string | **Yes** | — (required) | API endpoint. Set `VERIFY_BASE_URL` env var or pass explicitly. Preview: `https://verify-console.preview.emergentagent.com/api/v1`. Production: `https://api.obligra.ai/api/v1` |
| `timeoutMs` | number | No | `10000` | Request timeout in milliseconds |
| `maxRetries` | number | No | `2` | Max retry attempts for retryable failures |
| `enableLogging` | boolean | No | `false` | Enable SDK diagnostic logging |

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  timeoutMs: 15000,
  maxRetries: 3
});
```

---

## captureDecisionRecord(record)

Captures a retained decision record.

```javascript
const result = await verify.captureDecisionRecord(record);
```

### Request Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `workflowId` | string | Yes | Identifies the workflow |
| `operationalContext` | object | Yes* | Key-value string pairs describing the decision context |
| `model` | object | Yes* | `{ provider: string, modelId: string }` |
| `retrievalKey` | string | No | Maps to `operationalContext.retrievalKey` |
| `decisionType` | string | No | Maps to `operationalContext.decisionType` |
| `prompt` | string | No | Maps to `operationalContext.prompt` (truncated to 512 chars) |
| `response` | string | No | Maps to `operationalContext.response` (truncated to 512 chars) |
| `metadata` | object | No | Maps `metadata.model` → `model.modelId`, `metadata.modelProvider` → `model.provider` |

*If not provided explicitly, built from convenience fields.

### Response

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
  "recordUrl": "https://console.obligra.ai/records/dr_...",
  "retrievalKeys": ["claim-12345", "ai-assisted", "approved"]
}
```

| Field | Type | Description |
|---|---|---|
| `decisionRecordId` | string | Unique record identifier |
| `status` | string | `"recorded"` |
| `verificationState` | string | `"not_verified"` until verification is performed |
| `workflowId` | string | Echo of submitted workflow ID |
| `environment` | string | Environment name (from API key) |
| `createdAt` | string | ISO 8601 creation timestamp |
| `capturedAt` | string | Alias for `createdAt` |
| `retentionUntil` | string | When the record expires |
| `recordUrl` | string | Link to view in Verify Console |
| `retrievalKeys` | array | Values from `operationalContext` for retrieval |
| `ledger` | object | (Optional) Ledger attestation if active |

---

## health()

Checks whether the Verify endpoint is reachable.

```javascript
const status = await verify.health();
```

Returns the API health response or `{ status: "error", message: "..." }` on failure.

---

## VerifyError

Structured error thrown on API failures.

```javascript
import { VerifyError } from "@obligra/verify-sdk";
```

| Property | Type | Description |
|---|---|---|
| `name` | string | Always `"VerifyError"` |
| `message` | string | Human-readable error message |
| `statusCode` | number | HTTP status code (when available) |
| `code` | string | Stable error code |
| `retryable` | boolean | Whether the SDK will retry this error |
| `response` | object | Raw API error response body (when available) |

### Error Codes

| Code | HTTP | Retryable | Meaning |
|---|---|---|---|
| `MISSING_API_KEY` | — | No | API key not provided |
| `MISSING_ENVIRONMENT` | — | No | Environment not provided |
| `MISSING_WORKFLOW_ID` | — | No | workflowId not in request |
| `BAD_REQUEST` | 400 | No | Payload validation failed |
| `UNAUTHORIZED` | 401 | No | API key invalid or revoked |
| `FORBIDDEN` | 403 | No | Insufficient permissions |
| `NOT_FOUND` | 404 | No | Endpoint not found |
| `PAYLOAD_TOO_LARGE` | 413 | No | Payload exceeds 256KB |
| `RATE_LIMITED` | 429 | Yes | Too many requests |
| `INTERNAL_ERROR` | 500 | Yes | Server error |
| `BAD_GATEWAY` | 502 | Yes | Upstream failure |
| `SERVICE_UNAVAILABLE` | 503 | Yes | Service temporarily down |
| `GATEWAY_TIMEOUT` | 504 | Yes | Upstream timeout |
| `TIMEOUT` | — | Yes | Client-side timeout |
| `NETWORK_ERROR` | — | Yes | Connection failure |

### Retry Behavior

The SDK retries automatically on retryable errors with exponential backoff:
- Attempt 1: immediate
- Attempt 2: 1000ms delay
- Attempt 3: 2000ms delay (if `maxRetries >= 2`)

Non-retryable errors (400, 401, 403) are thrown immediately.

---

## HTTP Details

All requests are sent as:

```
POST {baseUrl}/decision-records
X-Verify-Api-Key: <apiKey>
Content-Type: application/json
```

The `environment` is determined server-side by the API key. You do not need to specify it in the request payload.
