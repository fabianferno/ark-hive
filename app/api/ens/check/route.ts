import { type NextRequest } from "next/server";
import { isAvailable } from "@/lib/ens/namestone";
import { sanitizeLabel, userEns } from "@/lib/ens/labels";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get("label") ?? "";
  const sanitized = sanitizeLabel(label);

  if (!sanitized) {
    return Response.json(
      { available: false, reason: "invalid label", label: "" },
      { status: 200 }
    );
  }

  try {
    const available = await isAvailable(sanitized);
    return Response.json({
      available,
      label: sanitized,
      ensName: userEns(sanitized),
    });
  } catch (e) {
    return Response.json(
      { error: "ens check failed", detail: (e as Error).message },
      { status: 502 }
    );
  }
}
