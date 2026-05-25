// lib/x402/config.ts
import { BASE_SEPOLIA_ID, USDC_BASE_SEPOLIA } from "@/lib/wallet/chains";

export const X402_NETWORK = "base-sepolia" as const;
export const X402_CHAIN_ID = BASE_SEPOLIA_ID;
export const X402_USDC = USDC_BASE_SEPOLIA;

export interface PaymentRequirement {
  scheme: string;
  network: string;
  payTo: string;
  maxAmountRequired: string; // integer string, USDC 6dp
  asset?: string;
  resource?: string;
  maxTimeoutSeconds?: number;
  extra?: { name?: string; version?: string };
}

export interface Authorization {
  from: string; to: string; value: string;
  validAfter: string; validBefore: string; nonce: `0x${string}`;
}

export interface X402Payload {
  x402Version: 1;
  scheme: "exact";
  network: string;
  payload: { signature: string; authorization: Authorization };
}
