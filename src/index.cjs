// CommonJS wrapper for @obligra/verify-sdk
// Use this if your project does not have "type": "module" in package.json

let _module;

module.exports = new Proxy({}, {
  get(_, prop) {
    if (!_module) {
      throw new Error(
        '@obligra/verify-sdk: CommonJS require() is not directly supported. ' +
        'Use one of:\n' +
        '  1. Add "type": "module" to your package.json, then: import { VerifyClient } from "@obligra/verify-sdk"\n' +
        '  2. Rename your file to .mjs, then: import { VerifyClient } from "@obligra/verify-sdk"\n' +
        '  3. Use dynamic import: const { VerifyClient } = await import("@obligra/verify-sdk")'
      );
    }
    return _module[prop];
  }
});
