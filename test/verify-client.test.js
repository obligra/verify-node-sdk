import test from "node:test";
import assert from "node:assert/strict";
import { VerifyClient, VerifyError } from "../src/index.js";

// ─── Configuration Tests ─────────────────────────────────────────────────────

test("creates a Verify client with required options", () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test1234.secretvalue1234567890123456",
    environment: "sandbox",
    baseUrl: "https://api.obligra.ai/api/v1",
  });
  assert.equal(verify.environment, "sandbox");
  assert.equal(verify.baseUrl, "https://api.obligra.ai/api/v1");
});

test("throws when baseUrl is missing", () => {
  assert.throws(
    () => new VerifyClient({ apiKey: "obv_sandbox_test.secret", environment: "sandbox" }),
    (err) => err instanceof VerifyError && err.code === "MISSING_BASE_URL" && err.message.includes("VERIFY_BASE_URL")
  );
});

test("throws when apiKey is missing", () => {
  assert.throws(
    () => new VerifyClient({ environment: "sandbox", baseUrl: "https://mock.test" }),
    (err) => err instanceof VerifyError && err.code === "MISSING_API_KEY"
  );
});

test("throws when environment is missing", () => {
  assert.throws(
    () => new VerifyClient({ apiKey: "obv_sandbox_test.secret", baseUrl: "https://mock.test" }),
    (err) => err instanceof VerifyError && err.code === "MISSING_ENVIRONMENT"
  );
});

test("accepts custom baseUrl", () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret",
    environment: "sandbox",
    baseUrl: "https://custom-api.example.com/v1",
  });
  assert.equal(verify.baseUrl, "https://custom-api.example.com/v1");
});

test("strips trailing slash from baseUrl", () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret",
    environment: "sandbox",
    baseUrl: "https://api.example.com/v1/",
  });
  assert.equal(verify.baseUrl, "https://api.example.com/v1");
});

// ─── Validation Tests ────────────────────────────────────────────────────────

test("captureDecisionRecord throws when workflowId is missing", async () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });
  await assert.rejects(
    () => verify.captureDecisionRecord({ retrievalKey: "test" }),
    (err) => err instanceof VerifyError && err.code === "MISSING_WORKFLOW_ID"
  );
});

// ─── Mock HTTP Tests ─────────────────────────────────────────────────────────

test("successful capture returns real API response shape", async (t) => {
  const mockResponse = {
    decisionRecordId: "dr_abc123-def456",
    status: "recorded",
    verificationState: "not_verified",
    workflowId: "claim-review",
    environment: "sandbox",
    createdAt: "2026-06-06T12:00:00.000Z",
    retentionUntil: "2026-06-13T12:00:00.000Z",
    recordUrl: "https://console.obligra.ai/records/dr_abc123-def456",
    retrievalKeys: ["claim-12345", "ai-assisted-review"],
  };

  const verify = new VerifyClient({
    apiKey: "obv_sandbox_testprefix.testsecretvalue12345678901234",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    assert.equal(url, "https://mock.test/decision-records");
    assert.equal(opts.method, "POST");
    assert.equal(opts.headers["X-Verify-Api-Key"], "obv_sandbox_testprefix.testsecretvalue12345678901234");
    assert.equal(opts.headers["Content-Type"], "application/json");

    const body = JSON.parse(opts.body);
    assert.equal(body.workflowId, "claim-review");
    assert.ok(body.operationalContext);
    assert.ok(body.model);

    return { ok: true, status: 201, json: async () => mockResponse };
  };

  t.after(() => { globalThis.fetch = originalFetch; });

  const result = await verify.captureDecisionRecord({
    workflowId: "claim-review",
    retrievalKey: "claim-12345",
    decisionType: "ai-assisted-review",
    prompt: "Summarize this claim.",
    response: "Claim summary output.",
    metadata: { model: "claude-sonnet-4-20250514", modelProvider: "anthropic" },
  });

  assert.equal(result.decisionRecordId, "dr_abc123-def456");
  assert.equal(result.status, "recorded");
  assert.equal(result.verificationState, "not_verified");
  assert.equal(result.environment, "sandbox");
  assert.equal(result.capturedAt, "2026-06-06T12:00:00.000Z");
  assert.equal(result.retentionUntil, "2026-06-13T12:00:00.000Z");
  assert.ok(result.recordUrl);
  assert.ok(Array.isArray(result.retrievalKeys));
});

test("invalid API key returns 401 VerifyError", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_invalid.notarealkey",
    environment: "sandbox",
    baseUrl: "https://mock.test",
    maxRetries: 0,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: "unauthorized", message: "Invalid API key." }),
  });

  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => verify.captureDecisionRecord({
      workflowId: "test-flow",
      operationalContext: { test: "true" },
      model: { provider: "test", modelId: "test" },
    }),
    (err) => {
      assert.equal(err instanceof VerifyError, true);
      assert.equal(err.statusCode, 401);
      assert.equal(err.code, "UNAUTHORIZED");
      assert.equal(err.retryable, false);
      assert.equal(err.message, "Invalid API key.");
      return true;
    }
  );
});

test("429 rate limit is retryable", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
    maxRetries: 0,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: "rate_limited", message: "Too many requests." }),
  });

  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => verify.captureDecisionRecord({
      workflowId: "test-flow",
      operationalContext: { test: "true" },
      model: { provider: "test", modelId: "test" },
    }),
    (err) => {
      assert.equal(err instanceof VerifyError, true);
      assert.equal(err.statusCode, 429);
      assert.equal(err.retryable, true);
      return true;
    }
  );
});

test("network timeout throws retryable VerifyError", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
    timeoutMs: 50,
    maxRetries: 0,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    // Simulate timeout by waiting for abort
    return new Promise((_, reject) => {
      opts.signal.addEventListener("abort", () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  };

  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => verify.captureDecisionRecord({
      workflowId: "test-flow",
      operationalContext: { test: "true" },
      model: { provider: "test", modelId: "test" },
    }),
    (err) => {
      assert.equal(err instanceof VerifyError, true);
      assert.equal(err.code, "TIMEOUT");
      assert.equal(err.retryable, true);
      return true;
    }
  );
});

test("500 server error is retryable", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
    maxRetries: 0,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: "internal_server_error", message: "Unexpected server error." }),
  });

  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => verify.captureDecisionRecord({
      workflowId: "test-flow",
      operationalContext: { test: "true" },
      model: { provider: "test", modelId: "test" },
    }),
    (err) => {
      assert.equal(err instanceof VerifyError, true);
      assert.equal(err.statusCode, 500);
      assert.equal(err.code, "INTERNAL_ERROR");
      assert.equal(err.retryable, true);
      return true;
    }
  );
});

test("maps convenience fields to API payload correctly", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });

  let capturedBody;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, status: 201, json: async () => ({ decisionRecordId: "dr_test", createdAt: "2026-01-01T00:00:00Z" }) };
  };

  t.after(() => { globalThis.fetch = originalFetch; });

  await verify.captureDecisionRecord({
    workflowId: "loan-review",
    retrievalKey: "loan-99999",
    decisionType: "automated-decision",
    prompt: "Should we approve this loan?",
    response: "Approved based on credit score.",
    metadata: { model: "gpt-4", modelProvider: "openai" },
  });

  assert.equal(capturedBody.workflowId, "loan-review");
  assert.equal(capturedBody.operationalContext.retrievalKey, "loan-99999");
  assert.equal(capturedBody.operationalContext.decisionType, "automated-decision");
  assert.equal(capturedBody.operationalContext.prompt, "Should we approve this loan?");
  assert.equal(capturedBody.operationalContext.response, "Approved based on credit score.");
  assert.equal(capturedBody.model.provider, "openai");
  assert.equal(capturedBody.model.modelId, "gpt-4");
});

test("explicit operationalContext and model take precedence over convenience fields", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });

  let capturedBody;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, status: 201, json: async () => ({ decisionRecordId: "dr_test", createdAt: "2026-01-01T00:00:00Z" }) };
  };

  t.after(() => { globalThis.fetch = originalFetch; });

  await verify.captureDecisionRecord({
    workflowId: "test",
    operationalContext: { customField: "customValue", retrievalKey: "explicit-key" },
    model: { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
    retrievalKey: "should-be-ignored",
  });

  // Explicit operationalContext.retrievalKey should not be overwritten
  assert.equal(capturedBody.operationalContext.retrievalKey, "explicit-key");
  assert.equal(capturedBody.operationalContext.customField, "customValue");
  assert.equal(capturedBody.model.provider, "anthropic");
  assert.equal(capturedBody.model.modelId, "claude-sonnet-4-20250514");
});

// ─── Field Validation Tests ──────────────────────────────────────────────────

test("throws UNSUPPORTED_FIELD for 'output' — use 'response' instead", () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });
  assert.rejects(
    () => verify.captureDecisionRecord({ workflowId: "test", output: "some output" }),
    (err) => err instanceof VerifyError && err.code === "UNSUPPORTED_FIELD" && err.message.includes('"output"') && err.message.includes('"response"')
  );
});

test("throws UNSUPPORTED_FIELD for 'result' — use 'response' instead", () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });
  assert.rejects(
    () => verify.captureDecisionRecord({ workflowId: "test", result: "some result" }),
    (err) => err instanceof VerifyError && err.code === "UNSUPPORTED_FIELD" && err.message.includes('"result"') && err.message.includes('"response"')
  );
});

test("throws UNSUPPORTED_FIELD for 'completion' — use 'response' instead", () => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });
  assert.rejects(
    () => verify.captureDecisionRecord({ workflowId: "test", completion: "some completion" }),
    (err) => err instanceof VerifyError && err.code === "UNSUPPORTED_FIELD" && err.message.includes('"completion"') && err.message.includes('"response"')
  );
});

test("'response' field maps correctly to operationalContext.response", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });

  let capturedBody;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, status: 201, json: async () => ({ decisionRecordId: "dr_test", createdAt: "2026-01-01T00:00:00Z" }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await verify.captureDecisionRecord({
    workflowId: "test",
    response: "The model generated this response.",
    model: { provider: "test", modelId: "test" },
  });

  assert.equal(capturedBody.operationalContext.response, "The model generated this response.");
});

test("'prompt' field maps correctly to operationalContext.prompt", async (t) => {
  const verify = new VerifyClient({
    apiKey: "obv_sandbox_test.secret1234567890123456789012",
    environment: "sandbox",
    baseUrl: "https://mock.test",
  });

  let capturedBody;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return { ok: true, status: 201, json: async () => ({ decisionRecordId: "dr_test", createdAt: "2026-01-01T00:00:00Z" }) };
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  await verify.captureDecisionRecord({
    workflowId: "test",
    prompt: "Summarize this document.",
    model: { provider: "test", modelId: "test" },
  });

  assert.equal(capturedBody.operationalContext.prompt, "Summarize this document.");
});
