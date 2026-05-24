import { describe, it, expect } from "vitest";
import {
  agentCardAttrs, messageAttrs, memoryAttrs, ENTITY,
  summaryAttrs, topicAttrs, summaryTopicAttrs, summaryLinkAttrs,
} from "../entities";

const project = { key: "project", value: "p" } as const;

describe("entity attribute builders", () => {
  it("agentCard stamps project, entityType, numeric chainId + createdAt", () => {
    const a = agentCardAttrs(project, { agentId: "7", registryChainId: 84532, status: "active", createdAt: 1000, agentCardUri: "ipfs://x" });
    expect(a).toContainEqual({ key: "project", value: "p" });
    expect(a).toContainEqual({ key: "entityType", value: ENTITY.agentCard });
    expect(a).toContainEqual({ key: "agentId", value: "7" });
    expect(a).toContainEqual({ key: "registryChainId", value: 84532 });
    expect(a).toContainEqual({ key: "createdAt", value: 1000 });
  });
  it("message keeps seq + ts numeric and role/sessionKey string", () => {
    const a = messageAttrs(project, { sessionKey: "s1", agentId: "7", role: "user", seq: 3, ts: 99 });
    expect(a).toContainEqual({ key: "seq", value: 3 });
    expect(a).toContainEqual({ key: "ts", value: 99 });
    expect(a).toContainEqual({ key: "role", value: "user" });
    expect(a).toContainEqual({ key: "sessionKey", value: "s1" });
  });
  it("memory carries scope/scopeKey/memKey and numeric version", () => {
    const a = memoryAttrs(project, { agentId: "7", scope: "run", scopeKey: "s1", memKey: "goal", source: "chat", version: 1, createdAt: 5 });
    expect(a).toContainEqual({ key: "scope", value: "run" });
    expect(a).toContainEqual({ key: "memKey", value: "goal" });
    expect(a).toContainEqual({ key: "version", value: 1 });
  });
});

describe("rag entity builders", () => {
  it("exposes the new entity types", () => {
    expect([ENTITY.summary, ENTITY.topic, ENTITY.summaryTopic, ENTITY.summaryLink])
      .toEqual(["summary", "topic", "summaryTopic", "summaryLink"]);
  });
  it("summary stamps caller/session and numeric summarySeq/createdAt", () => {
    const a = summaryAttrs(project, { agentId: "7", callerId: "0xC", sessionKey: "s1", summarySeq: 2, createdAt: 9 });
    expect(a).toContainEqual({ key: "entityType", value: "summary" });
    expect(a).toContainEqual({ key: "callerId", value: "0xC" });
    expect(a).toContainEqual({ key: "sessionKey", value: "s1" });
    expect(a).toContainEqual({ key: "summarySeq", value: 2 });
    expect(a).toContainEqual({ key: "createdAt", value: 9 });
  });
  it("topic carries the normalized topicKey", () => {
    const a = topicAttrs(project, { agentId: "7", callerId: "0xC", topicKey: "web3", createdAt: 1 });
    expect(a).toContainEqual({ key: "topicKey", value: "web3" });
  });
  it("summaryTopic links summaryKey+topicKey", () => {
    const a = summaryTopicAttrs(project, { agentId: "7", callerId: "0xC", summaryKey: "su1", topicKey: "web3", sessionKey: "s1", createdAt: 1 });
    expect(a).toContainEqual({ key: "summaryKey", value: "su1" });
    expect(a).toContainEqual({ key: "topicKey", value: "web3" });
  });
  it("summaryLink stores src/dst + numeric score", () => {
    const a = summaryLinkAttrs(project, { agentId: "7", callerId: "0xC", srcSummaryKey: "su1", dstSummaryKey: "su2", score: 0.87, createdAt: 1 });
    expect(a).toContainEqual({ key: "srcSummaryKey", value: "su1" });
    expect(a).toContainEqual({ key: "dstSummaryKey", value: "su2" });
    expect(a).toContainEqual({ key: "score", value: 0.87 });
  });
});
