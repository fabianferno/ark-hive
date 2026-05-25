// lib/ens/config.ts
// Public ENS root domain (shown in UI; safe to expose). User subnames are
// <label>.<ROOT_DOMAIN>, agents are <agentLabel>.<userLabel>.<ROOT_DOMAIN>.
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ENS_ROOT_DOMAIN ?? "ark-hive.eth";
