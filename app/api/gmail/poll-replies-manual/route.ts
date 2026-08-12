// app/api/gmail/poll-replies-manual/route.ts
// UI-triggered manual poll — no cron secret needed, same reasoning as send-now.
import { NextResponse } from "next/server";
import { pollAndProcessReplies } from "@/lib/orchestration/replyOrchestrator";
import { prisma } from "@/lib/db/prisma";

export async function POST() {
  const account = await prisma.gmailAccount.findFirst();
  if (!account) {
    return NextResponse.json(
      { error: "Connect a Gmail account before checking replies." },
      { status: 400 }
    );
  }

  const result = await pollAndProcessReplies(account.email);
  return NextResponse.json(result);
}
