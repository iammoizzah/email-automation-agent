// app/api/gmail/poll-replies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pollAndProcessReplies } from "@/lib/orchestration/replyOrchestrator";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const account = await prisma.gmailAccount.findFirst();
  if (!account) {
    return NextResponse.json({ error: "No connected Gmail account." }, { status: 400 });
  }

  const result = await pollAndProcessReplies(account.email);
  return NextResponse.json(result);
}
