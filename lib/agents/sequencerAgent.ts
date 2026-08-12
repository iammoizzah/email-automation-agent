// lib/agents/sequencerAgent.ts
import { generateStructured } from "@/lib/llm/client";
import { sequencerOutputSchema } from "@/lib/validation/schemas";
import { buildSequencerSystemPrompt, buildSequencerUserPrompt } from "@/lib/prompts/sequencerPrompt";

export async function runSequencerAgent(params: {
  originalSubject: string;
  originalBody: string;
  stepNumber: number;
  replyClassification: string | null;
  replySnippet: string | null;
}) {
  return generateStructured(
    {
      system: buildSequencerSystemPrompt(),
      user: buildSequencerUserPrompt(params),
      maxTokens: 600,
    },
    sequencerOutputSchema
  );
}
