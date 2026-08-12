// lib/agents/composerAgent.ts
import { generateStructured } from "@/lib/llm/client";
import { composerOutputSchema } from "@/lib/validation/schemas";
import { buildComposerSystemPrompt, buildComposerUserPrompt } from "@/lib/prompts/composerPrompt";
import type { CampaignConfig } from "@/types/email";

export async function runComposerAgent(config: CampaignConfig) {
  return generateStructured(
    {
      system: buildComposerSystemPrompt(),
      user: buildComposerUserPrompt(config),
      maxTokens: 800,
    },
    composerOutputSchema
  );
}
