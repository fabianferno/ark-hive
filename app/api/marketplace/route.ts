// app/api/marketplace/route.ts
// Cached server-side listing of all ERC-8004 registry agents + their metadata.
import { NextResponse } from "next/server";
import { enumerateAgents } from "@/lib/agent/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL = 60_000;
let cache: { at: number; data: unknown } | null = null;

export async function GET(req: Request) {
  const refresh = new URL(req.url).searchParams.get("refresh");
  if (!refresh && cache && Date.now() - cache.at < TTL) {
    return NextResponse.json(cache.data);
  }
  try {
    const agents = await enumerateAgents();
    const data = { agents, total: agents.length, fetchedAt: Date.now() };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
