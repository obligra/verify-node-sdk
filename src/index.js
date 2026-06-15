const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export class VerifyError extends Error {
  constructor(message, { statusCode, code, retryable = false, response } = {}) {
    super(message);
    this.name = "VerifyError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.response = response;
  }
}

export class VerifyClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.VERIFY_API_KEY;
    this.environment = options.environment || process.env.VERIFY_ENVIRONMENT;
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseUrl = (options.baseUrl || process.env.VERIFY_BASE_URL || "").replace(/\/$/, "");
    this.enableLogging = options.enableLogging || false;

    this.validateConfig();
  }

  validateConfig() {
    if (!this.baseUrl) {
      throw new VerifyError(
        "Missing Verify API baseUrl. Set VERIFY_BASE_URL or pass baseUrl to VerifyClient. " +
        "For preview, use https://verify-console.preview.emergentagent.com/api/v1. " +
        "For production, use https://api.obligra.ai/api/v1.",
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

    // Build payload aligned to Verify API contract
    const payload = {
      workflowId: record.workflowId,
      operationalContext: record.operationalContext || {},
      model: record.model || {},
    };

    // Map SDK convenience fields to operationalContext
    if (record.retrievalKey && !payload.operationalContext.retrievalKey) {
      payload.operationalContext.retrievalKey = record.retrievalKey;
    }
    if (record.decisionType && !payload.operationalContext.decisionType) {
      payload.operationalContext.decisionType = record.decisionType;
    }
    if (record.prompt && !payload.operationalContext.prompt) {
      payload.operationalContext.prompt = typeof record.prompt === "string" ? record.prompt.slice(0, 512) : String(record.prompt).slice(0, 512);
    }
    if (record.response && !payload.operationalContext.response) {
      payload.operationalContext.response = typeof record.response === "string" ? record.response.slice(0, 512) : String(record.response).slice(0, 512);
    }

    // Map metadata to model if model not explicitly set
    if (record.metadata && !record.model) {
      payload.model = {
        provider: record.metadata.modelProvider || record.metadata.provider || "unknown",
        modelId: record.metadata.model || record.metadata.modelId || "unknown",
      };
    }

    // Ensure model has required fields
    if (!payload.model.provider) payload.model.provider = "unknown";
    if (!payload.model.modelId) payload.model.modelId = "unknown";

    const url = `${this.baseUrl}/decision-records`;
    const result = await this._fetchWithRetry(url, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return {
      ...result,
      decisionRecordId: result.decisionRecordId,
      status: result.status || "recorded",
      capturedAt: result.createdAt || new Date().toISOString(),
    };
  }

  async _fetchWithRetry(url, options, attempt = 0) {
    try {
      return await this._fetch(url, options);
    } catch (err) {
      if (err.retryable && attempt < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        if (this.enableLogging) {
          console.warn(`[verify-sdk] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, options, attempt + 1);
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
