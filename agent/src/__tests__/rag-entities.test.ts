import { describe, it, expect } from "vitest";
import { ENTITY, summaryAttrs, topicAttrs, summaryTopicAttrs, summaryLinkAttrs } from "../entities";

const p = { key: "project", value: "p" } as const;

describe("rag entity builders", () => {
  it("exposes the new entity types", () => {
    expect([ENTITY.summary, ENTITY.topic, ENTITY.summaryTopic, ENTITY.summaryLink])
      .toEqual(["summary", "topic", "summaryTopic", "summaryLink"]);
  });
  it("summary stamps caller/session and numeric summarySeq/createdAt", () => {
    const a = summaryAttrs(p, { agentId: "7", callerId: "0xC", sessionKey: "s1", summarySeq: 2, createdAt: 9 });
    expect(a).toContainEqual({ key: "entityType", value: "summary" });
    expect(a).toContainEqual({ key: "callerId", value: "0xC" });
    expect(a).toContainEqual({ key: "sessionKey", value: "s1" });
    expect(a).toContainEqual({ key: "summarySeq", value: 2 });
    expect(a).toContainEqual({ key: "createdAt", value: 9 });
  });
  it("topic carries the normalized topicKey", () => {
    const a = topicAttrs(p, { agentId: "7", callerId: "0xC", topicKey: "web3", createdAt: 1 });
    expect(a).toContainEqual({ key: "topicKey", value: "web3" });
  });
  it("summaryTopic links summaryKey+topicKey", () => {
    const a = summaryTopicAttrs(p, { agentId: "7", callerId: "0xC", summaryKey: "su1", topicKey: "web3", sessionKey: "s1", createdAt: 1 });
    expect(a).toContainEqual({ key: "summaryKey", value: "su1" });
    expect(a).toContainEqual({ key: "topicKey", value: "web3" });
  });
  it("summaryLink stores src/dst + numeric score", () => {
    const a = summaryLinkAttrs(p, { agentId: "7", callerId: "0xC", srcSummaryKey: "su1", dstSummaryKey: "su2", score: 0.87, createdAt: 1 });
    expect(a).toContainEqual({ key: "srcSummaryKey", value: "su1" });
    expect(a).toContainEqual({ key: "dstSummaryKey", value: "su2" });
    expect(a).toContainEqual({ key: "score", value: 0.87 });
  });
});
