// lib/orchestration/campaignOrchestrator.ts
import { prisma } from "@/lib/db/prisma";
import { runComposerAgent } from "@/lib/agents/composerAgent";
import { runPersonalizerAgent } from "@/lib/agents/personalizerAgent";
import type { CampaignConfig, ContactInput } from "@/types/email";

/**
 * Runs the Composer agent once for a campaign, saves the base template,
 * and returns it. Does not touch contacts — call generatePersonalizedDrafts
 * separately once contacts are added.
 */
export async function generateBaseTemplate(campaignId: string, config: CampaignConfig) {
  const composerOutput = await runComposerAgent(config);

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      baseSubject: composerOutput.subject,
      baseBody: composerOutput.body,
    },
  });

  return composerOutput;
}

/**
 * Runs the Personalizer agent for every contact on a campaign, in parallel,
 * and creates a scheduled (step 1) EmailStep for each. Contacts that already
 * have a step-1 EmailStep are skipped, so this is safe to re-run.
 */
export async function generatePersonalizedDrafts(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { contacts: true },
  });

  if (!campaign || !campaign.baseSubject || !campaign.baseBody) {
    throw new Error("Campaign must have a base template before generating drafts.");
  }

  const existingStepOne = await prisma.emailStep.findMany({
    where: { campaignId, stepNumber: 1 },
    select: { contactId: true },
  });
  const alreadyDrafted = new Set(existingStepOne.map((s) => s.contactId));

  const contactsToProcess = campaign.contacts.filter(
    (c) => !c.unsubscribed && !alreadyDrafted.has(c.id)
  );

  const results = await Promise.allSettled(
    contactsToProcess.map((contact) => {
      const contactInput: ContactInput = {
        email: contact.email,
        firstName: contact.firstName ?? undefined,
        lastName: contact.lastName ?? undefined,
        company: contact.company ?? undefined,
      };
      return runPersonalizerAgent({
        baseSubject: campaign.baseSubject!,
        baseBody: campaign.baseBody!,
        contact: contactInput,
      }).then((draft) => ({ contact, draft }));
    })
  );

  const succeeded: { contactId: string; email: string }[] = [];
  const failed: { email: string; reason: string }[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { contact, draft } = result.value;
      await prisma.emailStep.create({
        data: {
          campaignId,
          contactId: contact.id,
          stepNumber: 1,
          subject: draft.subject,
          body: draft.body,
          sendAt: new Date(), // picked up by the next dispatch run
          status: "scheduled",
        },
      });
      succeeded.push({ contactId: contact.id, email: contact.email });
    } else {
      failed.push({
        email: "unknown",
        reason: result.reason instanceof Error ? result.reason.message : "Unknown error",
      });
    }
  }

  return { succeeded, failed };
}
