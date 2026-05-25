// lib/ens/labels.ts
// ENS subdomain label helpers for the 3-level / 4-level naming scheme:
//   user  → <userLabel>.<ROOT_DOMAIN>               (3 DNS labels total)
//   agent → <agentLabel>.<userLabel>.<ROOT_DOMAIN>  (4 DNS labels total)
// All labels must be DNS-safe: lowercase a-z, 0-9, and hyphens only, max 63 chars.
import { ROOT_DOMAIN } from "./config";

/** Make `input` a valid ENS/DNS label (lowercase, no diacritics, only [a-z0-9-], ≤63 chars). */
export function sanitizeLabel(input: string): string {
  let s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")    // non-alnum/non-hyphen → hyphen
    .replace(/-+/g, "-")            // collapse runs of hyphens
    .replace(/^-+|-+$/g, "");       // trim leading/trailing hyphens

  if (s.length > 63) {
    s = s.slice(0, 63).replace(/-+$/, ""); // cap at 63, then re-trim trailing hyphen
  }
  return s;
}

/** `sanitizeLabel(input)` or `fallback` (assumed already valid) when result is empty. */
export function safeLabel(input: string, fallback: string): string {
  return sanitizeLabel(input) || fallback;
}

/** Stable DNS-safe user label derived from an address, for users who haven't claimed ENS. */
export function fallbackUserLabel(address: string): string {
  return `user-${address.slice(2, 8).toLowerCase()}`;
}

/** Build the agent sub-label: `<sanitized-name>-<agentId>` (e.g. "personal-bot-5242"). */
export function agentLabel(name: string, agentId: string | number): string {
  return `${safeLabel(name, "agent")}-${String(agentId)}`;
}

/** Full ENS name for a user: `<userLabel>.<ROOT_DOMAIN>`. */
export function userEns(userLabel: string): string {
  return `${userLabel}.${ROOT_DOMAIN}`;
}

/** Full ENS name for an agent: `<agentLabel>.<userLabel>.<ROOT_DOMAIN>`. */
export function agentEns(name: string, userLabel: string, agentId: string | number): string {
  return `${agentLabel(name, agentId)}.${userLabel}.${ROOT_DOMAIN}`;
}

export interface ParsedEns {
  labels: string[];
  rootMatches: boolean;
  kind: "user" | "agent" | "other";
  userLabel?: string;
  agentLabel?: string;
}

/**
 * Parse a full ENS name into its structural parts.
 * Uses ROOT_DOMAIN generically (splits on "." to count labels — no hardcoded depth).
 */
export function parseEns(full: string): ParsedEns {
  const normalized = full.toLowerCase().replace(/\.$/, "");
  const labels = normalized.split(".");
  const rootLabels = ROOT_DOMAIN.split(".");
  const rootLabelCount = rootLabels.length;

  // Check that the name actually ends with ROOT_DOMAIN
  const rootMatches =
    labels.length >= rootLabelCount &&
    rootLabels.every((rl, i) => rl === labels[labels.length - rootLabelCount + i]);

  if (!rootMatches) {
    return { labels, rootMatches: false, kind: "other" };
  }

  const extraCount = labels.length - rootLabelCount;

  if (extraCount === 1) {
    return { labels, rootMatches: true, kind: "user", userLabel: labels[0] };
  }

  if (extraCount === 2) {
    return {
      labels,
      rootMatches: true,
      kind: "agent",
      agentLabel: labels[0],
      userLabel: labels[1],
    };
  }

  return { labels, rootMatches: true, kind: "other" };
}
