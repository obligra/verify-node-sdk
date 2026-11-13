import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { VerifyClient } from "../src/index.js";

const record = { workflowId: "fictional-deadline-test" };
const receipt = { decisionRecordId: "dr_fixture", createdAt: "2026-11-13T00:00:00Z" };
const options = { apiKey: "offline-fixture-not-a-real-key", environment: "sandbox", maxRetries: 3 };

async function serverFixture(t, handler) {
  let requests = 0;
  const server = createServer((request, response) => {
    requests++;
    request.resume();
    handler(request, response);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, requests: () => requests };
}

for (const mode of ["headers only", "slow trickle", "late receipt", "no headers"]) {
  test(`total deadline rejects ${mode} with one native HTTP request`, { timeout: 3000 }, async t => {
    const fixture = await serverFixture(t, (_request, response) => {
      if (mode !== "no headers") {
        response.writeHead(201, { "Content-Type": "application/json" });
        response.flushHeaders();
      }
      if (mode === "slow trickle") {
        response.write("{");
        const interval = setInterval(() => response.write(" "), 15);
        response.on("close", () => clearInterval(interval));
      }
      // Finite fallbacks also make this regression fail on the original SDK.
      const timer = setTimeout(() => response.end(mode === "headers only" ? "" : mode === "slow trickle" ? '"decisionRecordId":"dr_late"}' : JSON.stringify(receipt)), 600);
      response.on("close", () => clearTimeout(timer));
    });
    const start = performance.now();
    await assert.rejects(new VerifyClient({ ...options, baseUrl: fixture.baseUrl, timeoutMs: 100 }).captureDecisionRecord(record), error => {
      assert.equal(error.code, "TIMEOUT");
      assert.equal(error.outcomeUnknown, true);
      assert.equal(error.retryable, false);
      assert.match(error.message, /check Records before retrying/);
      return true;
    });
    assert.ok(performance.now() - start < 500, "the total deadline must include response consumption");
    assert.equal(fixture.requests(), 1);
  });
}

test("interrupted response body is a network failure with unknown capture outcome", { timeout: 3000 }, async t => {
  const fixture = await serverFixture(t, (_request, response) => {
    response.writeHead(201, { "Content-Type": "application/json" });
    response.write('{"decisionRecordId":');
    setTimeout(() => response.destroy(), 30);
  });
  await assert.rejects(new VerifyClient({ ...options, baseUrl: fixture.baseUrl, timeoutMs: 1000 }).captureDecisionRecord(record), {
    code: "NETWORK_ERROR", statusCode: 201, outcomeUnknown: true, retryable: false,
  });
  assert.equal(fixture.requests(), 1);
});

test("complete malformed JSON stays unconfirmed instead of inventing a receipt", async t => {
  const fixture = await serverFixture(t, (_request, response) => {
    response.writeHead(201, { "Content-Type": "application/json" });
    response.end("not JSON");
  });
  await assert.rejects(new VerifyClient({ ...options, baseUrl: fixture.baseUrl }).captureDecisionRecord(record), {
    code: "CAPTURE_RESULT_UNCONFIRMED", outcomeUnknown: true, retryable: false,
  });
  assert.equal(fixture.requests(), 1);
});

test("a complete native receipt settles and clears its deadline", async t => {
  const fixture = await serverFixture(t, (_request, response) => {
    response.writeHead(201, { "Content-Type": "application/json" });
    response.end(JSON.stringify(receipt));
  });
  const result = await new VerifyClient({ ...options, baseUrl: fixture.baseUrl, timeoutMs: 100 }).captureDecisionRecord(record);
  assert.deepEqual(result, { ...receipt, capturedAt: receipt.createdAt });
  await delay(130);
  assert.equal(fixture.requests(), 1);
});

for (const phase of ["fetch", "body"]) {
  test(`deadline settles even if ${phase} ignores abort; late result cannot become success`, async t => {
    const original = globalThis.fetch;
    t.after(() => { globalThis.fetch = original; });
    let requests = 0, signal, complete;
    const pending = new Promise(resolve => { complete = resolve; });
    globalThis.fetch = async (_url, config) => {
      requests++;
      signal = config.signal;
      if (phase === "fetch") return pending;
      return { ok: true, status: 201, json: () => pending };
    };
    const capture = new VerifyClient({ ...options, baseUrl: "https://fixture.invalid", timeoutMs: 25 }).captureDecisionRecord(record);
    // A late fallback prevents the original buggy implementation hanging this test.
    const late = setTimeout(() => complete(phase === "fetch" ? { ok: true, status: 201, json: async () => receipt } : receipt), 300);
    t.after(() => clearTimeout(late));
    await assert.rejects(capture, { code: "TIMEOUT", outcomeUnknown: true, retryable: false });
    assert.equal(signal.aborted, true);
    complete(phase === "fetch" ? { ok: true, status: 201, json: async () => receipt } : receipt);
    await delay(10);
    await assert.rejects(capture, { code: "TIMEOUT" });
    assert.equal(requests, 1);
  });
}

test("a completed request clears its timer without aborting its signal later", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let signal;
  globalThis.fetch = async (_url, options) => {
    signal = options.signal;
    return { ok: true, status: 201, json: async () => receipt };
  };
  await new VerifyClient({ ...options, baseUrl: "https://fixture.invalid", timeoutMs: 25 }).captureDecisionRecord(record);
  await delay(50);
  assert.equal(signal.aborted, false);
});

test("a complete non-JSON rejection preserves its HTTP status", async t => {
  const fixture = await serverFixture(t, (_request, response) => {
    response.writeHead(401, { "Content-Type": "text/html" });
    response.end("unauthorized");
  });
  await assert.rejects(new VerifyClient({ ...options, baseUrl: fixture.baseUrl }).captureDecisionRecord(record), {
    code: "UNAUTHORIZED", statusCode: 401, outcomeUnknown: false, retryable: false,
  });
  assert.equal(fixture.requests(), 1);
});

test("health still accepts HTTP 200 without capture receipt requirements", async t => {
  const fixture = await serverFixture(t, (_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end('{"status":"ok"}');
  });
  assert.deepEqual(await new VerifyClient({ ...options, baseUrl: fixture.baseUrl }).health(), { status: "ok" });
});

for (const status of [307, 308]) {
  test(`HTTP ${status} cannot resend a capture through a redirect`, async t => {
    const fixture = await serverFixture(t, (_request, response) => {
      response.writeHead(status, { Location: "/redirected" });
      response.end();
    });
    await assert.rejects(new VerifyClient({ ...options, baseUrl: fixture.baseUrl }).captureDecisionRecord(record), {
      code: "NETWORK_ERROR", outcomeUnknown: true, retryable: false,
    });
    assert.equal(fixture.requests(), 1);
  });
}

for (const timeoutMs of [0, -1, NaN, Infinity, "100", 2147483648, 0.5]) {
  test(`rejects unsupported timeoutMs=${timeoutMs} before HTTP`, () => {
    assert.throws(() => new VerifyClient({ ...options, baseUrl: "https://fixture.invalid", timeoutMs }), { code: "INVALID_TIMEOUT" });
  });
}
