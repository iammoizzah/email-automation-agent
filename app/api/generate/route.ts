// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  generateBaseTemplate,
  generatePersonalizedDrafts,
} from "@/lib/orchestration/campaignOrchestrator";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const campaignId = body?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  try {
    if (!campaign.baseSubject || !campaign.baseBody) {
      await generateBaseTemplate(campaignId, {
        name: campaign.name,
        goal: campaign.goal,
        tone: campaign.tone,
      });
    }

    const result = await generatePersonalizedDrafts(campaignId);

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
