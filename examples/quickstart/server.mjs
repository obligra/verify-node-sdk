/**
 * Obligra Verify SDK — Quickstart Example
 *
 * This file uses .mjs so it works from any Node.js project
 * regardless of package.json "type" setting.
 *
 * Setup:
 *   npm install github:obligra/verify-node-sdk
 *
 * Run:
 *   VERIFY_BASE_URL=https://verify-console.preview.emergentagent.com/api/v1 \
 *   VERIFY_API_KEY=obv_sandbox_YOUR.KEY \
 *   node server.mjs
 */

import { VerifyClient, VerifyError } from "@obligra/verify-sdk";

const verify = new VerifyClient({
  baseUrl: process.env.VERIFY_BASE_URL,
  apiKey: process.env.VERIFY_API_KEY,
  environment: "sandbox",
});

try {
  const result = await verify.captureDecisionRecord({
    workflowId: "quickstart-test",
    prompt: "Summarize this claim for review.",
    response: "Based on the documentation provided, this claim meets approval criteria.",
    operationalContext: {
      claimId: "claim-12345",
      reviewType: "ai-assisted",
      outcome: "approved",
    },
    model: {
      provider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
    },
  });

  console.log("✓ Decision record captured successfully");
  console.log(`  ID: ${result.decisionRecordId}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  View: ${result.recordUrl || "(available in console)"}`);
} catch (err) {
  if (err instanceof VerifyError) {
    console.error(`✗ Verify error [${err.code}]: ${err.message}`);
    if (err.statusCode === 401) {
      console.error("  → Check your VERIFY_API_KEY is valid and active");
    }
  } else {
    console.error("✗ Unexpected error:", err.message);
  }
  process.exit(1);
}
