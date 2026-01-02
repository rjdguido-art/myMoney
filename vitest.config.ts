import path from "path";
import { createRequire } from "module";
import { defineConfig } from "vitest/config";

const require = createRequire(import.meta.url);
const nodeCrypto = require("crypto") as typeof import("crypto");
const webcrypto = nodeCrypto.webcrypto;
// Patch Node's built-in crypto module before Vite loads so getRandomValues exists.
if (!("getRandomValues" in nodeCrypto) && webcrypto?.getRandomValues) {
  const patchedGetRandomValues = webcrypto.getRandomValues.bind(webcrypto) as (
    typedArray: ArrayBufferView,
  ) => ArrayBufferView;
  (nodeCrypto as Record<string, unknown>).getRandomValues = patchedGetRandomValues;
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
