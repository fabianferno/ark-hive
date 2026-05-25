import { describe, it, expect, vi } from "vitest";
import { selectRequirement, buildXPayment } from "@/lib/x402/pay";

describe("selectRequirement", () => {
  it("picks exact + base-sepolia", () => {
    const r = selectRequirement([
      { scheme: "upto", network: "base-sepolia", payTo: "0x", maxAmountRequired: "1" },
      { scheme: "exact", network: "base", payTo: "0x", maxAmountRequired: "1" },
      { scheme: "exact", network: "base-sepolia", payTo: "0xPay", maxAmountRequired: "1000" },
    ]);
    expect(r?.payTo).toBe("0xPay");
  });
  it("returns null when none match", () => {
    expect(selectRequirement([{ scheme: "exact", network: "base", payTo: "0x", maxAmountRequired: "1" }])).toBeNull();
  });
});

describe("buildXPayment", () => {
  it("signs EIP-712 and returns a base64 x402 payload", async () => {
    const signTypedData = vi.fn(async () => "0xsig");
    const ctx = { address: "0xFrom", signTypedData } as any;
    const req = { scheme: "exact", network: "base-sepolia", payTo: "0xTo", maxAmountRequired: "1000", maxTimeoutSeconds: 60 };
    const xp = await buildXPayment(ctx, req as any);
    const decoded = JSON.parse(atob(xp));
    expect(decoded.scheme).toBe("exact");
    expect(decoded.network).toBe("base-sepolia");
    expect(decoded.payload.signature).toBe("0xsig");
    expect(decoded.payload.authorization).toMatchObject({ from: "0xFrom", to: "0xTo", value: "1000" });
    const typed = signTypedData.mock.calls[0][0] as any;
    expect(typed.domain.chainId).toBe(84532);
    expect(typed.primaryType).toBe("TransferWithAuthorization");
  });
});
