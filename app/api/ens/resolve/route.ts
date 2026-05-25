import { type NextRequest } from "next/server";
import { searchName } from "@/lib/ens/namestone";
import { parseEns } from "@/lib/ens/labels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";

  if (!name) {
    return Response.json({ error: "name query parameter is required" }, { status: 400 });
  }

  const p = parseEns(name);

  if (!p.rootMatches) {
    return Response.json(
      { error: "not under root domain" },
      { status: 400 }
    );
  }

  // For user (3-level) and agent (4-level) names the userLabel is the
  // 3rd-level label (index 0 for user, index 1 for agent).
  const userLabel = p.userLabel ?? null;

  try {
    let ownerAddress: string | null = null;
    if (userLabel) {
      const recs = await searchName(userLabel, true);
      ownerAddress = recs[0]?.address ?? null;
    }

    return Response.json({
      kind: p.kind,
      userLabel,
      agentLabel: p.agentLabel ?? null,
      ownerAddress,
      ensName: name.toLowerCase().replace(/\.$/, ""), // match the normalized form stored in Arkiv
    });
  } catch (e) {
    return Response.json(
      { error: "ens resolve failed", detail: (e as Error).message },
      { status: 502 }
    );
  }
}
