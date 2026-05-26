// components/knowledge/KnowledgePanel.tsx
"use client";
import { Search, Lock, Share2, Clock } from "lucide-react";
import { useState } from "react";
import type { UiSummary } from "@/lib/agentClient";
import { GlowCard } from "@/components/ui/GlowCard";
import { AgentCombobox } from "@/components/agents/AgentCombobox";
import {
  useEncryptAndShare,
  useSharedWithMe,
  useOutgoingGrants,
  useRevokeGrant,
  useExtendGrant,
} from "@/lib/hooks/useAccess";

// ─── helpers ─────────────────────────────────────────────────────────────────

function countdown(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

// ─── ShareSummary ─────────────────────────────────────────────────────────────

function ShareSummary({ agentId, summary }: { agentId: string; summary: UiSummary }) {
  const [open, setOpen] = useState(false);
  const [granteeAgentId, setGranteeAgentId] = useState("");
  const [expiresInSec, setExpiresInSec] = useState(86400);
  const [customMin, setCustomMin] = useState<string>("");

  const share = useEncryptAndShare(agentId);

  function effectiveSeconds(): number {
    const m = Number(customMin);
    if (Number.isFinite(m) && m > 0) return Math.floor(m * 60);
    return expiresInSec;
  }

  function handleShare() {
    if (!granteeAgentId) return;
    share.mutate(
      {
        sessionKey: summary.sessionKey,
        summarySeq: summary.summarySeq,
        summary: summary.summary,
        topics: summary.topics,
        originalKey: summary.key,
        granteeAgentId,
        expiresInSec: effectiveSeconds(),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setGranteeAgentId("");
          setExpiresInSec(86400);
          setCustomMin("");
        },
      }
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 font-sans text-xs text-fg-muted transition hover:text-fg"
        >
          <Lock size={12} />
          Encrypt &amp; share
        </button>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <AgentCombobox
            value={granteeAgentId}
            onChange={setGranteeAgentId}
            excludeAgentId={agentId}
          />

          <select
            value={expiresInSec}
            onChange={(e) => { setExpiresInSec(Number(e.target.value)); setCustomMin(""); }}
            disabled={!!customMin}
            className="input w-auto py-1.5 text-xs disabled:opacity-50"
          >
            <option value={60}>1 minute</option>
            <option value={180}>3 minutes</option>
            <option value={600}>10 minutes</option>
            <option value={1800}>30 minutes</option>
            <option value={3600}>1 hour</option>
            <option value={86400}>24 hours</option>
            <option value={604800}>7 days</option>
          </select>

          <input
            type="number"
            min={1}
            placeholder="custom min"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="input w-24 py-1.5 text-xs"
            title="Custom expiry in minutes (overrides the preset)"
          />

          <button
            onClick={handleShare}
            disabled={!granteeAgentId || share.isPending}
            className="btn-primary py-1.5 text-xs"
          >
            <Share2 size={12} />
            {share.isPending ? "Encrypting…" : "Share"}
          </button>

          <button
            onClick={() => { setOpen(false); setGranteeAgentId(""); }}
            className="font-sans text-xs text-fg-muted transition hover:text-fg"
          >
            Cancel
          </button>

          {share.isError && (
            <span className="w-full font-sans text-xs text-[var(--danger)]">
              {share.error instanceof Error ? share.error.message : "Share failed"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── GrantsSection ────────────────────────────────────────────────────────────

function GrantsSection({ agentId: _agentId }: { agentId: string }) {
  const sharedWithMe = useSharedWithMe();
  const outgoing = useOutgoingGrants();
  const revoke = useRevokeGrant();
  const extend = useExtendGrant();

  return (
    <div className="mt-8 space-y-6">
      {/* Shared with me */}
      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-fg-muted">
          Shared with me
        </h2>
        {sharedWithMe.isLoading && (
          <p className="font-mono text-sm text-fg-muted">Loading…</p>
        )}
        {!sharedWithMe.isLoading && (sharedWithMe.data ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center font-sans text-sm text-fg-muted">
            Nothing shared with you yet.
          </div>
        )}
        <ul className="space-y-3">
          {(sharedWithMe.data ?? []).map((g) => (
            <GlowCard key={g.grantKey} variant="accent" glow={false} className="p-4">
              <p className="font-sans text-sm text-fg">{g.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] text-fg-faint">
                  from agent {g.granterAgentId}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-fg-faint">
                  <Clock size={10} />
                  {countdown(g.expiresAt)}
                </span>
              </div>
            </GlowCard>
          ))}
        </ul>
      </section>

      {/* Shared by me */}
      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-fg-muted">
          Shared by me
        </h2>
        {outgoing.isLoading && (
          <p className="font-mono text-sm text-fg-muted">Loading…</p>
        )}
        {!outgoing.isLoading && (outgoing.data ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center font-sans text-sm text-fg-muted">
            You haven&apos;t shared anything yet.
          </div>
        )}
        <ul className="space-y-2">
          {(outgoing.data ?? []).map((g) => (
            <div
              key={g.grantKey}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-sans text-sm text-fg-muted">
                  to agent{" "}
                  <span className="font-mono text-fg">{g.granteeAgentId}</span>
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-fg-faint">
                  <Clock size={10} />
                  {countdown(g.expiresAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => extend.mutate({ grantKey: g.grantKey, expiresInSec: 86400 })}
                  disabled={extend.isPending}
                  className="btn-ghost py-1 text-xs"
                >
                  Extend 24h
                </button>
                <button
                  onClick={() => revoke.mutate(g.grantKey)}
                  disabled={revoke.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/[0.06] px-3 py-1 font-sans text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ─── KnowledgePanel ───────────────────────────────────────────────────────────

export function KnowledgePanel({
  agentId,
  summaries,
  loading,
  topicResults,
  searching,
  onTopicSearch,
}: {
  agentId: string;
  summaries: UiSummary[];
  loading: boolean;
  topicResults: string[] | null;
  searching: boolean;
  onTopicSearch: (topic: string) => void;
}) {
  const [topic, setTopic] = useState("");
  return (
    <div className="p-6">
      <h1 className="mb-1 font-display text-3xl font-bold tracking-tight text-fg">Knowledge</h1>
      <p className="mb-5 font-sans text-sm text-fg-muted">
        Past session summaries and topic graph built by RAG when sessions close.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onTopicSearch(topic);
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Fetch summaries by topic…"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={searching || !topic}
          aria-label="Topic search"
          className="btn-primary"
        >
          <Search size={16} /> Topic Fetch
        </button>
      </form>

      {topicResults !== null && (
        <section className="mb-6">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-fg-muted">
            Topic results ({topicResults.length})
          </h2>
          {topicResults.length === 0 && (
            <p className="font-sans text-sm text-fg-muted">No summaries matched that topic.</p>
          )}
          <ul className="space-y-2">
            {topicResults.map((s, i) => (
              <li
                key={i}
                className="rounded-xl border border-accent/30 bg-accent/[0.06] p-3 font-sans text-sm text-fg"
              >
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-fg-muted">
        Session summaries
      </h2>
      {loading && <p className="font-mono text-sm text-fg-muted">Loading…</p>}
      {!loading && summaries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center font-sans text-fg-muted">
          No summaries yet. End a session to index its summary and topics.
        </div>
      )}
      <ul className="space-y-3">
        {summaries.map((s) => (
          <GlowCard key={s.key} variant="accent" glow={false} className="p-4">
            <div className="mb-1 font-mono text-[11px] text-fg-faint">
              session {s.sessionKey.slice(0, 12)}…
            </div>
            <div className="font-sans text-sm text-fg">{s.summary}</div>
            {s.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {s.topics.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <ShareSummary agentId={agentId} summary={s} />
          </GlowCard>
        ))}
      </ul>

      <GrantsSection agentId={agentId} />
    </div>
  );
}
