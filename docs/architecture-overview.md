# Architecture Overview

This document provides a high-level view of how the Obligra Verify Node.js SDK fits into an AI-assisted workflow.

The SDK is designed to help customer applications capture retained decision records with Obligra Verify.

## Standard SDK Capture Pattern

In the standard pattern, a customer application calls the Verify SDK after an AI-assisted output is generated. The SDK sends the decision record to the Obligra Verify API for retention, retrieval, and future review.

```text
┌──────────────────────────────┐
│ Customer Application         │
│                              │
│ AI-assisted workflow         │
│ claim review, summary, etc.  │
└───────────────┬──────────────┘
                │
                │ captureDecisionRecord()
                ▼
┌──────────────────────────────┐
│ Obligra Verify Node.js SDK   │
│                              │
│ validates request            │
│ applies configuration        │
│ handles errors/retries       │
└───────────────┬──────────────┘
                │
                │ HTTPS request
                ▼
┌──────────────────────────────┐
│ Obligra Verify API           │
│                              │
│ authenticates request        │
│ accepts decision record      │
│ returns capture status       │
└───────────────┬──────────────┘
                │
                │ retained record
                ▼
┌──────────────────────────────┐
│ Verify Decision Record Layer │
│                              │
│ retains workflow context     │
│ supports retrieval/review    │
│ enables verification flows   │
└───────────────┬──────────────┘
                │
                │ later retrieval
                ▼
┌──────────────────────────────┐
│ Review and Audit Workflows   │
│                              │
│ operations review            │
│ governance review            │
│ compliance/audit review      │
└──────────────────────────────┘
```

## Standard Pattern Flow

1. A customer application runs an AI-assisted workflow.
2. The AI system produces an output.
3. The application calls `captureDecisionRecord()` through the Verify SDK.
4. The SDK validates required fields and sends the record to the Verify API.
5. Verify returns a `decisionRecordId`, capture status, and timestamp.
6. The retained record can later support review, retrieval, and verification workflows.

## Customer-Owned AWS Proxy Pattern

Some organizations may prefer or require a customer-controlled integration layer inside their own AWS account.

In this pattern, the customer application still uses the Verify SDK, but the SDK sends the capture request to a customer-owned Verify proxy or capture relay. The proxy can enforce organization-specific routing, network, logging, security, and governance controls before forwarding approved capture requests.

```text
┌──────────────────────────────┐
│ Customer Application         │
│                              │
│ AI-assisted workflow         │
└───────────────┬──────────────┘
                │
                │ captureDecisionRecord()
                ▼
┌──────────────────────────────┐
│ Obligra Verify Node.js SDK   │
│                              │
│ configured with proxy URL    │
│ validates local request      │
└───────────────┬──────────────┘
                │
                │ HTTPS request
                ▼
┌──────────────────────────────┐
│ Customer Verify Proxy        │
│ Customer AWS Account         │
│                              │
│ API Gateway / Lambda         │
│ customer IAM controls        │
│ CloudWatch logging           │
│ optional customer policies   │
└───────────────┬──────────────┘
                │
                │ approved capture request
                ▼
┌──────────────────────────────┐
│ Obligra Verify API           │
│                              │
│ authenticates request        │
│ receives decision record     │
│ returns capture status       │
└───────────────┬──────────────┘
                │
                │ retained record
                ▼
┌──────────────────────────────┐
│ Verify Decision Record Layer │
│                              │
│ retained decision records    │
│ retrieval and review support │
│ verification workflows       │
└──────────────────────────────┘
```

## Customer-Owned Proxy Flow

1. A customer application runs an AI-assisted workflow.
2. The application calls the Verify SDK.
3. The SDK sends the capture request to the customer-owned proxy endpoint.
4. The proxy runs inside the customer AWS account.
5. Customer controls may inspect, route, log, transform, or reject the request according to approved policy.
6. Approved capture requests are forwarded to the Obligra Verify API.
7. Verify returns capture status to the proxy.
8. The proxy returns the result to the customer application.

## When to Use the Standard Pattern

The standard SDK capture pattern is appropriate when:

* the customer application can communicate directly with the Verify API
* no customer-side relay is required
* the organization is comfortable with direct SDK-to-Verify capture
* the integration is being tested in sandbox or early preview environments

## When to Use the Customer-Owned Proxy Pattern

The customer-owned proxy pattern may be appropriate when:

* the customer requires an integration point inside their AWS account
* security teams require a customer-controlled relay
* network routing must pass through approved customer infrastructure
* additional policy checks are needed before capture
* application teams need a centralized integration point
* regulated workflows require stronger customer-side control

## Design Principles

The SDK follows several design principles:

* expose only the customer-facing capture model
* keep application integration simple
* avoid exposing internal Verify implementation details
* support stable workflow and retrieval identifiers
* support review-ready decision records
* allow future customer-controlled deployment patterns

## What the SDK Does

The SDK is responsible for:

* client configuration
* API key handling
* request validation
* decision record capture
* structured error handling
* safe retry behavior

## What the SDK Does Not Do

The SDK does not:

* replace the customer application
* replace the AI model
* perform model inference
* expose internal Verify platform mechanics
* define customer compliance policy
* decide what records an organization must retain

## Related Documentation

* Quick Start
* Configuration
* Capture Decision Record
* API Reference
* Errors and Retries
* FAQ
