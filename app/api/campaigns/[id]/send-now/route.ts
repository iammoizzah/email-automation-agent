// app/api/campaigns/[id]/send-now/route.ts
// Manual trigger from the UI — scoped to one campaign, no cron secret needed
// since it's a same-app authenticated action, not an external scheduled call.
import { NextRequest, NextResponse } from "next/server";
import { dispatchDueEmails } from "@/lib/orchestration/dispatchOrchestrator";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const account = await prisma.gmailAccount.findFirst();
  if (!account) {
    return NextResponse.json(
      { error: "Connect a Gmail account before sending." },
      { status: 400 }
    );
  }

  const result = await dispatchDueEmails(account.email, params.id);
  return NextResponse.json(result);
}
