# Errors and Retries

This document explains how the Obligra Verify Node.js SDK should handle errors, retries, and temporary failures.

The SDK is currently in early integration preview. Error names, codes, and retry behavior may change before general availability.

## Overview

SDK error handling should help developers understand:

* What failed
* Whether the request reached Verify
* Whether the request can be retried safely
* What action should be taken next

## Error Shape

SDK errors should use a consistent structure.

```json
{
  "name": "VerifyAuthenticationError",
  "message": "Invalid or missing Verify API key.",
  "statusCode": 401,
  "code": "VERIFY_AUTHENTICATION_FAILED",
  "retryable": false
}
```

## Error Fields

| Field        | Description                                            |
| ------------ | ------------------------------------------------------ |
| `name`       | SDK error name.                                        |
| `message`    | Human-readable error message.                          |
| `statusCode` | HTTP status code, when available.                      |
| `code`       | Stable SDK or API error code.                          |
| `retryable`  | Indicates whether the operation may be retried safely. |

## Common HTTP Errors

| Status | Meaning                    | Retryable | Recommended Action                                 |
| -----: | -------------------------- | --------- | -------------------------------------------------- |
|    400 | Invalid request            | No        | Check required fields and payload format.          |
|    401 | Missing or invalid API key | No        | Confirm API key configuration.                     |
|    403 | Access denied              | No        | Confirm account, workspace, or environment access. |
|    404 | Endpoint not found         | No        | Confirm environment and endpoint configuration.    |
|    409 | Conflict                   | Maybe     | Confirm workflow and retrieval key behavior.       |
|    429 | Rate limited               | Yes       | Retry with backoff.                                |
|    500 | Server error               | Yes       | Retry with backoff.                                |
|    502 | Bad gateway                | Yes       | Retry with backoff.                                |
|    503 | Service unavailable        | Yes       | Retry with backoff.                                |
|    504 | Gateway timeout            | Yes       | Retry with backoff.                                |

## Retryable Failures

The SDK may retry temporary failures when it is safe to do so.

Retryable examples:

```text
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
Network timeout
Temporary connection failure
```

## Non-Retryable Failures

The SDK should not retry failures caused by invalid configuration, authorization issues, or malformed requests.

Non-retryable examples:

```text
400 Invalid request
401 Authentication failed
403 Access denied
Invalid payload
Missing required fields
Invalid API key
```

## Recommended Retry Defaults

Recommended preview defaults:

```text
maxRetries: 2
timeoutMs: 10000
backoff: exponential
jitter: enabled
```

## Example Configuration

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  timeoutMs: 10000,
  maxRetries: 2
});
```

## Example Error Handling

```javascript
try {
  const result = await verify.captureDecisionRecord({
    workflowId: "claim-review",
    retrievalKey: "claim-12345",
    decisionType: "ai-assisted-review",
    prompt: "Summarize this claim.",
    response: "Claim summary output."
  });

  console.log(result);
}
catch (error) {
  if (error.retryable) {
    console.error("Temporary Verify capture failure. Retry may be safe.");
  }
  else {
    console.error("Verify capture failed:", error.message);
  }
}
```

## Rate Limits

If the SDK receives a `429` response, it should treat the failure as retryable.

Recommended behavior:

* Respect retry headers when provided
* Use exponential backoff
* Add jitter to avoid synchronized retries
* Stop retrying after `maxRetries`

## Timeout Handling

If a request times out, the SDK should treat the result as unknown unless Verify confirms whether the record was captured.

Recommended behavior:

* Return a clear timeout error
* Mark timeout errors as retryable when appropriate
* Avoid duplicate captures when idempotency support is available

## Idempotency

Future SDK versions may support idempotency keys to reduce duplicate capture risk during retries.

Until idempotency behavior is explicitly documented, customers should design retry behavior carefully and use stable values for:

* `workflowId`
* `retrievalKey`
* `decisionType`

## Logging Guidance

Applications should avoid logging full decision records unless approved by organizational policy.

Do not log:

* API keys
* authentication tokens
* prompts
* model outputs
* customer records
* regulated data

Safe logs may include:

* status code
* SDK error code
* retryable flag
* timestamp
* sanitized workflow identifier

## Support

If repeated capture failures occur, contact:

[support@obligra.ai](mailto:support@obligra.ai)

For suspected security issues, contact:

[security@obligra.ai](mailto:security@obligra.ai)

Do not include API keys, secrets, prompts, outputs, or customer records in support tickets unless explicitly requested through an approved secure process.
