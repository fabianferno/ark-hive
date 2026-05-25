// lib/ens/client.ts
// Browser-side fetch wrappers for the /api/ens/* routes.
// All functions throw on non-ok HTTP responses (includes body text).

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`ENS API error ${res.status}: ${text}`);
  }
}

/** Check whether a label is available for registration. */
export async function checkAvailability(label: string): Promise<{
  available: boolean;
  label: string;
  ensName: string;
  reason?: string;
}> {
  const qs = new URLSearchParams({ label });
  const res = await fetch(`/api/ens/check?${qs}`);
  await throwIfNotOk(res);
  return res.json();
}

/** Claim a user-level ENS subdomain for the given address. */
export async function claimUserEns(
  label: string,
  address: string,
): Promise<{ ok: boolean; label: string; ensName: string }> {
  const res = await fetch("/api/ens/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, address }),
  });
  await throwIfNotOk(res);
  return res.json();
}

/** Return the ENS name currently registered for the given address (or null). */
export async function getMyEns(
  address: string,
): Promise<{ ensName: string | null; label?: string }> {
  const qs = new URLSearchParams({ address });
  const res = await fetch(`/api/ens/me?${qs}`);
  await throwIfNotOk(res);
  return res.json();
}

/** Resolve an ENS name to its structural parts and owner address. */
export async function resolveUserEns(name: string): Promise<{
  kind: string;
  userLabel: string | null;
  agentLabel: string | null;
  ownerAddress: string | null;
  ensName: string;
}> {
  const qs = new URLSearchParams({ name });
  const res = await fetch(`/api/ens/resolve?${qs}`);
  await throwIfNotOk(res);
  return res.json();
}
