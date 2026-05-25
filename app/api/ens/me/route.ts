import { type NextRequest } from "next/server";
import { getNamesByAddress } from "@/lib/ens/namestone";
import { userEns } from "@/lib/ens/labels";

export const dynamic = "force-dynamic";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";

  if (!ADDRESS_RE.test(address)) {
    return Response.json(
      { error: "address must be a valid 0x Ethereum address" },
      { status: 400 }
    );
  }

  try {
    const names = await getNamesByAddress(address);
    if (!names.length) {
      return Response.json({ ensName: null });
    }
    const first = names[0];
    return Response.json({
      ensName: userEns(first.name),
      label: first.name,
      address,
    });
  } catch (e) {
    return Response.json(
      { error: "ens lookup failed", detail: (e as Error).message },
      { status: 502 }
    );
  }
}
