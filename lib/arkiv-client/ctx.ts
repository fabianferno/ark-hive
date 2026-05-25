// lib/arkiv-client/ctx.ts
// The per-user Arkiv context (built from the Privy wallet in useUserWallet).
// The wallet/publicClient are injected (no module singletons) so every write is
// signed by the user's own Privy embedded wallet and reads are scoped to it.
export interface ClientCtx {
  wallet: any; // Arkiv walletClient (createWalletClient w/ Privy provider) — has createEntity/updateEntity
  publicClient: any; // Arkiv publicClient (createPublicClient) — has buildQuery/getEntity
  address: `0x${string}`;
  signMessage?: (message: string) => Promise<string>; // Privy personal_sign — used to derive the X25519 encryption key
}
