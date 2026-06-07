# Frequently Asked Questions

# General Questions

## What is Obligra Verify?

Obligra Verify is decision record infrastructure for AI-assisted workflows.

Verify helps organizations capture, retain, retrieve, and review records associated with AI-assisted operational decisions.

As AI becomes part of operational workflows, organizations increasingly need a durable record of what occurred, what information was provided, what output was generated, and what workflow context existed at the time.

Verify is designed to preserve those records for future review.

---

## What problem does Verify solve?

Many organizations can generate AI outputs.

Far fewer can answer questions such as:

* What prompt generated this output?
* Which model produced this result?
* What workflow was involved?
* What information was available at the time?
* What output was actually returned?
* Can we retrieve the original record later?

Verify helps preserve decision records so organizations can retrieve evidence rather than reconstruct events from incomplete logs.

---

## What is a decision record?

A decision record is a retained record associated with an AI-assisted workflow.

A decision record may include:

* workflow identifier
* retrieval identifier
* AI input
* AI output
* workflow metadata
* operational context
* timestamps

Decision records provide a durable reference point for future review.

---

## Is Verify an AI model?

No.

Verify does not replace foundation models, LLMs, or AI applications.

Verify is infrastructure that operates alongside AI-assisted workflows.

---

## Is Verify an observability platform?

No.

Observability platforms focus on telemetry, metrics, traces, and operational monitoring.

Verify focuses on retained decision records associated with AI-assisted workflows.

---

## Is Verify a logging platform?

No.

Logs show activity.

Verify preserves decision records.

While logs may contain fragments of information, Verify is designed to retain workflow-linked decision records that can later be retrieved and reviewed.

---

# Developer Questions

## What does the SDK do?

The SDK allows applications to capture retained decision records with Verify.

Typical SDK responsibilities include:

* API authentication
* decision record capture
* workflow metadata handling
* retry handling
* structured error handling

---

## What languages will be supported?

Planned SDK support includes:

* Node.js
* Python
* Java
* .NET
* Go

Node.js is the initial reference SDK.

---

## Do I need an Obligra Verify account?

Yes.

Production use requires an approved Verify account and API credentials.

---

## How do I authenticate?

Authentication is performed using a Verify API key.

Example:

```javascript
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox"
});
```

---

## Where should API keys be stored?

Recommended locations include:

* AWS Secrets Manager
* AWS Systems Manager Parameter Store
* Azure Key Vault
* HashiCorp Vault
* equivalent enterprise secrets management systems

Do not hardcode API keys in source code.

---

# Architecture Questions

## Does Verify store my application source code?

No.

Verify is designed to capture decision records associated with AI-assisted workflows.

Application source code remains under customer control.

---

## Does Verify require a specific AI model?

No.

Verify is designed to support AI-assisted workflows regardless of model provider.

Examples may include:

* Anthropic
* OpenAI
* Google
* AWS Bedrock
* Azure OpenAI
* internally hosted models

Verify focuses on the workflow record rather than a specific model vendor.

---

## Can Verify work with customer-owned AWS environments?

Yes.

Verify is being designed to support customer-controlled deployment patterns.

Organizations may choose to deploy integration components inside their own AWS environments.

---

## What is the Verify Proxy?

The Verify Proxy is a planned deployment pattern that allows organizations to place a customer-controlled integration layer between their applications and Verify.

This approach may be useful for organizations with strict governance, security, privacy, or operational requirements.

Deployment guidance will be published separately.

---

## Will CloudFormation templates be provided?

Yes.

Planned deployment assets include CloudFormation templates that simplify deployment of Verify integration components inside customer AWS environments.

---

## Will CDK support be available?

Possibly.

CloudFormation templates are currently prioritized.

CDK reference implementations may be provided in future releases.

---

# Security Questions

## Does Verify expose internal platform mechanics?

No.

The SDK exposes only customer-facing capabilities.

Internal platform implementation details are not exposed through public SDK interfaces.

---

## How should customer data be protected?

Organizations should follow their existing security, compliance, and governance requirements.

Recommended practices include:

* secure credential management
* encryption
* least privilege access
* data retention governance
* secure logging practices

---

## Should prompts and outputs be logged?

Organizations should review internal policies before logging prompts or model outputs.

Verify does not require organizations to expose prompts or outputs through application logs.

---

## Is Verify intended for regulated environments?

Verify is being designed with operational accountability, reviewability, and governance requirements in mind.

Organizations remain responsible for ensuring compliance with applicable regulatory requirements.

---

# Operational Questions

## What industries is Verify designed for?

Verify is applicable anywhere AI-assisted workflows participate in operational processes.

Examples include:

* healthcare
* telehealth
* insurance
* financial services
* audit and assurance
* customer operations
* fraud analysis
* workflow automation

---

## Why is retrieval important?

Organizations often discover they need information months after an event occurred.

Without a retained record, teams frequently attempt to reconstruct events using:

* logs
* screenshots
* emails
* tickets
* memory

Verify is designed to support retrieval of retained records rather than reconstruction from fragments.

---

## Is Verify production ready?

The SDK is currently in early integration preview.

Public interfaces, deployment models, and supported capabilities may evolve before general availability.

---

## Where can I get help?

General support:

[support@obligra.ai](mailto:support@obligra.ai)

Security issues:

[security@obligra.ai](mailto:security@obligra.ai)

Do not include API keys, secrets, customer records, prompts, model outputs, or regulated data in support requests unless explicitly requested through an approved secure process.

---

# Additional Resources

* Quick Start
* Configuration
* Capture Decision Record
* API Reference
* Errors and Retries
* CloudFormation Deployment Guide (planned)
