# Configuration

This unreleased capture correction has been tested on Node.js 22 and 24. The package still declares Node.js 18+, but that runtime remains unvalidated for this candidate. Three options are required, directly or through environment variables:

```javascript
import { VerifyClient } from "@obligra/verify-sdk";
const verify = new VerifyClient({
  apiKey: process.env.VERIFY_API_KEY,
  environment: process.env.VERIFY_ENVIRONMENT,
  baseUrl: process.env.VERIFY_BASE_URL,
  timeoutMs: 10000,
});
```

Use `sandbox` as the API's internal value for Test. The API key determines the actual workspace and environment; the `environment` option does not switch the key's scope. Do not infer Production access from a string setting.

The API-key capture base URL for the existing deployment is `https://api.obligra.ai`; the SDK appends `/decision-records`. `/api/v1` is used by the separate Cognito-authenticated console routes. Custom approved deployments may supply their own base URL. Do not put keys in URLs.

Use the final endpoint directly. HTTP redirects are rejected so they cannot resend a capture body or key to another target.

`timeoutMs` defaults to 10000 and must be an integer from 1 to 2147483647. It is a total request deadline covering connection, headers and body consumption. Stalled or interrupted responses leave the capture outcome unknown. A blocked JavaScript event loop can delay timer delivery; a response observed past the deadline is not accepted as success.

`maxRetries` is retained for compatibility but never repeats captures. `enableLogging` defaults to false; it logs method/URL, not headers or payloads. Keep URLs free of sensitive information and do not print error response bodies or application secrets.

The SDK does not load `.env`. Inject/export variables before starting Node, or use `node --env-file=.env server.mjs` on Node.js 20.6+. A file alone does not populate `process.env`.

The key needs `records:write`. Record retrieval and integrity checks require Console Cognito authentication; the capture key and `environment` label do not provide it.

Keep keys in an approved server-side secret mechanism, out of source control, browser code/storage, screenshots and recordings. This documentation does not authorize creating, saving or moving a key. Authenticated acceptance of this candidate is pending.
