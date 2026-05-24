// lib/agent/identity.ts
// Client-side ERC-8004 IdentityRegistry mint using RAW VIEM (the ChaosChain SDK
// is node-only and must NOT be imported in the browser). The user's Privy wallet,
// switched to Eth Sepolia, signs `register(string tokenURI_)`. We then decode the
// `Registered` event from the receipt to recover the minted agentId.
//
// ABI + event layout VERIFIED against the installed ChaosChain SDK:
//   agent/node_modules/@chaoschain/sdk/dist/index.cjs (IDENTITY_REGISTRY_ABI)
//     register(string tokenURI_) returns (uint256 agentId)   [line ~10564]
//     event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)  [line ~10682]
//   (note: `tokenURI` is NON-indexed, `agentId` + `owner` are indexed.)
import { decodeEventLog, encodeFunctionData } from "viem";
import { SEPOLIA_ID } from "@/lib/wallet/chains";

export const REGISTRY_ADDRESS = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;
export const REGISTRY_CHAIN_ID = SEPOLIA_ID; // Ethereum Sepolia (11155111)

// Minimal IdentityRegistry ABI — only the fragments we need to mint + decode.
export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ name: "tokenURI_", type: "string" }],
    name: "register",
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: false, name: "tokenURI", type: "string" },
      { indexed: true, name: "owner", type: "address" },
    ],
    name: "Registered",
    type: "event",
  },
  // Fallback getter: ownerOf(tokenId) → owner, used to confirm a mint when the
  // event decode somehow fails (we cannot derive the id from this directly, so it
  // is only a sanity probe; the primary path is the Registered event decode).
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "owner", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// viem's decodeEventLog wants the receipt's exact topics tuple shape
// ([] | [signature, ...args]) — not a plain `0x${string}`[].
type ReceiptLog = { topics: [] | [`0x${string}`, ...`0x${string}`[]]; data: `0x${string}` };

export interface RegisterIdentityArgs {
  // Privy's useSendTransaction().sendTransaction — prompts the user's embedded
  // wallet to sign+send (handles the chain switch via chainId).
  sendTransaction: (input: { to: string; data: string; chainId: number }) => Promise<{ hash: `0x${string}` }>;
  publicSepolia: any; // viem PublicClient on Eth Sepolia (for the receipt)
  ipfsUri: string;
}

export async function registerIdentityClient(
  { sendTransaction, publicSepolia, ipfsUri }: RegisterIdentityArgs,
): Promise<{ agentId: string; txHash: string }> {
  const data = encodeFunctionData({
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "register",
    args: [ipfsUri],
  });
  // User's Privy embedded wallet signs the 8004 mint on Ethereum Sepolia.
  const { hash } = await sendTransaction({ to: REGISTRY_ADDRESS, data, chainId: SEPOLIA_ID });

  const receipt: { logs: ReceiptLog[] } = await publicSepolia.waitForTransactionReceipt({ hash });

  // Decode the Registered event from the receipt logs.
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: IDENTITY_REGISTRY_ABI,
        topics: log.topics,
        data: log.data,
        eventName: "Registered",
      });
      const args = decoded.args as unknown as { agentId: bigint; owner: `0x${string}` };
      if (args?.agentId !== undefined) {
        return { agentId: String(args.agentId), txHash: hash };
      }
    } catch {
      // not a Registered log — keep scanning
    }
  }

  // Fallback: the SDK's IdentityRegistry mints sequential ERC-721 token ids, and
  // the ERC-721 Transfer event (tokenId == agentId) is also emitted. Try decoding
  // that to recover the id if the Registered decode missed.
  const TRANSFER_ABI = [
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: "from", type: "address" },
        { indexed: true, name: "to", type: "address" },
        { indexed: true, name: "tokenId", type: "uint256" },
      ],
      name: "Transfer",
      type: "event",
    },
  ] as const;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: TRANSFER_ABI, topics: log.topics, data: log.data, eventName: "Transfer" });
      const args = decoded.args as unknown as { from: `0x${string}`; to: `0x${string}`; tokenId: bigint };
      // mint = transfer from the zero address to the new owner
      if (args?.from === "0x0000000000000000000000000000000000000000" && args.tokenId !== undefined) {
        return { agentId: String(args.tokenId), txHash: hash };
      }
    } catch {
      // not a Transfer log
    }
  }

  throw new Error(
    `8004 mint: Registered event not found in receipt for tx ${hash} (logs=${receipt.logs.length}). ` +
      `Verify the IdentityRegistry ABI/event layout at ${REGISTRY_ADDRESS}.`,
  );
}
