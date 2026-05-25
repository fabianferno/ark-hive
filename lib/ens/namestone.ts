// server-only NameStone wrapper — secret key never leaves server. See ENS_SPEC.md.
import "server-only";

function cfg() {
  const base = process.env.NAMESTONE_BASE_URL;
  const key = process.env.NAMESTONE_API_KEY;
  const domain = process.env.ENS_ROOT_DOMAIN ?? "ark-hive.eth";
  if (!base || !key)
    throw new Error(
      "NameStone not configured (NAMESTONE_BASE_URL / NAMESTONE_API_KEY)"
    );
  return { base, key, domain };
}

export interface NameRecord {
  name: string;
  address: string;
  domain: string;
  text_records?: Record<string, string>;
  coin_types?: Record<string, string>;
}

/** POST /set-name — registers or updates a subdomain under the root domain. */
export async function setName(args: {
  name: string;
  address: string;
  textRecords?: Record<string, string>;
  coinTypes?: Record<string, string>;
  contenthash?: string;
}): Promise<void> {
  const { base, key, domain } = cfg();
  const body: Record<string, unknown> = {
    domain,
    name: args.name,
    address: args.address,
  };
  if (args.textRecords) body.text_records = args.textRecords;
  if (args.coinTypes) body.coin_types = args.coinTypes;
  if (args.contenthash) body.contenthash = args.contenthash;

  const res = await fetch(`${base}/set-name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NameStone set-name ${res.status}: ${text}`);
  }
}

/** POST /delete-name — removes a subdomain. */
export async function deleteName(name: string): Promise<void> {
  const { base, key, domain } = cfg();

  const res = await fetch(`${base}/delete-name`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key,
    },
    body: JSON.stringify({ domain, name }),
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NameStone delete-name ${res.status}: ${text}`);
  }
}

/** GET /get-names?domain=&address= — returns records for a specific address.
 *  NameStone matches the address query case-sensitively against lowercased storage,
 *  so a checksummed wallet address (Privy returns these) finds nothing — always
 *  lowercase before querying. */
export async function getNamesByAddress(address: string): Promise<NameRecord[]> {
  const { base, key, domain } = cfg();
  const qs = new URLSearchParams({ domain, address: address.toLowerCase() });

  const res = await fetch(`${base}/get-names?${qs}`, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NameStone get-names ${res.status}: ${text}`);
  }
  return res.json() as Promise<NameRecord[]>;
}

/** GET /get-names?domain= — returns all records for the root domain. */
export async function getAllNames(): Promise<NameRecord[]> {
  const { base, key, domain } = cfg();
  const qs = new URLSearchParams({ domain });

  const res = await fetch(`${base}/get-names?${qs}`, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NameStone get-names ${res.status}: ${text}`);
  }
  return res.json() as Promise<NameRecord[]>;
}

/** GET /search-names?domain=&name=&exact_match= — filtered name search. */
export async function searchName(
  name: string,
  exact = true
): Promise<NameRecord[]> {
  const { base, key, domain } = cfg();
  const qs = new URLSearchParams({
    domain,
    name,
    ...(exact ? { exact_match: "1" } : {}),
  });

  const res = await fetch(`${base}/search-names?${qs}`, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NameStone search-names ${res.status}: ${text}`);
  }
  return res.json() as Promise<NameRecord[]>;
}

/** Returns true when no existing record shares the exact name. */
export async function isAvailable(name: string): Promise<boolean> {
  const records = await searchName(name, true);
  return !records.some((r) => r.name === name);
}

/** GET /get-domain?domain= — returns domain-level metadata. */
export async function getDomain(): Promise<{
  address: string;
  domain: string;
}> {
  const { base, key, domain } = cfg();
  const qs = new URLSearchParams({ domain });

  const res = await fetch(`${base}/get-domain?${qs}`, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NameStone get-domain ${res.status}: ${text}`);
  }
  return res.json() as Promise<{ address: string; domain: string }>;
}
