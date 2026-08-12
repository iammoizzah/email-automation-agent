// components/campaign/PollRepliesButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PollRepliesButton() {
  const router = useRouter();
  const [isPolling, setIsPolling] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setIsPolling(true);
    setResult(null);
    try {
      const res = await fetch("/api/gmail/poll-replies-manual", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error || "Poll failed.");
      } else {
        setResult(
          `Checked ${data.threadsChecked}, ${data.newReplies} new replies, ${data.followUpsScheduled} follow-ups scheduled.`
        );
        router.refresh();
      }
    } catch {
      setResult("Network error.");
    } finally {
      setIsPolling(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isPolling} variant="secondary" size="sm">
        {isPolling ? "Checking..." : "Check for Replies"}
      </Button>
      {result && <span className="text-xs text-slate-700">{result}</span>}
    </div>
  );
}
