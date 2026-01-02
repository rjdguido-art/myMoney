import path from "path";
import { createRequire } from "module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const nodeCrypto = require("crypto") as typeof import("crypto");
const webcrypto = nodeCrypto.webcrypto;
type CryptoWithRandom = typeof nodeCrypto & { getRandomValues?: typeof webcrypto.getRandomValues };
// Patch Node's built-in crypto module before Vite loads so getRandomValues exists.
const cryptoWithRandom = nodeCrypto as CryptoWithRandom;
if (!cryptoWithRandom.getRandomValues && webcrypto?.getRandomValues) {
  cryptoWithRandom.getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}
// Also add a global shim for test code that relies on browser-style crypto.
if (!globalThis.crypto || !("getRandomValues" in globalThis.crypto)) {
  globalThis.crypto = webcrypto as unknown as Crypto;
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
