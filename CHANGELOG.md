# Changelog

All notable changes to this project will be documented in this file.

This project follows semantic versioning once public package releases begin.

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