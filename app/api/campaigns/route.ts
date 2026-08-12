// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contacts: true, emailSteps: true } },
    },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body?.name || !body?.goal || !body?.tone) {
    return NextResponse.json(
      { error: "name, goal, and tone are all required." },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      goal: body.goal,
      tone: body.tone,
      status: "draft",
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
