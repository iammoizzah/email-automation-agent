// lib/orchestration/replyOrchestrator.ts
import { prisma } from "@/lib/db/prisma";
import { listThreadMessages } from "@/lib/email/gmailClient";
import { runClassifierAgent } from "@/lib/agents/classifierAgent";
import { runSequencerAgent } from "@/lib/agents/sequencerAgent";
import type { ContactInput } from "@/types/email";

const MIN_DAYS_BEFORE_NO_REPLY_FOLLOWUP = 3;

interface ReplyPollResult {
  threadsChecked: number;
  newReplies: number;
  unsubscribes: number;
  followUpsScheduled: number;
}

/**
 * For every contact whose most recent EmailStep has been sent (and no newer
 * step already exists), checks the Gmail thread for a reply, classifies it
 * if new, and asks the Sequencer whether to schedule a follow-up.
 *
 * Hard rule: an 'unsubscribe' classification sets contact.unsubscribed = true
 * directly in code and skips the Sequencer entirely — no agent judgment call.
 */
export async function pollAndProcessReplies(fromEmail: string): Promise<ReplyPollResult> {
  const result: ReplyPollResult = {
    threadsChecked: 0,
    newReplies: 0,
    unsubscribes: 0,
    followUpsScheduled: 0,
  };

  const allSteps = await prisma.emailStep.findMany({
    where: { gmailThreadId: { not: null } },
    include: { contact: true, replies: true },
    orderBy: { stepNumber: "desc" },
  });

  // Keep only the latest step per contact (first occurrence, since sorted desc)
  const latestByContact = new Map<string, (typeof allSteps)[number]>();
  for (const step of allSteps) {
    if (!latestByContact.has(step.contactId)) {
      latestByContact.set(step.contactId, step);
    }
  }

  for (const step of latestByContact.values()) {
    if (step.status !== "sent" || !step.gmailThreadId || step.contact.unsubscribed) continue;

    result.threadsChecked++;

    const messages = await listThreadMessages(fromEmail, step.gmailThreadId);
    const inboundMessages = messages.filter(
      (m) => !m.from.includes(fromEmail) && m.date > (step.sentAt || step.createdAt)
    );

    let replyClassification: string | null = null;
    let replySnippet: string | null = null;

    if (inboundMessages.length > 0 && step.replies.length === 0) {
      const latestReply = inboundMessages[inboundMessages.length - 1];
      const classifierOutput = await runClassifierAgent(latestReply.body);

      await prisma.reply.create({
        data: {
          emailStepId: step.id,
          fromEmail: latestReply.from,
          snippet: latestReply.snippet,
          classification: classifierOutput.classification,
          receivedAt: latestReply.date,
        },
      });

      result.newReplies++;
      replyClassification = classifierOutput.classification;
      replySnippet = latestReply.snippet;

      // HARD RULE — checked in code, not left to the Sequencer's judgment.
      if (classifierOutput.classification === "unsubscribe") {
        await prisma.contact.update({
          where: { id: step.contactId },
          data: { unsubscribed: true },
        });
        result.unsubscribes++;
        continue; // never invoke the Sequencer for an unsubscribed contact
      }
    } else if (step.replies.length > 0) {
      replyClassification = step.replies[step.replies.length - 1].classification;
      replySnippet = step.replies[step.replies.length - 1].snippet;
    }

    const daysSinceSent =
      (Date.now() - (step.sentAt || step.createdAt).getTime()) / (1000 * 60 * 60 * 24);

    const shouldEvaluateFollowUp =
      replyClassification !== null || daysSinceSent >= MIN_DAYS_BEFORE_NO_REPLY_FOLLOWUP;

    if (!shouldEvaluateFollowUp) continue;

    const contactInput: ContactInput = {
      email: step.contact.email,
      firstName: step.contact.firstName ?? undefined,
      lastName: step.contact.lastName ?? undefined,
      company: step.contact.company ?? undefined,
    };

    const sequencerOutput = await runSequencerAgent({
      originalSubject: step.subject,
      originalBody: step.body,
      stepNumber: step.stepNumber,
      replyClassification,
      replySnippet,
      contact: contactInput,
    });

    if (sequencerOutput.shouldSendFollowUp && sequencerOutput.subject && sequencerOutput.body) {
      const sendAt = new Date();
      sendAt.setDate(sendAt.getDate() + (sequencerOutput.daysUntilSend ?? 3));

      await prisma.emailStep.create({
        data: {
          campaignId: step.campaignId,
          contactId: step.contactId,
          stepNumber: step.stepNumber + 1,
          subject: sequencerOutput.subject,
          body: sequencerOutput.body,
          sendAt,
          status: "scheduled",
          gmailThreadId: step.gmailThreadId, // keeps it in the same Gmail conversation
        },
      });
      result.followUpsScheduled++;
    }
  }

  return result;
}
