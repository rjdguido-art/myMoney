import { webcrypto } from "crypto";

type CryptoWithRandom = Crypto & { getRandomValues: Crypto["getRandomValues"] };

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as unknown as Crypto;
} else if (!("getRandomValues" in globalThis.crypto)) {
  // Some runtimes expose crypto but miss getRandomValues; bridge to webcrypto implementation.
  (globalThis.crypto as CryptoWithRandom).getRandomValues =
    webcrypto.getRandomValues.bind(webcrypto);
}
