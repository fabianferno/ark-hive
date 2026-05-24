// lib/arkiv/client.ts
// Real @arkiv-network/sdk adapter will map the SDK to the ArkivClient interface here
// (verify SDK signatures at install). Until wired, dev uses the in-memory fake so the
// UI runs end-to-end without a testnet.
import { FakeArkivClient } from "./fakeClient";
import type { ArkivClient } from "./types";

let singleton: ArkivClient | null = null;
export function getArkivClient(): ArkivClient {
  if (!singleton) singleton = new FakeArkivClient();
  return singleton;
}
