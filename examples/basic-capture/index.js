import { VerifyClient, VerifyError } from "../../src/index.js";

const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: process.env.VERIFY_ENVIRONMENT || "sandbox",
});

try {
  const result = await verify.captureDecisionRecord({
    workflowId: "claim-review",
    retrievalKey: "claim-12345",
    decisionType: "ai-assisted-review",
    prompt: "Summarize this claim for review.",
    response: "The claim appears eligible for additional review.",
    operationalContext: {
      application: "claims-platform",
      userRole: "claims-reviewer",
    },
    model: {
      provider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
    },
  });

  console.log("Decision record captured:");
  console.log(`  ID: ${result.decisionRecordId}`);
  console.log(`  Status: ${result.status}`);
  console.log(`  Verification: ${result.verificationState}`);
  console.log(`  Created: ${result.capturedAt}`);
  console.log(`  Retained until: ${result.retentionUntil}`);
  console.log(`  View: ${result.recordUrl}`);
} catch (err) {
  if (err instanceof VerifyError) {
    console.error(`Verify error [${err.code}]: ${err.message}`);
    if (err.retryable) console.error("  (retryable)");
  } else {
    console.error("Unexpected error:", err.message);
  }
  process.exit(1);
}
