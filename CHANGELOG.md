# Changelog

## Unreleased — capture contract and write safety

- Keep AI input/output losslessly in `aiAssistedContext`, preserve explicit values, and copy caller-owned maps.
- Validate searchable reference and whole-payload limits before HTTP.
- Attempt captures once; mark uncertain outcomes and missing receipts explicitly; do not fabricate timestamps or success status.
- Correct API-key capture origin documentation and distinguish offline tests from pending live acceptance.
- Keep the total deadline active through response-body consumption; abort and settle stalled requests once, preserve interrupted-stream failures and reject invalid timeout values.
- Reject redirects so a capture body/key cannot be resent to another endpoint.
- Require HTTP 201 plus a usable record ID; keep unexpected 2xx, 408/409 and explicit server uncertainty unconfirmed without retries.
- Correct CommonJS dynamic import, environment loading, required SDK fields and reference limits; examples no longer override an injected key or print raw error messages.
- Qualify the Node.js 18 compatibility claim; this candidate is locally tested on Node.js 22 and 24.
- Migration changes payload location and retry semantics; exact revision review and authenticated Test acceptance are required before release.


All notable changes to this project will be documented in this file.

This project follows semantic versioning once public package releases begin.

## [0.1.2] - 2026-06-11

### Added

- Field validation: throws `UNSUPPORTED_FIELD` error for `output`, `result`, `completion`, `answer`, `generation`
- Clear error message directs developers to use `response` for model output
- Tests for `prompt` and `response` field mapping
- Tests for unsupported field rejection

### Changed

- `docs/api-reference.md`: baseUrl marked as required, removed raw API Gateway URL
- `examples/quickstart/server.mjs`: demonstrates canonical `prompt` + `response` fields
- Canonical field naming documented: `prompt` = model input, `response` = model output

## [0.1.1] - 2026-06-11

### Changed

- Tightened package publish hygiene: `files` allowlist limits published contents to 5 files (7.9 KB)
- Added `.npmignore` to exclude test/docs/examples from npm publish
- Added `engines` field requiring Node.js >= 18
- Added `package-lock.json` to `.gitignore` (library convention)
- Confirmed zero runtime dependencies — SDK uses only Node.js built-in APIs

### Security

- `npm audit` reports 0 vulnerabilities on fresh install
- No AWS SDK dependency (uses native `fetch` instead)
- No transitive dependency tree

## [0.1.0] - Preview

Initial repository setup for the Obligra Verify Node.js SDK.

- Real HTTPS capture via `POST /decision-records`
- API key authentication (`X-Verify-Api-Key` header)
- Automatic retry with exponential backoff (429, 5xx)
- Configurable timeout with `AbortController`
- Structured `VerifyError` with `code`, `statusCode`, `retryable`
- Convenience field mapping (`retrievalKey`, `decisionType`, `prompt`, `response`)
- 13 tests covering success, auth failure, rate limit, timeout, field mapping
