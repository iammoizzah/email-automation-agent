// app/api/campaigns/[id]/contacts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { ContactInput } from "@/types/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const contacts: ContactInput[] = body?.contacts;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return NextResponse.json({ error: "contacts array is required." }, { status: 400 });
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const c of contacts) {
    if (!c.email || !c.email.includes("@")) {
      skipped.push(c.email || "(missing email)");
      continue;
    }
    try {
      await prisma.contact.create({
        data: {
          campaignId: params.id,
          email: c.email.trim(),
          firstName: c.firstName?.trim() || null,
          lastName: c.lastName?.trim() || null,
          company: c.company?.trim() || null,
        },
      });
      created.push(c.email);
    } catch {
      // Likely a duplicate (campaignId + email unique constraint) — skip, don't fail the batch
      skipped.push(c.email);
    }
  }

  return NextResponse.json({ created, skipped });
}
