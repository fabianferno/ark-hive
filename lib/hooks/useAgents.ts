// lib/hooks/useAgents.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AgentClient, agent as defaultAgent, CreateAgentInput } from "@/lib/agentClient";

export function useAgentsList(client: AgentClient = defaultAgent) {
  return useQuery({ queryKey: ["agents"], queryFn: () => client.listAgents() });
}
export function useAgent(agentId: string, client: AgentClient = defaultAgent) {
  return useQuery({ queryKey: ["agent", agentId], queryFn: () => client.getAgent(agentId) });
}
export function useCreateAgent(client: AgentClient = defaultAgent) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInput) => client.createAgent(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}
export function useSessions(agentId: string, client: AgentClient = defaultAgent) {
  return useQuery({ queryKey: ["sessions", agentId], queryFn: () => client.listSessions(agentId), enabled: !!agentId });
}
export function useStartSession(agentId: string, client: AgentClient = defaultAgent) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.startSession(agentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", agentId] }),
  });
}
export function useMessages(sessionKey: string, client: AgentClient = defaultAgent) {
  return useQuery({ queryKey: ["messages", sessionKey], queryFn: () => client.listMessages(sessionKey), enabled: !!sessionKey });
}
export function useSendMessage(sessionKey: string, client: AgentClient = defaultAgent) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => client.sendMessage(sessionKey, text),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", sessionKey] }),
  });
}
export function useSearch(client: AgentClient = defaultAgent) {
  return useMutation({ mutationFn: ({ agentId, term, scope }: { agentId: string; term: string; scope?: string }) => client.search(agentId, term, scope) });
}
