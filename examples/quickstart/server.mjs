/**
 * Obligra Verify SDK — Quickstart Example
 *
 * This file uses .mjs so it works from any Node.js project
 * regardless of package.json "type" setting.
 *
 * Setup:
 *   npm install github:obligra/verify-node-sdk#REVIEWED_COMMIT
 *
 * Configure VERIFY_API_KEY through your approved server-side secret mechanism.
 * Use a Test key with records:write. Set VERIFY_BASE_URL=https://api.obligra.ai.
 * Run once: node server.mjs
 * For an approved .env file on Node.js 20.6+: node --env-file=.env server.mjs
 * The SDK does not load .env automatically. No model is called.
 */

import { VerifyClient, VerifyError } from "@obligra/verify-sdk";

try {
  const verify = new VerifyClient({
    baseUrl: process.env.VERIFY_BASE_URL,
    apiKey: process.env.VERIFY_API_KEY,
    environment: "sandbox",
  });
  const result = await verify.captureDecisionRecord({
    workflowId: "fictional-first-record",
    retrievalKey: "fictional-case-001",
    prompt: "Summarize the fictional case for review.",
    response: "This fictional case needs a reviewer. No model was called.",
    model: {
      provider: "synthetic",
      modelId: "no-model-call",
    },
  });

  console.log("✓ Decision record captured successfully");
  console.log(`  ID: ${result.decisionRecordId}`);
  console.log(`  Created: ${result.createdAt ?? "not returned"}`);
  console.log(`  Status: ${result.status ?? "not returned"}`);
  console.log("  Find this ID in the same workspace and Test environment in Verify Console.");
} catch (err) {
  if (err instanceof VerifyError) {
    console.error(`✗ Verify error [${err.code}], HTTP ${err.statusCode ?? "unavailable"}`);
    if (err.outcomeUnknown) console.error("Capture outcome unknown. Check saved Records before another attempt.");
    if (err.statusCode === 401) {
      console.error("  → Check your VERIFY_API_KEY is valid and active");
    }
  } else {
    console.error("✗ Unexpected error. No automatic retry was made.");
  }
  process.exit(1);
}
