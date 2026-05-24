// lib/wallet/chains.ts
// Braga from the Arkiv SDK. Sepolia defined inline (do NOT import from "viem/chains":
// that barrel pulls ox/tempo with a broken dynamic require that crashes client hydration).
import { braga } from "@arkiv-network/sdk/chains";
import { defineChain } from "viem";

export const sepolia = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

export { braga };

export const BRAGA_ID = 60138453102;
export const SEPOLIA_ID = 11155111;
