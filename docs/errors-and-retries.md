# Errors and capture safety

A capture is a write. This SDK makes exactly one HTTP attempt, even if `maxRetries` is supplied. A lost response does not establish that the record was not saved. No idempotency guarantee is assumed.

`VerifyError` exposes `code`, optional `statusCode`, `retryable` (false for capture errors), `outcomeUnknown`, and optional `response`. Do not log raw responses or secrets.

| Outcome | What to do |
|---|---|
| Local invalid input / oversized payload | Correct the input. No HTTP request was made. |
| 400 / 401 / 403 / 404 / 429 | Read the returned error and correct configuration, permissions or input; the SDK does not retry. Do not assume another attempt is safe solely from the status. |
| Network failure / timeout / 5xx | `outcomeUnknown: true`. The capture may have been saved. Check existing Records before any retry. |
| HTTP success without a record ID | `CAPTURE_RESULT_UNCONFIRMED`, `outcomeUnknown: true`. Reconcile Records; do not claim success. |
| Receipt with a record ID | Inspect the saved record and returned metadata. An integrity result is a separate operation. |

```javascript
try {
  const receipt = await verify.captureDecisionRecord(fictionalRecord);
  // Use receipt.decisionRecordId to inspect the saved record.
} catch (error) {
  if (error.outcomeUnknown) {
    // Stop. Reconcile saved Records before deciding on another attempt.
  } else {
    // Inspect a sanitized code/status and correct the cause.
  }
  throw error;
}
```

`capturedAt` only aliases the server's `createdAt`; no timestamp is synthesized. A saved record does not establish correct AI output, complete capture, compliance, or application integration. This correction is offline-tested; authenticated live SDK acceptance remains pending.
