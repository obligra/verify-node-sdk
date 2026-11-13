const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 0;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class VerifyError extends Error {
  constructor(message, { statusCode, code, retryable = false, outcomeUnknown = false, response } = {}) {
    super(message);
    this.name = "VerifyError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.outcomeUnknown = outcomeUnknown;
    this.response = response;
  }
}

export class VerifyClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.VERIFY_API_KEY;
    this.environment = options.environment || process.env.VERIFY_ENVIRONMENT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseUrl = (options.baseUrl || process.env.VERIFY_BASE_URL || "").replace(/\/+$/, "");
    this.enableLogging = options.enableLogging || false;

    this.validateConfig();
  }

  validateConfig() {
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 2147483647) {
      throw new VerifyError("timeoutMs must be an integer between 1 and 2147483647 milliseconds.", { code: "INVALID_TIMEOUT" });
    }
    if (!this.baseUrl) {
      throw new VerifyError(
        "Missing Verify API baseUrl. Set VERIFY_BASE_URL or pass baseUrl to VerifyClient. " +
        "Use the API-key capture origin supplied for your workspace; the SDK appends /decision-records.",
        { code: "MISSING_BASE_URL" }
      );
    }
    if (!this.apiKey) {
      throw new VerifyError("VERIFY_API_KEY is required. Pass apiKey in options or set VERIFY_API_KEY environment variable.", { code: "MISSING_API_KEY" });
    }
    if (!this.environment) {
      throw new VerifyError("Verify environment is required. Pass environment in options or set VERIFY_ENVIRONMENT environment variable.", { code: "MISSING_ENVIRONMENT" });
    }
    return true;
  }

  async health() {
    const url = `${this.baseUrl}/health`;
    try {
      const response = await this._fetch(url, { method: "GET" });
      return response;
    } catch (err) {
      return { status: "error", message: err.message, environment: this.environment };
    }
  }

  async captureDecisionRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new VerifyError("A decision record object is required.", { code: "INVALID_RECORD" });
    }
    if (!record.workflowId) {
      throw new VerifyError("workflowId is required.", { code: "MISSING_WORKFLOW_ID" });
    }

    // Validate for unknown/unsupported fields that indicate a misunderstanding of the API
    const UNSUPPORTED_FIELDS = {
      output: 'Unknown field "output". Use "response" for model output.',
      result: 'Unknown field "result". Use "response" for model output.',
      completion: 'Unknown field "completion". Use "response" for model output.',
      answer: 'Unknown field "answer". Use "response" for model output.',
      generation: 'Unknown field "generation". Use "response" for model output.',
    };
    for (const [field, message] of Object.entries(UNSUPPORTED_FIELDS)) {
      if (field in record) {
        throw new VerifyError(message, { code: "UNSUPPORTED_FIELD" });
      }
    }

    // Keep searchable references separate from submitted AI input/output.
    // Copy caller-owned maps; never truncate evidence or mutate input objects.
    const operationalContext = copyStringMap(record.operationalContext, "operationalContext");
    const aiAssistedContext = copyStringMap(record.aiAssistedContext, "aiAssistedContext");
    for (const field of ["retrievalKey", "decisionType"]) {
      if (record[field] !== undefined && !Object.hasOwn(operationalContext, field)) {
        operationalContext[field] = requireString(record[field], field);
      }
    }
    for (const [field, target] of [["prompt", "prompt"], ["response", "output"]]) {
      if (record[field] !== undefined && !Object.hasOwn(aiAssistedContext, target)) {
        aiAssistedContext[target] = requireString(record[field], field);
      }
    }
    const model = record.model === undefined ? {
      provider: record.metadata?.modelProvider ?? record.metadata?.provider ?? "unknown",
      modelId: record.metadata?.model ?? record.metadata?.modelId ?? "unknown",
    } : copyStringMap(record.model, "model");
    if (model.provider === undefined) model.provider = "unknown";
    if (model.modelId === undefined) model.modelId = "unknown";
    const payload = { workflowId: record.workflowId, operationalContext, aiAssistedContext, model };
    validatePayload(payload);

    const url = `${this.baseUrl}/decision-records`;
    // Capture is a write without a server idempotency contract. Even an
    // opted-in retry count must not repeat an uncertain capture automatically.
    try {
      const result = await this._fetch(url, { method: "POST", body: JSON.stringify(payload) }, 201);
      if (!result || typeof result !== "object" || Array.isArray(result) ||
          typeof result.decisionRecordId !== "string" || !result.decisionRecordId.trim()) {
        throw new VerifyError("The server did not return a capture receipt", {
          code: "CAPTURE_RESULT_UNCONFIRMED", outcomeUnknown: true,
        });
      }
      return { ...result, capturedAt: result.createdAt };
    } catch (err) {
      if (err instanceof VerifyError) {
        err.retryable = false;
        err.outcomeUnknown ||= err.code === "NETWORK_ERROR" || err.code === "TIMEOUT" ||
          err.statusCode === 408 || err.statusCode === 409 || err.statusCode >= 500;
        if (err.outcomeUnknown) err.message += ". The capture may have been saved; check Records before retrying.";
      }
      throw err;
    }
  }

  async _fetch(url, options = {}, expectedStatus) {
    const controller = new AbortController();
    const startedAt = performance.now();
    let response;
    const timeoutError = () => new VerifyError(`Request timed out after ${this.timeoutMs}ms`, {
      code: "TIMEOUT", statusCode: response?.status, retryable: true,
    });
    let timeout;
    // The deadline covers headers AND the full body. Racing also settles the
    // caller if a fetch wrapper ignores abort; a late response cannot win.
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        reject(timeoutError());
        controller.abort();
      }, this.timeoutMs);
    });

    const headers = {
      "Content-Type": "application/json",
      "X-Verify-Api-Key": this.apiKey,
    };

    try {
      if (this.enableLogging) {
        console.log(`[verify-sdk] ${options.method || "GET"} ${url}`);
      }
      const request = (async () => {
        // Redirects can resend POST bodies and credentials to another target.
        response = await fetch(url, { ...options, headers, signal: controller.signal, redirect: "error" });
        if (controller.signal.aborted) throw timeoutError();
        let body;
        try {
          body = await response.json();
        } catch (err) {
          // Invalid complete JSON is not a transport error; a truncated or
          // aborted stream is, and must keep the capture outcome uncertain.
          if (err.name !== "SyntaxError") throw err;
          body = null;
        }
        if (controller.signal.aborted || performance.now() - startedAt >= this.timeoutMs) {
          throw timeoutError();
        }
        if (response.ok) {
          if (expectedStatus !== undefined && response.status !== expectedStatus) {
            throw new VerifyError("The server did not confirm capture with HTTP 201", {
              code: "CAPTURE_RESULT_UNCONFIRMED", statusCode: response.status, outcomeUnknown: true,
            });
          }
          return body;
        }
        const statusCode = response.status;
        const retryable = RETRYABLE_STATUS_CODES.has(statusCode);
        const message = body?.message || body?.error || `HTTP ${statusCode}`;
        const code = body?.code || STATUS_CODE_MAP[statusCode] || "UNKNOWN_ERROR";
        throw new VerifyError(message, {
          statusCode, code, retryable, response: body, outcomeUnknown: body?.outcomeUnknown === true,
        });
      })();
      return await Promise.race([request, deadline]);
    } catch (err) {
      if (err instanceof VerifyError) throw err;
      if (controller.signal.aborted) throw timeoutError();
      throw new VerifyError(`Network error: ${err.message}`, {
        code: "NETWORK_ERROR", statusCode: response?.status, retryable: true,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function requireString(value, field) {
  if (typeof value !== "string") throw new VerifyError(`${field} must be a string.`, { code: "INVALID_FIELD" });
  return value;
}

function copyStringMap(value, field) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new VerifyError(`${field} must be a JSON object with string values.`, { code: "INVALID_FIELD" });
  }
  for (const entry of Object.values(value)) requireString(entry, field);
  return { ...value };
}

function validatePayload(payload) {
  const invalid = message => { throw new VerifyError(message, { code: "INVALID_FIELD" }); };
  if (typeof payload.workflowId !== "string" || !payload.workflowId.trim() || payload.workflowId.length > 128) {
    invalid("workflowId must be a non-empty string of up to 128 characters.");
  }
  const refs = Object.entries(payload.operationalContext);
  if (refs.length > 20) invalid("operationalContext supports up to 20 searchable references.");
  for (const [key, value] of refs) {
    if (key.length > 64 || value.length > 128) invalid("Reference names support up to 64 characters and values up to 128. Put AI input/output in aiAssistedContext.");
  }
  if (typeof payload.model.provider !== "string" || !payload.model.provider || payload.model.provider.length > 64 ||
      typeof payload.model.modelId !== "string" || !payload.model.modelId || payload.model.modelId.length > 128) {
    invalid("model.provider and model.modelId must be non-empty strings of up to 64 and 128 characters respectively.");
  }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > 256 * 1024) {
    throw new VerifyError("Decision record payload exceeds 256 KiB. No data was sent or truncated.", { code: "PAYLOAD_TOO_LARGE" });
  }
}

const STATUS_CODE_MAP = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  408: "REQUEST_TIMEOUT",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};
