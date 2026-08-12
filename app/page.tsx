// app/page.tsx
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  completed: "info",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { gmail_connected?: string; gmail_error?: string };
}) {
  const [campaigns, gmailAccount] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contacts: true, emailSteps: true } } },
    }),
    prisma.gmailAccount.findFirst(),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">📧 Email Automation Agent</h1>
            <p className="text-sm text-slate-400">
              AI-drafted, personalized, sequenced email campaigns.
            </p>
          </div>
          <a href="/campaigns/new">
            <Button>+ New Campaign</Button>
          </a>
        </div>

        {searchParams.gmail_connected && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✅ Connected Gmail: {searchParams.gmail_connected}
          </div>
        )}
        {searchParams.gmail_error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            ⚠️ Gmail connection failed: {searchParams.gmail_error}
          </div>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-300">Gmail Connection</p>
              <p className="text-sm text-slate-500">
                {gmailAccount ? `Connected as ${gmailAccount.email}` : "No account connected yet"}
              </p>
            </div>
            <a href="/api/gmail/connect">
              <Button variant="secondary" size="sm">
                {gmailAccount ? "Reconnect" : "Connect Gmail"}
              </Button>
            </a>
          </div>
        </Card>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Campaigns
          </p>
          {campaigns.length === 0 && (
            <p className="text-sm text-slate-500">No campaigns yet — create your first one.</p>
          )}
          {campaigns.map((c) => (
            <a key={c.id} href={`/campaigns/${c.id}`}>
              <Card className="p-4 transition-colors hover:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-100">{c.name}</p>
                    <p className="text-sm text-slate-500">{c.goal}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {c._count.contacts} contacts
                    </span>
                    <Badge tone={STATUS_TONE[c.status] || "neutral"}>{c.status}</Badge>
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
