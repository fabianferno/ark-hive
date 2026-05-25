import { type NextRequest } from "next/server";
import { isAvailable, setName } from "@/lib/ens/namestone";
import { sanitizeLabel, userEns } from "@/lib/ens/labels";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { label, address } = body as { label?: unknown; address?: unknown };

  // Validate address
  if (typeof address !== "string" || !ADDRESS_RE.test(address)) {
    return Response.json(
      { error: "address must be a valid 0x Ethereum address" },
      { status: 400 }
    );
  }

  // Validate and sanitize label
  if (!label || typeof label !== "string") {
    return Response.json({ error: "label is required" }, { status: 400 });
  }
  const sanitized = sanitizeLabel(label);
  if (!sanitized) {
    return Response.json(
      { error: "label is invalid (sanitized to empty)", label: "" },
      { status: 400 }
    );
  }

  try {
    // Re-check availability before writing (TOCTOU guard)
    const available = await isAvailable(sanitized);
    if (!available) {
      return Response.json(
        { error: "label taken", label: sanitized },
        { status: 409 }
      );
    }

    // TODO: verify a Privy auth token server-side before trusting `address` from
    // the client. For now the address is taken at face value — acceptable while
    // there is no server session, but must be locked down before production.
    // Store lowercased so it round-trips with getNamesByAddress (NameStone matches
    // address case-sensitively against lowercased storage).
    const addr = address.toLowerCase();
    await setName({
      name: sanitized,
      address: addr,
      textRecords: { description: "AgentState user" },
    });

    return Response.json({
      ok: true,
      label: sanitized,
      ensName: userEns(sanitized),
      address: addr,
    });
  } catch (e) {
    return Response.json(
      { error: "ens claim failed", detail: (e as Error).message },
      { status: 502 }
    );
  }
}
