// app/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SendNowButton } from "@/components/campaign/SendNowButton";

const STEP_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  scheduled: "info",
  sent: "success",
  failed: "danger",
  skipped: "warning",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      contacts: true,
      emailSteps: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!campaign) notFound();

  const stepsByContact = new Map<string, typeof campaign.emailSteps>();
  for (const step of campaign.emailSteps) {
    const list = stepsByContact.get(step.contactId) || [];
    list.push(step);
    stepsByContact.set(step.contactId, list);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <a href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← All campaigns
        </a>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-slate-500">{campaign.goal}</p>
          </div>
          <SendNowButton campaignId={campaign.id} />
        </div>

        {campaign.baseSubject && campaign.baseBody && (
          <Card className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Base Template
            </p>
            <p className="mb-1 text-sm font-medium text-slate-200">{campaign.baseSubject}</p>
            <p className="whitespace-pre-wrap text-sm text-slate-400">{campaign.baseBody}</p>
          </Card>
        )}

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contacts ({campaign.contacts.length})
          </p>
          {campaign.contacts.map((contact) => {
            const steps = stepsByContact.get(contact.id) || [];
            const latestStep = steps[steps.length - 1];
            return (
              <Card key={contact.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {contact.firstName || contact.email} {contact.company ? `— ${contact.company}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">{contact.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.unsubscribed && <Badge tone="danger">unsubscribed</Badge>}
                    {latestStep && (
                      <Badge tone={STEP_STATUS_TONE[latestStep.status] || "neutral"}>
                        step {latestStep.stepNumber} · {latestStep.status}
                      </Badge>
                    )}
                  </div>
                </div>
                {latestStep && (
                  <div className="mt-3 rounded-lg bg-slate-950/50 p-3">
                    <p className="mb-1 text-xs font-medium text-slate-300">{latestStep.subject}</p>
                    <p className="whitespace-pre-wrap text-xs text-slate-500">{latestStep.body}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
