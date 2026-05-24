// lib/arkiv/project.ts — stamped on every entity, filtered on every query
export const PROJECT_ATTRIBUTE = {
  key: "project",
  value: process.env.NEXT_PUBLIC_PROJECT_VALUE ?? "agentstate-v2-dev",
} as const;
