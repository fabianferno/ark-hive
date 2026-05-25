import { describe, it, expect } from "vitest";
import { baseSepolia, BASE_SEPOLIA_ID, USDC_BASE_SEPOLIA } from "@/lib/wallet/chains";

describe("baseSepolia", () => {
  it("has chainId 84532 and the USDC address", () => {
    expect(baseSepolia.id).toBe(84532);
    expect(BASE_SEPOLIA_ID).toBe(84532);
    expect(USDC_BASE_SEPOLIA).toBe("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
  });
});
