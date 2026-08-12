// app/api/campaigns/[id]/send-now/route.ts
import { NextRequest, NextResponse } from "next/server";
import { dispatchDueEmails } from "@/lib/orchestration/dispatchOrchestrator";
import { prisma } from "@/lib/db/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const account = await prisma.gmailAccount.findFirst();
  if (!account) {
    return NextResponse.json(
      { error: "Connect a Gmail account before sending." },
      { status: 400 }
    );
  }

  const result = await dispatchDueEmails(account.email, id);
  return NextResponse.json(result);
}
