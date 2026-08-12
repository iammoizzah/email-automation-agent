// lib/prompts/composerPrompt.ts
import type { CampaignConfig } from "@/types/email";

export function buildComposerSystemPrompt(): string {
  return (
    "You are the COMPOSER agent for an email automation platform. " +
    "You write ONE base email template for a campaign, meant to be personalized per-recipient later. " +
    "Use {{firstName}}, {{company}}, and {{lastName}} as placeholders wherever personalization would naturally go — " +
    "do not invent facts about the recipient beyond these placeholders. " +
    "Keep it concise, human-sounding, and free of spammy language (no ALL CAPS, no excessive exclamation points, no 'act now' urgency tactics). " +
    "Respond with ONLY a single valid JSON object matching this exact shape, no markdown fences, no commentary:\n" +
    `{"subject":string,"body":string,"placeholders":string[]}`
  );
}

export function buildComposerUserPrompt(config: CampaignConfig): string {
  return (
    `CAMPAIGN GOAL: ${config.goal}\n` +
    `TONE: ${config.tone}\n\n` +
    `Write the base email template for this campaign as the JSON object described in your instructions.`
  );
}
