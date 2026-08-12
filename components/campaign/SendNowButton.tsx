// components/campaign/SendNowButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function SendNowButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send-now`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Send failed.");
      } else {
        setResult(`Sent ${data.sent}, skipped ${data.skipped}, failed ${data.failed}.`);
        router.refresh();
      }
    } catch {
      setResult("Network error.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isSending} size="sm">
        {isSending ? "Sending..." : "Send Due Emails Now"}
      </Button>
      {result && <span className="text-xs text-slate-400">{result}</span>}
    </div>
  );
}
