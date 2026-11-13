// Explicitly running this example saves one fictional Test record. No model is called.
import { VerifyClient, VerifyError } from "../../src/index.js";

try {
  const verify = new VerifyClient({
    apiKey: process.env.VERIFY_API_KEY,
    baseUrl: process.env.VERIFY_BASE_URL,
    environment: process.env.VERIFY_ENVIRONMENT || "sandbox",
  });
  const result = await verify.captureDecisionRecord({
    workflowId: "fictional-claim-review",
    retrievalKey: "fictional-claim-001",
    decisionType: "ai-assisted-review",
    prompt: "Summarize this claim for review.",
    response: "The claim appears eligible for additional review.",
    operationalContext: {
      application: "claims-platform",
      userRole: "claims-reviewer",
    },
    model: {
      provider: "synthetic",
      modelId: "no-model-call",
    },
  });

  console.log("Decision record captured:");
  console.log(`  ID: ${result.decisionRecordId}`);
  console.log(`  Status: ${result.status ?? "not returned"}`);
  console.log(`  Verification: ${result.verificationState ?? "not returned"}`);
  console.log(`  Created: ${result.capturedAt ?? "not returned"}`);
  console.log(`  Retained until: ${result.retentionUntil ?? "not returned"}`);
  console.log("  Find this ID in the same workspace and Test environment in Verify Console.");
} catch (err) {
  if (err instanceof VerifyError) {
    console.error(`Verify error [${err.code}], HTTP ${err.statusCode ?? "unavailable"}`);
    if (err.outcomeUnknown) console.error("Capture outcome unknown. Check saved Records before another attempt.");
  } else {
    console.error("Unexpected error. No automatic retry was made.");
  }
  process.exit(1);
}
