import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
} else if (!("getRandomValues" in globalThis.crypto)) {
  // Some runtimes expose crypto but miss getRandomValues; bridge to webcrypto implementation.
  (globalThis.crypto as any).getRandomValues = webcrypto.getRandomValues.bind(webcrypto);
}
