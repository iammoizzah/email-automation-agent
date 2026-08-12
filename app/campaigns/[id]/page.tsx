// app/campaigns/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SendNowButton } from "@/components/campaign/SendNowButton";
import { PollRepliesButton } from "@/components/campaign/PollRepliesButton";

const STEP_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  scheduled: "info",
  sent: "success",
  failed: "danger",
  skipped: "warning",
};

const CLASSIFICATION_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  interested: "success",
  not_interested: "warning",
  out_of_office: "neutral",
  unsubscribe: "danger",
  neutral: "info",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      contacts: true,
      emailSteps: {
        orderBy: { createdAt: "asc" },
        include: { replies: { orderBy: { receivedAt: "desc" }, take: 1 } },
      },
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
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <a href="/" className="text-sm text-slate-600 hover:text-slate-700">
          ← All campaigns
        </a>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
            <p className="text-sm text-slate-700">{campaign.goal}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SendNowButton campaignId={campaign.id} />
            <PollRepliesButton />
          </div>
        </div>

        {campaign.baseSubject && campaign.baseBody && (
          <Card className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Base Template
            </p>
            <p className="mb-1 text-sm font-medium text-slate-800">{campaign.baseSubject}</p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{campaign.baseBody}</p>
          </Card>
        )}

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Contacts ({campaign.contacts.length})
          </p>
          {campaign.contacts.map((contact) => {
            const steps = stepsByContact.get(contact.id) || [];
            const latestStep = steps[steps.length - 1];
            const latestReply = latestStep?.replies?.[0];
            return (
              <Card key={contact.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {contact.firstName || contact.email} {contact.company ? `— ${contact.company}` : ""}
                    </p>
                    <p className="text-xs text-slate-600">{contact.email}</p>
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
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-medium text-slate-700">{latestStep.subject}</p>
                    <p className="whitespace-pre-wrap text-xs text-slate-700">{latestStep.body}</p>
                  </div>
                )}

                {latestReply && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">Latest reply</span>
                        {latestReply.classification && (
                          <Badge tone={CLASSIFICATION_TONE[latestReply.classification] || "neutral"}>
                            {latestReply.classification.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-700">{latestReply.snippet}</p>
                    </div>
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
