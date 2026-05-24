// lib/wallet/project.ts
// Project attribute stamped on every Arkiv entity (scopes reads/writes to this app).
export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: process.env.NEXT_PUBLIC_PROJECT_VALUE ?? "agentstate-disha-7x9k",
} as const;
