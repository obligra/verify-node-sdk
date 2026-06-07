# Obligra Verify Node.js SDK

Node.js SDK for capturing retained decision records with Obligra Verify.

## Overview

Obligra Verify provides decision record infrastructure for AI-assisted workflows.

The Verify SDK allows applications to capture retained decision records that can later be retrieved, reviewed, and verified as part of operational, audit, compliance, and governance workflows.

This SDK is intended for developers building AI-assisted operational workflows that require durable records of AI-generated outputs and associated workflow context.

## Status

Early Integration Preview

This SDK is under active development and is not yet recommended for production use.

## Installation

```bash
npm install @obligra/verify-sdk
```

## Quick Start

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});

const result = await verify.captureDecisionRecord({
  workflowId: "claim-review-001",
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
console.log(result.verificationState); // "not_verified"
```

## Core Concepts

### Decision Record

A decision record contains:

- Workflow context
- AI input
- AI output
- Metadata
- Capture timestamp

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
- Automatic retry with exponential backoff (429, 5xx)
- Configurable timeout
- Structured error responses (`VerifyError` with `code`, `statusCode`, `retryable`)
- Operational context and model metadata capture
- Convenience field mapping (`retrievalKey`, `decisionType`, `prompt`, `response`)

## Documentation

Additional documentation is available in the `/docs` folder.

- Architecture Overview
- Quick Start
- Configuration
- Capture Decision Records
- API Reference
- Errors and Retries
- FAQ

The Architecture Overview document provides:

- Standard SDK capture workflow
- Customer-owned AWS proxy deployment pattern
- Decision record lifecycle
- Review and retrieval workflow concepts
- SDK design principles

## Examples

Examples are available in the `examples/` directory included in this repository.

The current example demonstrates basic decision record capture using the Obligra Verify Node.js SDK.

Additional reference implementations, deployment patterns, and workflow examples will be published as they are finalized.

## Support

For support inquiries:

contact@obligra.ai

For security issues:

security@obligra.ai

## License

Apache License 2.0