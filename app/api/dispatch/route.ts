// app/api/dispatch/route.ts
// Triggered by an external cron (e.g. Vercel Cron) on a schedule — sends
// whatever is due across ALL campaigns for the first connected Gmail account.
import { NextRequest, NextResponse } from "next/server";
import { dispatchDueEmails } from "@/lib/orchestration/dispatchOrchestrator";
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

  const result = await dispatchDueEmails(account.email);
  return NextResponse.json(result);
}
