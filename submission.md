# Submission

## What did you build?

**ark-hive** is a portable agent-memory layer on Arkiv, shipped as both a live ERC-8004 platform and an open npm SDK (`arkiv-agent-sdk`). Every agent's sessions, messages, scoped memory (run/entity/global), RAG summaries and hash-chained snapshots (`sha256(prev+payload)`) persist to Arkiv Braga — signed by the user's wallet, namespaced per project, range-queryable. Identity mints on Sepolia; cognition lives on Arkiv. Any app can `npm install` the SDK, read another agent's memory, and keep writing — agents you actually own.
