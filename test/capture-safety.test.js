import test from "node:test";
import assert from "node:assert/strict";
import { VerifyClient } from "../src/index.js";

const options = { apiKey: "offline-fixture-not-a-real-key", environment: "sandbox", baseUrl: "https://sdk-fixture.invalid" };
function fixture(t, responder) {
  const requests = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, config) => {
    requests.push({ url, ...config, payload: JSON.parse(config.body) });
    if (responder) return responder();
    return { ok: true, status: 201, json: async () => ({ decisionRecordId: "dr_fixture", createdAt: "2026-11-03T00:00:00Z" }) };
  };
  t.after(() => { globalThis.fetch = original; });
  return requests;
}

test("retains long AI input/output losslessly and keeps them out of searchable references", async t => {
  const requests = fixture(t);
  const prompt = "p".repeat(513), response = "r".repeat(1024);
  await new VerifyClient(options).captureDecisionRecord({ workflowId: "fictional", retrievalKey: "case-001", prompt, response });
  assert.deepEqual(requests[0].payload.operationalContext, { retrievalKey: "case-001" });
  assert.deepEqual(requests[0].payload.aiAssistedContext, { prompt, output: response });
});

test("preserves explicit AI context including empty strings without mutating frozen caller data", async t => {
  const requests = fixture(t);
  const input = Object.freeze({ workflowId: "fictional", operationalContext: Object.freeze({ caseRef: "case-001" }),
    model: Object.freeze({ provider: "synthetic", modelId: "no-model-call" }),
    aiAssistedContext: Object.freeze({ prompt: "", output: "explicit", context: "additional" }), prompt: "fallback", response: "fallback" });
  await new VerifyClient(options).captureDecisionRecord(input);
  assert.deepEqual(requests[0].payload.aiAssistedContext, { prompt: "", output: "explicit", context: "additional" });
  assert.deepEqual(input.operationalContext, { caseRef: "case-001" });
});

test("missing model details use a copied default without modifying the caller", async t => {
  const requests = fixture(t);
  const model = Object.freeze({});
  const context = Object.freeze({});
  await new VerifyClient(options).captureDecisionRecord({ workflowId: "fictional", model, operationalContext: context, prompt: "fictional" });
  assert.deepEqual(requests[0].payload.model, { provider: "unknown", modelId: "unknown" });
  assert.deepEqual(model, {});
  assert.deepEqual(context, {});
});

for (const record of [null, [], "text", { workflowId: " " }, { workflowId: "x".repeat(129) },
  { workflowId: "fictional", operationalContext: { ref: "x".repeat(129) } },
  { workflowId: "fictional", operationalContext: { ref: 42 } },
  { workflowId: "fictional", operationalContext: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`r${i}`, "short"])) },
  { workflowId: "fictional", aiAssistedContext: { prompt: {} } },
  { workflowId: "fictional", response: 42 }, { workflowId: "fictional", model: null }]) {
  test(`rejects invalid capture input before HTTP: ${JSON.stringify(record)?.slice(0,65)}`, async t => {
    const requests = fixture(t);
    await assert.rejects(new VerifyClient(options).captureDecisionRecord(record));
    assert.equal(requests.length, 0);
  });
}

test("rejects payloads over 256 KiB without silently cutting multibyte text", async t => {
  const requests = fixture(t);
  await assert.rejects(new VerifyClient(options).captureDecisionRecord({ workflowId: "fictional", prompt: "界".repeat(90000) }), { code: "PAYLOAD_TOO_LARGE" });
  assert.equal(requests.length, 0);
});

for (const failure of ["network", 500, 502, 503, 504, 429]) {
  test(`capture attempts only once for ${failure}, even with maxRetries supplied`, async t => {
    const requests = fixture(t, () => {
      if (failure === "network") throw new Error("simulated lost response");
      return { ok: false, status: failure, json: async () => ({ message: "Fixture failure" }) };
    });
    await assert.rejects(new VerifyClient({ ...options, maxRetries: 3 }).captureDecisionRecord({ workflowId: "fictional" }), error => {
      assert.equal(error.retryable, false);
      assert.equal(error.outcomeUnknown, failure !== 429);
      if (error.outcomeUnknown) assert.match(error.message, /check Records before retrying/);
      return true;
    });
    assert.equal(requests.length, 1);
  });
}

for (const receipt of [null, {}, { decisionRecordId: "" }]) {
  test(`HTTP success without a receipt stays unconfirmed: ${JSON.stringify(receipt)}`, async t => {
    const requests = fixture(t, () => ({ ok: true, status: 201, json: async () => receipt }));
    await assert.rejects(new VerifyClient(options).captureDecisionRecord({ workflowId: "fictional" }), { code: "CAPTURE_RESULT_UNCONFIRMED", outcomeUnknown: true, retryable: false });
    assert.equal(requests.length, 1);
  });
}

test("a receipt without a saved timestamp does not invent a capture time or status", async t => {
  fixture(t, () => ({ ok: true, status: 201, json: async () => ({ decisionRecordId: "dr_fixture" }) }));
  const result = await new VerifyClient(options).captureDecisionRecord({ workflowId: "fictional" });
  assert.equal(result.capturedAt, undefined);
  assert.equal(result.status, undefined);
});

test("normalizes repeated trailing slashes and uses only the API-key header", async t => {
  const requests = fixture(t);
  await new VerifyClient({ ...options, baseUrl: options.baseUrl + "///" }).captureDecisionRecord({ workflowId: "fictional" });
  assert.equal(requests[0].url, "https://sdk-fixture.invalid/decision-records");
  assert.equal(requests[0].headers.Authorization, undefined);
  assert.equal(requests[0].headers["X-Verify-Api-Key"], options.apiKey);
});
