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
| `apiKey` | string | Yes, option or env | `process.env.VERIFY_API_KEY` | Verify capture key with `records:write` |
| `environment` | string | Yes, option or env | `process.env.VERIFY_ENVIRONMENT` | Legacy label (`sandbox` for Test); the key determines actual scope |
| `baseUrl` | string | **Yes** | — (required) | API endpoint. Set `VERIFY_BASE_URL` or pass explicitly. Example: `https://api.obligra.ai` |
| `timeoutMs` | number | No | `10000` | Total request deadline including response body; integer 1–2147483647 ms |
| `maxRetries` | number | No | `0` | Retained for compatibility; captures are never automatically retried |
| `enableLogging` | boolean | No | `false` | Enable SDK diagnostic logging |

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  timeoutMs: 15000,
  baseUrl: process.env.VERIFY_BASE_URL
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
| `operationalContext` | object | No* | Searchable string references (up to 20, values up to 128 characters) |
| `model` | object | No* | `{ provider: string, modelId: string }` |
| `retrievalKey` | string | No | Maps to `operationalContext.retrievalKey` |
| `decisionType` | string | No | Maps to `operationalContext.decisionType` |
| `prompt` | string | No | Model input. Maps to `aiAssistedContext.prompt` without truncation |
| `response` | string | No | Model output. Maps to `aiAssistedContext.output` without truncation |
| `aiAssistedContext` | object | No | String values retained separately from searchable references; explicit values take precedence |
| `metadata` | object | No | Maps `metadata.model` → `model.modelId`, `metadata.modelProvider` → `model.provider` |

*If omitted, the SDK builds the context from convenience fields (or `{}`) and defaults missing model fields to `"unknown"`.

#### Unsupported Fields

The following field names throw an `UNSUPPORTED_FIELD` error if used:

| Field | Error Message |
|---|---|
| `output` | `Unknown field "output". Use "response" for model output.` |
| `result` | `Unknown field "result". Use "response" for model output.` |
| `completion` | `Unknown field "completion". Use "response" for model output.` |
| `answer` | `Unknown field "answer". Use "response" for model output.` |
| `generation` | `Unknown field "generation". Use "response" for model output.` |

This validation fires before any network request, preventing silent data loss.

### Response

Capture requires HTTP 201 and an object containing a nonempty string `decisionRecordId`. The following is an illustrative receipt; optional metadata is not guaranteed or synthesized. `capturedAt` aliases `createdAt` only when supplied.

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
| `retryable` | boolean | Always false for capture errors; no automatic capture retry |
| `outcomeUnknown` | boolean | The write may have been saved; reconcile Records before another attempt |
| `response` | object | Raw API error response body (when available) |

### Error Codes

| Code | HTTP | Retryable | Meaning |
|---|---|---|---|
| `MISSING_API_KEY` | — | No | API key not provided |
| `INVALID_TIMEOUT` | — | No | timeoutMs is not a supported positive integer |
| `CAPTURE_RESULT_UNCONFIRMED` | 2xx | No | Unexpected success status or missing usable receipt |
| `MISSING_ENVIRONMENT` | — | No | Environment not provided |
| `MISSING_WORKFLOW_ID` | — | No | workflowId not in request |
| `BAD_REQUEST` | 400 | No | Payload validation failed |
| `UNAUTHORIZED` | 401 | No | API key invalid or revoked |
| `FORBIDDEN` | 403 | No | Insufficient permissions |
| `NOT_FOUND` | 404 | No | Endpoint not found |
| `PAYLOAD_TOO_LARGE` | 413 | No | Payload exceeds 256KB |
| `RATE_LIMITED` | 429 | No | Too many requests |
| `INTERNAL_ERROR` | 500 | No | Server error |
| `BAD_GATEWAY` | 502 | No | Upstream failure |
| `SERVICE_UNAVAILABLE` | 503 | No | Service temporarily down |
| `GATEWAY_TIMEOUT` | 504 | No | Upstream timeout |
| `TIMEOUT` | — | No | Client-side timeout |
| `NETWORK_ERROR` | — | No | Connection failure |

### Capture attempts

Captures make one HTTP attempt. `maxRetries` never repeats a capture, because this API contract has no idempotency guarantee. Network/stream failures, timeouts, 408/409/5xx, unexpected 2xx and missing-receipt failures set `outcomeUnknown: true`; inspect saved Records before another attempt.

---

## HTTP Details

All requests are sent as:

```
POST {baseUrl}/decision-records
X-Verify-Api-Key: <apiKey>
Content-Type: application/json
```

The `environment` is determined server-side by the API key. You do not need to specify it in the request payload.

## Capture limits and uncertain outcomes

`workflowId` supports 1–128 characters. `operationalContext` supports up to 20 string references (names up to 64 characters; values up to 128). AI input/output belongs in `aiAssistedContext`, not retrieval references. The complete JSON payload must fit 256 KiB in UTF-8. Validation never truncates data or mutates the supplied maps.

Unexpected 2xx or HTTP 201 without a nonempty `decisionRecordId` throws `CAPTURE_RESULT_UNCONFIRMED` with `outcomeUnknown: true`. Network/stream errors, timeouts and 408/409/5xx may have occurred after saving; no automatic retry is made. A receipt without `createdAt` has no `capturedAt` value. See [Errors and retries](errors-and-retries.md). This candidate remains unvalidated against authenticated live capture. Retrieval and integrity checks require Console Cognito authentication and are not capture-key SDK methods.
