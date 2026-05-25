import { type NextRequest } from "next/server";

// Same-origin proxy to the Arkiv (Braga) JSON-RPC. The public Braga RPC 403s
// browser-origin requests (WAF), which broke all client-side Arkiv writes once
// the wallet moved to the browser. The chain's rpcUrl points here; Next forwards
// server-side (clean headers) → no 403. Long timeout for slow entity writes.
const ARKIV_ORIGIN = process.env.ARKIV_RPC_ORIGIN ?? "https://braga.hoodi.arkiv.network/rpc";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const res = await fetch(ARKIV_ORIGIN, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(115_000),
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    return Response.json({ error: "arkiv rpc proxy failed", detail: (e as Error).message }, { status: 502 });
  }
}
