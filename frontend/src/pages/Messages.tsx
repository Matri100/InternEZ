import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { CalendarIcon } from "../components/icons";
import type { ConversationSummary, ConversationThread, InterviewProposal, UpcomingInterview } from "../types/domain";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const DURATIONS = [15, 30, 45, 60];

type TimelineItem =
  | { kind: "message"; at: string; id: string }
  | { kind: "interview"; at: string; id: string };

const PROPOSAL_STATUS_LABEL: Record<InterviewProposal["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(params.get("c"));
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [schedulerError, setSchedulerError] = useState<string | null>(null);
  const [proposalDate, setProposalDate] = useState("");
  const [proposalTime, setProposalTime] = useState("");
  const [proposalDuration, setProposalDuration] = useState(30);
  const [proposalLocation, setProposalLocation] = useState("");
  const [proposalNote, setProposalNote] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(() => {
    api.getConversations().then(setConversations);
  }, []);

  useEffect(() => {
    loadConversations();
    // Light polling instead of websockets — good enough to feel live for a
    // one-on-one inbox without standing up any real-time infrastructure.
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    api.getUpcomingInterviews().then(setUpcomingInterviews);
  }, []);

  const loadThread = useCallback((id: string) => {
    api.getConversationThread(id).then((t) => {
      setThread(t);
      setConversations((prev) => (prev ? prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)) : prev));
    });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const interval = setInterval(() => loadThread(activeId), 6000);
    return () => clearInterval(interval);
  }, [activeId, loadThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length, thread?.interviewProposals.length]);

  function selectConversation(id: string) {
    setActiveId(id);
    setParams({ c: id }, { replace: true });
    setSchedulerOpen(false);
  }

  async function send() {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(activeId, draft.trim());
      setDraft("");
      loadThread(activeId);
      loadConversations();
    } finally {
      setSending(false);
    }
  }

  function openScheduler() {
    const now = new Date(Date.now() + 60 * 60 * 1000);
    setProposalDate(now.toISOString().slice(0, 10));
    setProposalTime(`${String(now.getHours()).padStart(2, "0")}:00`);
    setProposalDuration(30);
    setProposalLocation("");
    setProposalNote("");
    setSchedulerError(null);
    setSchedulerOpen(true);
  }

  async function submitProposal() {
    if (!activeId || !proposalDate || !proposalTime) return;
    const scheduledAt = new Date(`${proposalDate}T${proposalTime}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()) {
      setSchedulerError("Pick a date and time in the future.");
      return;
    }
    setProposing(true);
    setSchedulerError(null);
    try {
      await api.proposeInterview(activeId, {
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: proposalDuration,
        location: proposalLocation.trim(),
        note: proposalNote.trim(),
      });
      setSchedulerOpen(false);
      loadThread(activeId);
    } catch (err) {
      setSchedulerError(err instanceof Error ? err.message : "Couldn't propose that time.");
    } finally {
      setProposing(false);
    }
  }

  async function respond(proposalId: string, response: "accepted" | "declined" | "cancelled") {
    if (!activeId) return;
    setRespondingId(proposalId);
    try {
      await api.respondToInterview(activeId, proposalId, response);
      loadThread(activeId);
    } finally {
      setRespondingId(null);
    }
  }

  if (!conversations) {
    return (
      <div className="page">
        <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Messages</h1>
          </div>
        </div>
        <div className="empty-state">
          <h3>No conversations yet</h3>
          <p>
            {user?.role === "company"
              ? "Message an applicant from your applicants list, or from talent search."
              : "Message a company from one of your applications, or wait for them to reach out."}
          </p>
        </div>
      </div>
    );
  }

  const timeline: TimelineItem[] = thread
    ? [
        ...thread.messages.map((m): TimelineItem => ({ kind: "message", at: m.createdAt, id: m.id })),
        ...thread.interviewProposals.map((p): TimelineItem => ({ kind: "interview", at: p.createdAt, id: p.id })),
      ].sort((a, b) => a.at.localeCompare(b.at))
    : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Messages</h1>
        </div>
      </div>

      {upcomingInterviews && upcomingInterviews.length > 0 && (
        <div className="upcoming-interviews">
          <span className="upcoming-interviews-label">Upcoming interviews</span>
          <div className="upcoming-interviews-list">
            {upcomingInterviews.map((i) => (
              <button type="button" className="upcoming-interview-chip" key={i.id} onClick={() => selectConversation(i.conversationId)}>
                <strong>{formatTime(i.scheduledAt)}</strong>
                <span>{i.otherPartyName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="messages-layout">
        <div className="conversation-list">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`conversation-item ${c.id === activeId ? "active" : ""}`}
              onClick={() => selectConversation(c.id)}
            >
              <span className="conversation-item-name">
                {c.otherParty.name}
                {c.unreadCount > 0 && <span className="unread-dot" aria-label={`${c.unreadCount} unread`} />}
              </span>
              {c.lastMessage && <span className="conversation-item-preview">{c.lastMessage.body}</span>}
            </button>
          ))}
        </div>

        <div className="thread-panel">
          {!thread || thread.id !== activeId ? (
            <div style={{ padding: 24, color: "var(--text-secondary)", fontSize: 13.5 }}>
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="thread-header">{thread.otherParty.name}</div>
              <div className="thread-messages">
                {timeline.map((item) => {
                  if (item.kind === "message") {
                    const m = thread.messages.find((x) => x.id === item.id)!;
                    return (
                      <div key={m.id} className={`thread-message ${m.senderRole === user?.role ? "mine" : "theirs"}`}>
                        {m.body}
                        <span className="thread-message-time">{formatTime(m.createdAt)}</span>
                      </div>
                    );
                  }
                  const p = thread.interviewProposals.find((x) => x.id === item.id)!;
                  const mine = p.proposedBy === user?.role;
                  return (
                    <div key={p.id} className={`interview-card ${mine ? "mine" : "theirs"} status-${p.status}`}>
                      <div className="interview-card-head">
                        <CalendarIcon />
                        <span>Interview proposed</span>
                        <span className={`status-badge ${p.status === "pending" ? "reviewing" : p.status === "accepted" ? "offer" : "rejected"}`}>
                          {PROPOSAL_STATUS_LABEL[p.status]}
                        </span>
                      </div>
                      <div className="interview-card-body">
                        <strong>{formatTime(p.scheduledAt)}</strong> · {p.durationMinutes} min
                        {p.location && <> · {p.location}</>}
                        {p.note && <p style={{ marginTop: 6 }}>{p.note}</p>}
                      </div>
                      {p.status === "pending" && !mine && (
                        <div className="interview-card-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => respond(p.id, "accepted")}
                            disabled={respondingId === p.id}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => respond(p.id, "declined")}
                            disabled={respondingId === p.id}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {p.status === "pending" && mine && (
                        <div className="interview-card-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => respond(p.id, "cancelled")}
                            disabled={respondingId === p.id}
                          >
                            Cancel proposal
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {schedulerOpen && (
                <div className="interview-scheduler">
                  <div className="interview-scheduler-row">
                    <label>
                      <span>Date</span>
                      <input
                        type="date"
                        className="input"
                        value={proposalDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setProposalDate(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Time</span>
                      <input type="time" className="input" value={proposalTime} onChange={(e) => setProposalTime(e.target.value)} />
                    </label>
                    <label>
                      <span>Duration</span>
                      <select
                        className="input"
                        value={proposalDuration}
                        onChange={(e) => setProposalDuration(Number(e.target.value))}
                      >
                        {DURATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d} min
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <input
                    className="input"
                    placeholder="Location or video call link (optional)"
                    value={proposalLocation}
                    onChange={(e) => setProposalLocation(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                  <textarea
                    className="input"
                    placeholder="Note (optional)"
                    value={proposalNote}
                    onChange={(e) => setProposalNote(e.target.value)}
                    style={{ marginTop: 8, minHeight: 50 }}
                  />
                  {schedulerError && <p style={{ color: "var(--blocked)", fontSize: 12.5, marginTop: 6 }}>{schedulerError}</p>}
                  <div className="interview-scheduler-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSchedulerOpen(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={submitProposal}
                      disabled={proposing || !proposalDate || !proposalTime}
                    >
                      {proposing ? "Sending…" : "Propose time"}
                    </button>
                  </div>
                </div>
              )}

              <div className="thread-composer">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm interview-toggle"
                  onClick={() => (schedulerOpen ? setSchedulerOpen(false) : openScheduler())}
                  title="Propose an interview time"
                  aria-label="Propose an interview time"
                >
                  <CalendarIcon />
                </button>
                <textarea
                  className="input"
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <button type="button" className="btn btn-primary" onClick={send} disabled={sending || !draft.trim()}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
