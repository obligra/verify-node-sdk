# Configuration

This unreleased capture correction requires Node.js 18+ and three options, directly or through environment variables:

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

`timeoutMs` defaults to 10000. `maxRetries` is retained for compatibility but never repeats captures. `enableLogging` defaults to false; it logs method/URL, not headers or payloads. Keep URLs free of sensitive information and do not print error response bodies or application secrets.

Keep keys in an approved server-side secret mechanism, out of source control, browser code/storage, screenshots and recordings. This documentation does not authorize creating, saving or moving a key. Authenticated acceptance of this candidate is pending.
