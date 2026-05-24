import { createPublicClient, createWalletClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { braga } from "@arkiv-network/sdk/chains";
import { loadConfig } from "./config";
import type { ProjectAttr } from "./entities";

const config = loadConfig();
export const account = privateKeyToAccount(config.agentPrivateKey);
export const AGENT_ADDRESS = account.address;
export const PROJECT_ATTRIBUTE: ProjectAttr = { key: "project", value: config.projectValue };

export const wallet = createWalletClient({ chain: braga, transport: http(config.bragaRpc), account });
export const publicClient = createPublicClient({ chain: braga, transport: http(config.bragaRpc) });
export const BRAGA_CHAIN_ID = 60138453102;
