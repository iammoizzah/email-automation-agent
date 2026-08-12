// app/campaigns/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("friendly");
  const [contactsRaw, setContactsRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function parseContacts() {
    return contactsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [email, firstName, lastName, company] = line.split(",").map((s) => s?.trim());
        return { email, firstName, lastName, company };
      })
      .filter((c) => c.email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const contacts = parseContacts();
    if (!name.trim() || !goal.trim() || contacts.length === 0) {
      setError("Name, goal, and at least one contact are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      setStatus("Creating campaign...");
      const campaignRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, tone }),
      });
      const campaignData = await campaignRes.json();
      if (!campaignRes.ok) throw new Error(campaignData.error || "Could not create campaign.");
      const campaignId = campaignData.campaign.id;

      setStatus("Adding contacts...");
      const contactsRes = await fetch(`/api/campaigns/${campaignId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      if (!contactsRes.ok) throw new Error("Could not add contacts.");

      setStatus("Generating AI drafts for every contact — this can take a moment...");
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const generateData = await generateRes.json();
      if (!generateRes.ok) throw new Error(generateData.error || "Could not generate drafts.");

      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
      setStatus(null);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">New Campaign</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Card className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Campaign name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q3 Product Launch Outreach"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Goal — what is this email trying to achieve?
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="Introduce our new analytics feature to existing customers and invite them to a demo call"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="direct">Direct</option>
                <option value="enthusiastic">Enthusiastic</option>
              </select>
            </div>
          </Card>

          <Card className="space-y-2 p-5">
            <label className="block text-sm font-medium text-slate-700">
              Contacts — one per line: email, first name, last name, company
            </label>
            <textarea
              value={contactsRaw}
              onChange={(e) => setContactsRaw(e.target.value)}
              rows={6}
              placeholder={"jane@acme.com, Jane, Doe, Acme Inc\njohn@beta.com, John, Smith, Beta Co"}
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-600">
              Only email is required — leave the rest blank if unknown.
            </p>
          </Card>

          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}
          {status && (
            <p className="text-sm text-slate-700">{status}</p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : "Create Campaign & Generate Drafts"}
          </Button>
        </form>
      </div>
    </main>
  );
}
