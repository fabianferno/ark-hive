// lib/arkiv-client/access.ts
// Encrypted summaries + auto-revoking access grants. Composes the X25519 keypair
// (lib/crypto/keys), envelope crypto (lib/crypto/envelope) and the Arkiv repo.
// Cross-user reads use repo.queryGlobal (the scoped query only returns MY entities).
import { makeRepo, queryGlobal, type DecodedEntity } from "./repo";
import { PROJECT_ATTRIBUTE } from "./project";
import type { Condition } from "./search";
import type { ClientCtx } from "./ctx";
import { deriveKeyPair } from "@/lib/crypto/keys";
import { encryptPayload, decryptPayload, wrapKey, unwrapKey, type WrappedKey } from "@/lib/crypto/envelope";

const SCHEME = "x25519-hkdf-xchacha20poly1305";
const eqp = (): Condition => ({ key: PROJECT_ATTRIBUTE.key, op: "eq", value: PROJECT_ATTRIBUTE.value });
const eqv = (key: string, value: string): Condition => ({ key, op: "eq", value });
const lc = (a: string) => a.toLowerCase();

export interface IncomingGrant { grantKey: string; resourceKey: string; granterAgentId: string; granteeAgentId: string; expiresAt: number; wrapped: WrappedKey; }
export interface OutgoingGrant { grantKey: string; resourceKey: string; granteeAgentId: string; granteeAddress: string; expiresAt: number; }

/** Ensure this wallet has a published X25519 pubkey entity; returns my keypair. */
export async function publishPubKey(ctx: ClientCtx) {
  const kp = await deriveKeyPair(ctx);
  const rows = await queryGlobal(ctx, [eqp(), eqv("entityType", "pubkey"), eqv("owner", lc(ctx.address))], 1);
  const repo = makeRepo(ctx);
  if (rows.length === 0) {
    await repo.createPubKey({ owner: lc(ctx.address), x25519Pub: kp.publicKeyB64, scheme: SCHEME });
  } else {
    try { await repo.extendEntity(rows[0].key, 60 * 60 * 24 * 365); } catch { /* best-effort TTL refresh */ }
  }
  return kp;
}

/** Find a wallet's published X25519 public key (base64), or null. */
export async function resolvePubKey(ctx: ClientCtx, address: string): Promise<string | null> {
  const rows = await queryGlobal(ctx, [eqp(), eqv("entityType", "pubkey"), eqv("owner", lc(address))], 1);
  const p = rows[0]?.payload as { x25519Pub?: string } | undefined;
  return p?.x25519Pub ?? null;
}

/** Resolve the owner wallet of an agent (from its agentCard's on-chain owner). */
export async function resolveAgentOwner(ctx: ClientCtx, agentId: string): Promise<string | null> {
  const rows = await queryGlobal(ctx, [eqp(), eqv("entityType", "agentCard"), eqv("agentId", agentId)], 1);
  return rows[0]?.owner ? lc(rows[0].owner) : null;
}

/** Encrypt a summary, write it + a long-lived self-grant, then grant the recipient agent. */
export async function encryptAndShareSummary(ctx: ClientCtx, opts: {
  agentId: string; sessionKey: string; summarySeq: number;
  plain: { summary: string; topics: string[] };
  granteeAgentId: string; expiresInSec: number; deleteOriginalKey?: string;
}): Promise<{ summaryKey: string }> {
  const repo = makeRepo(ctx);
  const me = await publishPubKey(ctx);

  const dek = crypto.getRandomValues(new Uint8Array(32));
  const blob = encryptPayload(opts.plain, dek);
  const { entityKey: summaryKey } = await repo.createEncryptedSummary({
    agentId: opts.agentId, callerId: lc(ctx.address), sessionKey: opts.sessionKey,
    summarySeq: opts.summarySeq, ciphertext: blob.ciphertext, nonce: blob.nonce,
  });

  // self-grant (365d) so the owner can always re-read / re-share
  await writeGrant(ctx, { dek, recipientPubB64: me.publicKeyB64, agentId: opts.agentId,
    resourceKey: summaryKey, granteeAgentId: "", granteeAddress: lc(ctx.address), expiresInSec: 60 * 60 * 24 * 365 });

  await grantSummaryToAgent(ctx, { summaryKey, dek, agentId: opts.agentId, granteeAgentId: opts.granteeAgentId, expiresInSec: opts.expiresInSec });

  if (opts.deleteOriginalKey) { try { await repo.deleteEntity(opts.deleteOriginalKey); } catch { /* best-effort */ } }
  return { summaryKey };
}

/** Grant an already-encrypted summary to another agent. Recovers the DEK from the
 *  caller's self-grant if not supplied. */
export async function grantSummaryToAgent(ctx: ClientCtx, opts: {
  summaryKey: string; dek?: Uint8Array; agentId: string; granteeAgentId: string; expiresInSec: number;
}): Promise<{ grantKey: string }> {
  const dek = opts.dek ?? await recoverDek(ctx, opts.summaryKey);
  const ownerAddr = await resolveAgentOwner(ctx, opts.granteeAgentId);
  if (!ownerAddr) throw new Error("recipient agent not found");
  const pub = await resolvePubKey(ctx, ownerAddr);
  if (!pub) throw new Error("recipient hasn't enabled encryption yet");
  const { entityKey } = await writeGrant(ctx, { dek, recipientPubB64: pub, agentId: opts.agentId,
    resourceKey: opts.summaryKey, granteeAgentId: opts.granteeAgentId, granteeAddress: ownerAddr, expiresInSec: opts.expiresInSec });
  return { grantKey: entityKey };
}

async function writeGrant(ctx: ClientCtx, a: {
  dek: Uint8Array; recipientPubB64: string; agentId: string; resourceKey: string;
  granteeAgentId: string; granteeAddress: string; expiresInSec: number;
}) {
  const wrapped = wrapKey(a.dek, a.recipientPubB64);
  return makeRepo(ctx).createAccessGrant({
    agentId: a.agentId, resourceKey: a.resourceKey, resourceType: "summary",
    granteeAgentId: a.granteeAgentId, granteeAddress: lc(a.granteeAddress),
    expiresAt: Date.now() + a.expiresInSec * 1000, createdAt: Date.now(),
    wrappedKey: wrapped.wrappedKey, ephemeralPub: wrapped.ephemeralPub, nonce: wrapped.nonce, expiresInSec: a.expiresInSec,
  });
}

function toWrapped(payload: unknown): WrappedKey {
  const p = (payload ?? {}) as Partial<WrappedKey>;
  return { wrappedKey: p.wrappedKey ?? "", ephemeralPub: p.ephemeralPub ?? "", nonce: p.nonce ?? "" };
}

/** Recover the DEK for a summary from one of MY grants (self-grant or a grant to me). */
async function recoverDek(ctx: ClientCtx, summaryKey: string): Promise<Uint8Array> {
  const me = await deriveKeyPair(ctx);
  const rows = await queryGlobal(ctx, [eqp(), eqv("entityType", "accessGrant"), eqv("resourceKey", summaryKey), eqv("granteeAddress", lc(ctx.address))], 5);
  for (const r of rows) {
    try { return unwrapKey(toWrapped(r.payload), me.secretKey); } catch { /* try next */ }
  }
  throw new Error("no decryptable grant for this summary");
}

/** Grants where I am the recipient (expired ones are not returned by Arkiv). */
export async function listGrantsForMe(ctx: ClientCtx): Promise<IncomingGrant[]> {
  const rows = await queryGlobal(ctx, [eqp(), eqv("entityType", "accessGrant"), eqv("granteeAddress", lc(ctx.address))], 100);
  return rows.map(mapIncoming);
}

function mapIncoming(r: DecodedEntity): IncomingGrant {
  return {
    grantKey: r.key, resourceKey: String(r.attrs.resourceKey ?? ""),
    granterAgentId: String(r.attrs.agentId ?? ""), granteeAgentId: String(r.attrs.granteeAgentId ?? ""),
    expiresAt: Number(r.attrs.expiresAt ?? 0), wrapped: toWrapped(r.payload),
  };
}

/** Grants I created (outgoing), excluding my own self-grants. */
export async function listOutgoingGrants(ctx: ClientCtx): Promise<OutgoingGrant[]> {
  const repo = makeRepo(ctx);
  const rows = await repo.query([eqp(), eqv("entityType", "accessGrant")], 200); // scoped to createdBy(me)
  return rows
    .filter((r) => lc(String(r.attrs.granteeAddress ?? "")) !== lc(ctx.address))
    .map((r) => ({
      grantKey: r.key, resourceKey: String(r.attrs.resourceKey ?? ""),
      granteeAgentId: String(r.attrs.granteeAgentId ?? ""), granteeAddress: lc(String(r.attrs.granteeAddress ?? "")),
      expiresAt: Number(r.attrs.expiresAt ?? 0),
    }));
}

/** Decrypt the summary text behind a grant I hold. */
export async function readSharedSummary(ctx: ClientCtx, grant: IncomingGrant): Promise<string> {
  const me = await deriveKeyPair(ctx);
  const dek = unwrapKey(grant.wrapped, me.secretKey);
  const entity = await ctx.publicClient.getEntity(grant.resourceKey as `0x${string}`);
  const payload = entity.toJson() as { ciphertext: string; nonce: string };
  const out = decryptPayload({ ciphertext: payload.ciphertext, nonce: payload.nonce }, dek) as { summary: string };
  return out.summary;
}

export async function revokeGrant(ctx: ClientCtx, grantKey: string): Promise<void> {
  await makeRepo(ctx).deleteEntity(grantKey);
}
export async function extendGrant(ctx: ClientCtx, grantKey: string, expiresInSec: number): Promise<void> {
  const repo = makeRepo(ctx);
  const e = await repo.getEntity(grantKey);
  const a = e.attrs;
  const w = toWrapped(e.payload);
  await repo.updateAccessGrant(grantKey, {
    agentId: String(a.agentId ?? ""), resourceKey: String(a.resourceKey ?? ""), resourceType: String(a.resourceType ?? "summary"),
    granteeAgentId: String(a.granteeAgentId ?? ""), granteeAddress: lc(String(a.granteeAddress ?? "")),
    expiresAt: Date.now() + expiresInSec * 1000, createdAt: Number(a.createdAt ?? Date.now()),
    wrappedKey: w.wrappedKey, ephemeralPub: w.ephemeralPub, nonce: w.nonce, expiresInSec,
  });
}
