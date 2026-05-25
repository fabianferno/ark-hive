// lib/x402/pay.ts
// Build an x402 `exact`-scheme payment for Base Sepolia USDC, signed by the user's
// Privy wallet via EIP-3009 transferWithAuthorization (off-chain typed-data sig).
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import { X402_CHAIN_ID, X402_NETWORK, X402_USDC, type Authorization, type PaymentRequirement, type X402Payload } from "@/lib/x402/config";

export function selectRequirement(accepts: PaymentRequirement[]): PaymentRequirement | null {
  return accepts.find((a) => a.scheme === "exact" && a.network === X402_NETWORK) ?? null;
}

function randomNonce(): `0x${string}` {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return ("0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

export async function buildXPayment(ctx: ClientCtx, req: PaymentRequirement): Promise<string> {
  if (!ctx.signTypedData) throw new Error("wallet cannot sign typed data");
  const now = Math.floor(Date.now() / 1000);
  const authorization: Authorization = {
    from: ctx.address,
    to: req.payTo,
    value: req.maxAmountRequired,
    validAfter: "0",
    validBefore: String(now + (req.maxTimeoutSeconds ?? 300)),
    nonce: randomNonce(),
  };
  const typedData = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    domain: {
      name: req.extra?.name ?? "USDC",
      version: req.extra?.version ?? "2",
      chainId: X402_CHAIN_ID,
      verifyingContract: req.asset ?? X402_USDC,
    },
    message: authorization,
  };
  const signature = await ctx.signTypedData(typedData);
  const payload: X402Payload = { x402Version: 1, scheme: "exact", network: X402_NETWORK, payload: { signature, authorization } };
  return btoa(JSON.stringify(payload));
}
