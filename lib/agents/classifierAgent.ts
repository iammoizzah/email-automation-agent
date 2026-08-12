// lib/agents/classifierAgent.ts
import { generateStructured } from "@/lib/llm/client";
import { classifierOutputSchema } from "@/lib/validation/schemas";
import { buildClassifierSystemPrompt, buildClassifierUserPrompt } from "@/lib/prompts/classifierPrompt";

export async function runClassifierAgent(replyText: string) {
  return generateStructured(
    {
      system: buildClassifierSystemPrompt(),
      user: buildClassifierUserPrompt(replyText),
      maxTokens: 300,
    },
    classifierOutputSchema
  );
}
