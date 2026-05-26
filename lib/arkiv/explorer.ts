// lib/arkiv/explorer.ts
// Build links into the Arkiv data explorer (data.arkiv.network). The explorer
// uses a query-string filter — e.g. `?q=$key = "0x..."` — not a path. Override
// the base host via NEXT_PUBLIC_ARKIV_EXPLORER.

const BASE = (process.env.NEXT_PUBLIC_ARKIV_EXPLORER ?? "https://data.arkiv.network").replace(/\/$/, "");

function queryUrl(field: string, value: string): string {
  const q = encodeURIComponent(`${field} = "${value}"`);
  return `${BASE}/?q=${q}`;
}

export function arkivExplorerEntityUrl(entityKey: string): string {
  return queryUrl("$key", entityKey);
}

export function arkivExplorerTxUrl(txHash: string): string {
  return queryUrl("$tx", txHash);
}

export function arkivExplorerAddressUrl(address: string): string {
  return queryUrl("$creator", address);
}
