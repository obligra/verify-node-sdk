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
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseUrl = (options.baseUrl || process.env.VERIFY_BASE_URL || "").replace(/\/+$/, "");
    this.enableLogging = options.enableLogging || false;

    this.validateConfig();
  }

  validateConfig() {
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
      const result = await this._fetch(url, { method: "POST", body: JSON.stringify(payload) });
      if (!result || typeof result.decisionRecordId !== "string" || !result.decisionRecordId.trim()) {
        throw new VerifyError("The server did not return a capture receipt", {
          code: "CAPTURE_RESULT_UNCONFIRMED", outcomeUnknown: true,
        });
      }
      return { ...result, capturedAt: result.createdAt };
    } catch (err) {
      if (err instanceof VerifyError) {
        err.retryable = false;
        err.outcomeUnknown ||= err.code === "NETWORK_ERROR" || err.code === "TIMEOUT" || err.statusCode >= 500;
        if (err.outcomeUnknown) err.message += ". The capture may have been saved; check Records before retrying.";
      }
      throw err;
    }
  }

  async _fetch(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers = {
      "Content-Type": "application/json",
      "X-Verify-Api-Key": this.apiKey,
    };

    if (this.enableLogging) {
      console.log(`[verify-sdk] ${options.method || "GET"} ${url}`);
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new VerifyError(`Request timed out after ${this.timeoutMs}ms`, { code: "TIMEOUT", retryable: true });
      }
      throw new VerifyError(`Network error: ${err.message}`, { code: "NETWORK_ERROR", retryable: true });
    } finally {
      clearTimeout(timeout);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (response.ok) {
      return body;
    }

    const statusCode = response.status;
    const retryable = RETRYABLE_STATUS_CODES.has(statusCode);
    const message = body?.message || body?.error || `HTTP ${statusCode}`;
    const code = body?.code || STATUS_CODE_MAP[statusCode] || "UNKNOWN_ERROR";

    throw new VerifyError(message, { statusCode, code, retryable, response: body });
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
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};
