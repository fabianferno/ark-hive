// lib/agentClient.ts
export interface UiAgent { key: string; agentId: string; name: string; description: string; status: string; registryChainId: number; createdAt: number; agentCardUri: string; }
export interface UiSession { key: string; agentId: string; callerId: string; sessionStatus: string; turnCount: number; startedAt: number; lastActivityAt: number; }
export interface UiMessage { key: string; role: "user" | "assistant"; content: string; seq: number; }
export interface UiHit { memKey: string; value: string; scope: string; createdAt: number; }
export interface CreateAgentResult { agentId: string; txHash: string; agentCardKey: string; agentCardUri?: string; }
export interface SendResult { reply: string; userKey: string; assistantKey: string; snapshotKey: string; }
export interface CreateAgentInput { name: string; description: string; domain?: string; capabilities?: string[]; version?: string; image?: string; contact?: string; }

interface DecodedEntity { key: string; payload: any; attrs: Record<string, string | number>; }

export class AgentClient {
  constructor(private baseUrl: string) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { method: "GET", headers: { "Content-Type": "application/json" }, ...init });
    if (!res.ok) throw new Error(`agent ${path} failed: ${res.status} ${await res.text?.().catch(() => "")}`);
    return res.json() as Promise<T>;
  }

  async listAgents(): Promise<UiAgent[]> {
    const { agents } = await this.req<{ agents: DecodedEntity[] }>("/agents");
    return agents.map(toAgent);
  }
  async getAgent(agentId: string): Promise<UiAgent | null> {
    const { agent } = await this.req<{ agent: DecodedEntity | null }>(`/agents/${agentId}`);
    return agent ? toAgent(agent) : null;
  }
  async createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
    return this.req<CreateAgentResult>("/agents", { method: "POST", body: JSON.stringify(input) });
  }
  async listSessions(agentId: string): Promise<UiSession[]> {
    const { sessions } = await this.req<{ sessions: DecodedEntity[] }>(`/sessions?agentId=${encodeURIComponent(agentId)}`);
    return sessions.map(toSession);
  }
  async startSession(agentId: string, callerId = "0xOperator"): Promise<{ sessionKey: string }> {
    return this.req("/sessions", { method: "POST", body: JSON.stringify({ agentId, callerId }) });
  }
  async listMessages(sessionKey: string): Promise<UiMessage[]> {
    const { messages } = await this.req<{ messages: DecodedEntity[] }>(`/sessions/${sessionKey}/messages`);
    return messages.map(toMessage);
  }
  async sendMessage(sessionKey: string, text: string): Promise<SendResult> {
    return this.req<SendResult>(`/sessions/${sessionKey}/messages`, { method: "POST", body: JSON.stringify({ text }) });
  }
  async search(agentId: string, term: string, scope?: string): Promise<UiHit[]> {
    const { hits } = await this.req<{ hits: UiHit[] }>("/search", { method: "POST", body: JSON.stringify({ agentId, term, scope }) });
    return hits;
  }
}

const toAgent = (e: DecodedEntity): UiAgent => ({
  key: e.key, agentId: String(e.attrs.agentId), name: e.payload?.name ?? "", description: e.payload?.description ?? "",
  status: String(e.attrs.status ?? "active"), registryChainId: Number(e.attrs.registryChainId ?? 0), createdAt: Number(e.attrs.createdAt ?? 0),
  agentCardUri: String(e.attrs.agentCardUri ?? ""),
});
const toSession = (e: DecodedEntity): UiSession => ({
  key: e.key, agentId: String(e.attrs.agentId), callerId: String(e.attrs.callerId ?? ""), sessionStatus: String(e.attrs.sessionStatus ?? "open"),
  turnCount: Number(e.attrs.turnCount ?? 0), startedAt: Number(e.attrs.startedAt ?? 0), lastActivityAt: Number(e.attrs.lastActivityAt ?? 0),
});
const toMessage = (e: DecodedEntity): UiMessage => ({ key: e.key, role: e.payload?.role ?? "assistant", content: e.payload?.content ?? "", seq: Number(e.attrs.seq ?? 0) });

export const agent = new AgentClient(process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8787");
