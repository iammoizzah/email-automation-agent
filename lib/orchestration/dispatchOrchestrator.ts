// lib/orchestration/dispatchOrchestrator.ts
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/sender";

interface DispatchResult {
  sent: number;
  skipped: number;
  failed: number;
  details: string[];
}

/**
 * Sends every EmailStep that is due (sendAt <= now, status = scheduled).
 * Hard rule: a contact with unsubscribed = true is NEVER sent to, regardless
 * of what any agent decided — this check happens here, in code, not in a prompt.
 *
 * campaignId is optional — omit it for the global cron dispatch, pass it for
 * a manual "send this campaign now" trigger from the UI.
 */
export async function dispatchDueEmails(
  fromEmail: string,
  campaignId?: string
): Promise<DispatchResult> {
  const dueSteps = await prisma.emailStep.findMany({
    where: {
      status: "scheduled",
      sendAt: { lte: new Date() },
      ...(campaignId ? { campaignId } : {}),
    },
    include: { contact: true },
  });

  const result: DispatchResult = { sent: 0, skipped: 0, failed: 0, details: [] };

  for (const step of dueSteps) {
    // HARD RULE — no agent, no prompt, no judgment call. Checked in code, every time.
    if (step.contact.unsubscribed) {
      await prisma.emailStep.update({
        where: { id: step.id },
        data: { status: "skipped", errorMessage: "Contact has unsubscribed." },
      });
      await prisma.sendLog.create({
        data: { emailStepId: step.id, status: "skipped", message: "Contact unsubscribed." },
      });
      result.skipped++;
      continue;
    }

    try {
      const sendResult = await sendEmail({
        fromEmail,
        toEmail: step.contact.email,
        subject: step.subject,
        body: step.body,
        threadId: step.gmailThreadId,
      });

      await prisma.emailStep.update({
        where: { id: step.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          gmailMessageId: sendResult.messageId,
          gmailThreadId: sendResult.threadId,
        },
      });
      await prisma.sendLog.create({
        data: { emailStepId: step.id, status: "sent", message: `Sent as ${sendResult.messageId}` },
      });
      result.sent++;
      result.details.push(`Sent to ${step.contact.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown send error";
      await prisma.emailStep.update({
        where: { id: step.id },
        data: { status: "failed", errorMessage: message },
      });
      await prisma.sendLog.create({
        data: { emailStepId: step.id, status: "failed", message },
      });
      result.failed++;
      result.details.push(`Failed to ${step.contact.email}: ${message}`);
    }
  }

  return result;
}
