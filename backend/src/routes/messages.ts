import { Router } from "express";
import { db } from "../models/store.js";
import { writeLimiter } from "../middleware/rateLimit.js";

export const messagesRouter = Router();

const MAX_MESSAGE_LENGTH = 4000;

messagesRouter.get("/conversations", async (req, res) => {
  const conversations = await db.listConversations(req.session.userId!, req.session.role!);
  res.json(conversations);
});

// Surfaces every accepted, still-upcoming interview across all of this
// user's conversations in one place — otherwise it only lives inside
// whichever single thread it was scheduled in.
messagesRouter.get("/interviews/upcoming", async (req, res) => {
  const interviews = await db.listUpcomingInterviews(req.session.userId!, req.session.role!);
  res.json(interviews);
});

// Starts (or reuses) a conversation. Applicants can message any company;
// companies can only reach applicants who opted into discovery or who
// applied to one of their listings — the same boundary "poke" respects.
messagesRouter.post("/conversations", writeLimiter, async (req, res) => {
  const role = req.session.role!;
  const userId = req.session.userId!;
  const { otherPartyId } = req.body ?? {};
  if (typeof otherPartyId !== "string" || !otherPartyId) {
    res.status(400).json({ error: "otherPartyId is required" });
    return;
  }

  let applicantId: string;
  let companyId: string;

  if (role === "applicant") {
    const company = await db.getCompany(otherPartyId);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    applicantId = userId;
    companyId = otherPartyId;
  } else {
    const applicant = await db.getApplicant(otherPartyId);
    if (!applicant) {
      res.status(404).json({ error: "Applicant not found" });
      return;
    }
    const allowed = applicant.discoverable || (await db.hasApplicantAppliedToCompany(otherPartyId, userId));
    if (!allowed) {
      res.status(403).json({ error: "You can only message applicants who applied to your listings or opted into discovery" });
      return;
    }
    applicantId = otherPartyId;
    companyId = userId;
  }

  const conversation = await db.getOrCreateConversation(applicantId, companyId);
  const summary = await db.summarizeConversation(conversation, role);
  res.status(201).json(summary);
});

messagesRouter.get("/conversations/:id/messages", async (req, res) => {
  const role = req.session.role!;
  const userId = req.session.userId!;
  const conversation = await db.getConversationById(req.params.id);
  if (!conversation || !(await db.isConversationParticipant(conversation.id, userId, role))) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.markMessagesRead(conversation.id, role);
  const [messages, interviewProposals, summary] = await Promise.all([
    db.listMessages(conversation.id),
    db.listInterviewProposals(conversation.id),
    db.summarizeConversation(conversation, role),
  ]);
  if (!summary) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json({ ...summary, messages, interviewProposals });
});

messagesRouter.post("/conversations/:id/messages", writeLimiter, async (req, res) => {
  const role = req.session.role!;
  const userId = req.session.userId!;
  const { body } = req.body ?? {};
  if (typeof body !== "string" || !body.trim()) {
    res.status(400).json({ error: "Message body is required" });
    return;
  }
  if (body.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    return;
  }

  const conversation = await db.getConversationById(req.params.id);
  if (!conversation || !(await db.isConversationParticipant(conversation.id, userId, role))) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const message = await db.sendMessage(conversation.id, role, body.trim());
  res.status(201).json(message);
});

// --- Interview proposals ---
// Live inside the conversation, not a separate calendar — either side can
// propose a time, only the other side can accept or decline it.

function otherParticipant(conversation: { applicantId: string; companyId: string }, role: "applicant" | "company") {
  return role === "applicant"
    ? { userId: conversation.companyId, role: "company" as const }
    : { userId: conversation.applicantId, role: "applicant" as const };
}

function formatScheduledAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

messagesRouter.post("/conversations/:id/interviews", writeLimiter, async (req, res) => {
  const role = req.session.role!;
  const userId = req.session.userId!;
  const conversation = await db.getConversationById(req.params.id);
  if (!conversation || !(await db.isConversationParticipant(conversation.id, userId, role))) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const { scheduledAt, durationMinutes, location, note } = req.body ?? {};
  if (typeof scheduledAt !== "string" || Number.isNaN(Date.parse(scheduledAt))) {
    res.status(400).json({ error: "A valid scheduledAt datetime is required" });
    return;
  }
  if (Date.parse(scheduledAt) < Date.now() - 60_000) {
    res.status(400).json({ error: "Proposed time must be in the future" });
    return;
  }

  const proposal = await db.createInterviewProposal({
    conversationId: conversation.id,
    proposedBy: role,
    scheduledAt,
    durationMinutes: Number.isFinite(Number(durationMinutes)) && Number(durationMinutes) > 0 ? Math.round(Number(durationMinutes)) : 30,
    location: typeof location === "string" ? location.slice(0, 200) : "",
    note: typeof note === "string" ? note.slice(0, 500) : "",
  });

  const other = otherParticipant(conversation, role);
  await db.createNotification({
    userId: other.userId,
    role: other.role,
    type: "interview_proposed",
    title: "Interview proposed",
    body: `A new interview time was proposed: ${formatScheduledAt(proposal.scheduledAt)}.`,
    link: `/messages?c=${conversation.id}`,
  });

  res.status(201).json(proposal);
});

messagesRouter.post("/conversations/:id/interviews/:proposalId/respond", async (req, res) => {
  const role = req.session.role!;
  const userId = req.session.userId!;
  const conversation = await db.getConversationById(req.params.id);
  if (!conversation || !(await db.isConversationParticipant(conversation.id, userId, role))) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const proposal = await db.getInterviewProposal(req.params.proposalId);
  if (!proposal || proposal.conversationId !== conversation.id) {
    res.status(404).json({ error: "Proposal not found" });
    return;
  }

  const { response } = req.body ?? {};
  const isProposer = proposal.proposedBy === role;
  if (response === "cancelled") {
    // Only the proposer can withdraw their own still-pending proposal.
    if (!isProposer) {
      res.status(403).json({ error: "Only the proposer can cancel this proposal" });
      return;
    }
  } else if (response === "accepted" || response === "declined") {
    // Only the other participant can accept/decline — proposing side waits.
    if (isProposer) {
      res.status(403).json({ error: "Wait for the other side to respond" });
      return;
    }
  } else {
    res.status(400).json({ error: "response must be accepted, declined, or cancelled" });
    return;
  }

  const updated = await db.respondToInterviewProposal(proposal.id, response);
  if (!updated) {
    res.status(409).json({ error: "This proposal was already responded to" });
    return;
  }

  if (response !== "cancelled") {
    const proposerParticipant = otherParticipant(conversation, role); // responder's counterpart == proposer
    await db.createNotification({
      userId: proposerParticipant.userId,
      role: proposerParticipant.role,
      type: "interview_responded",
      title: response === "accepted" ? "Interview accepted" : "Interview declined",
      body: `Your proposed interview for ${formatScheduledAt(updated.scheduledAt)} was ${response}.`,
      link: `/messages?c=${conversation.id}`,
    });
  }

  res.json(updated);
});
