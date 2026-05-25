// app/api/agent-call/route.ts
// Server proxy for calling an external agent's endpoint (avoids browser CORS).
// 200 → { reply }. 402 → { status:402, accepts } (client runs the x402 handshake).
// anything else → 502 so the client falls back to the local persona brain.
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Minimal SSRF guard: reject obvious internal/loopback/link-local hosts so an
// agent endpoint (esp. an adopted external one) can't make the server hit its own
// network. Set ALLOW_PRIVATE_AGENT_HOSTS=1 to allow (local dev against a mock).
function isBlockedHost(hostname: string): boolean {
  if (process.env.ALLOW_PRIVATE_AGENT_HOSTS === "1") return false;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

async function parseReply(r: Response): Promise<string> {
  const text = await r.text();
  try {
    const j = JSON.parse(text);
    const v = j.reply ?? j.message ?? j.content ?? j.text;
    if (typeof v === "string") return v;
  } catch { /* not json */ }
  if (text.trim()) return text.trim();
  throw new Error("empty/unparseable upstream reply");
}

export async function POST(req: Request) {
  let body: { url?: string; message?: string; history?: unknown; xPayment?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }
  const { url, message, history, xPayment } = body;
  if (!url || !/^https?:\/\//.test(url)) return NextResponse.json({ error: "bad url" }, { status: 400 });
  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ error: "bad url" }, { status: 400 }); }
  if (isBlockedHost(parsed.hostname)) return NextResponse.json({ error: "blocked host" }, { status: 400 });

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (xPayment) headers["X-PAYMENT"] = xPayment;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, history }),
      signal: AbortSignal.timeout(18_000),
    });
    if (r.status === 402) {
      const j = await r.json().catch(() => ({}));
      return NextResponse.json({ status: 402, accepts: (j as { accepts?: unknown[] }).accepts ?? [] });
    }
    if (!r.ok) return NextResponse.json({ error: `upstream ${r.status}` }, { status: 502 });
    const settlement = r.headers.get("x-payment-response") || undefined;
    const reply = await parseReply(r);
    return NextResponse.json({ reply, settlement });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
