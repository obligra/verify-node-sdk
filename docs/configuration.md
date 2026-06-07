# Configuration

This document explains how to configure the Obligra Verify Node.js SDK.

## Overview

The Verify SDK is configured through the `VerifyClient` constructor.

At minimum, a client requires:

* API Key
* Environment

Optional settings may be used to control request timeouts, retry behavior, logging, and advanced deployment scenarios.

## Basic Configuration

```javascript
import { VerifyClient } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});
```

## Configuration Options

| Option        | Type    | Required | Description                              |
| ------------- | ------- | -------- | ---------------------------------------- |
| apiKey        | string  | Yes      | Obligra Verify API key                   |
| environment   | string  | Yes      | Verify environment                       |
| timeoutMs     | number  | No       | Request timeout in milliseconds          |
| maxRetries    | number  | No       | Maximum retry attempts                   |
| baseUrl       | string  | No       | Custom endpoint for approved deployments |
| enableLogging | boolean | No       | Enables SDK diagnostic logging           |

## Environment Values

Supported environments:

```text
sandbox
production
```

Example:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "production"
});
```

## Environment Variables

Recommended configuration:

```bash
VERIFY_API_KEY=your_api_key
VERIFY_ENVIRONMENT=sandbox
```

Example usage:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: process.env.VERIFY_ENVIRONMENT
});
```

## Timeouts

The SDK supports configurable request timeouts.

Example:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  timeoutMs: 10000
});
```

The example above sets a timeout of:

```text
10 seconds
```

## Retry Configuration

Retry behavior helps protect against temporary service interruptions.

Example:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  maxRetries: 2
});
```

Recommended settings:

```text
maxRetries: 2
timeoutMs: 10000
```

## Logging

Diagnostic logging may be enabled during development.

Example:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  enableLogging: true
});
```

### Important

Do not enable verbose logging if logs may contain:

* customer identifiers
* prompts
* model outputs
* regulated data
* sensitive operational records

## Custom Endpoints

Advanced deployments may use a customer-owned Verify proxy or approved private integration endpoint.

Example:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
  baseUrl: "https://verify-proxy.example.com"
});
```

Custom endpoints should only be used when explicitly approved and documented.

## Security Best Practices

### Use Environment Variables

Recommended:

```bash
VERIFY_API_KEY=your_api_key
```

Avoid:

```javascript
const verify = new VerifyClient({
  apiKey: "hardcoded-api-key"
});
```

### Use a Secrets Manager

Production environments should store credentials in:

* AWS Secrets Manager
* AWS Systems Manager Parameter Store
* Azure Key Vault
* HashiCorp Vault
* equivalent enterprise secrets platform

### Protect Logs

Do not write the following to logs:

* API keys
* prompts
* model outputs
* customer records
* authentication tokens

## Example Production Configuration

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "production",
  timeoutMs: 10000,
  maxRetries: 2
});
```

## Validation Checklist

Before deploying:

* API key configured
* Environment configured
* Timeout configured
* Retry behavior reviewed
* Logging reviewed
* Secrets stored securely

## Related Documentation

* Quick Start
* Capture Decision Record
* API Reference
* Errors and Retries
* FAQ
