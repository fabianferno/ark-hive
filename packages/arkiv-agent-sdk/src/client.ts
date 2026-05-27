// arkiv-agent-sdk — client context.
// Inject the Arkiv walletClient + publicClient (browser or Node). All writes are
// signed by the wallet; reads are scoped to ctx.address when using `query()`.
export interface ClientCtx {
  /** Arkiv walletClient — exposes createEntity/updateEntity/deleteEntity/extendEntity. */
  wallet: any;
  /** Arkiv publicClient — exposes buildQuery/getEntity. */
  publicClient: any;
  /** The wallet's address (lowercased 0x...). Used as `createdBy` filter for scoped reads. */
  address: `0x${string}`;
}

import type { ProjectAttr } from "./entities";

export interface SdkConfig {
  ctx: ClientCtx;
  /** Project attribute stamped on every entity (namespaces this app inside the shared Arkiv store). */
  project: ProjectAttr;
}
