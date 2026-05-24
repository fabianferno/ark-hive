import { type NextRequest } from "next/server";

const ORIGIN = process.env.AGENT_ORIGIN ?? "http://localhost:8787";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Same-origin proxy to the agent service with a long timeout. Replaces a Next
// rewrite (whose undici fetch caps at ~30s) so slow Arkiv writes (e.g. session
// close / RAG index) don't get cut off. Works whether the UI is opened locally
// or on a remote host, since the browser only ever calls same-origin /agent-api/*.
async function proxy(req: NextRequest, path: string[]) {
  const target = `${ORIGIN}/${path.join("/")}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(115_000),
  };
  if (req.method !== "GET" && req.method !== "HEAD") init.body = await req.text();
  try {
    const res = await fetch(target, init);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    return Response.json({ error: "agent proxy failed", detail: (e as Error).message }, { status: 502 });
  }
}

export function GET(req: NextRequest, ctx: { params: { path: string[] } }) { return proxy(req, ctx.params.path); }
export function POST(req: NextRequest, ctx: { params: { path: string[] } }) { return proxy(req, ctx.params.path); }
