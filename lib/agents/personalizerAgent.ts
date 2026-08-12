// lib/agents/personalizerAgent.ts
import { generateStructured } from "@/lib/llm/client";
import { personalizerOutputSchema } from "@/lib/validation/schemas";
import {
  buildPersonalizerSystemPrompt,
  buildPersonalizerUserPrompt,
} from "@/lib/prompts/personalizerPrompt";
import type { ContactInput } from "@/types/email";

export async function runPersonalizerAgent(params: {
  baseSubject: string;
  baseBody: string;
  contact: ContactInput;
}) {
  return generateStructured(
    {
      system: buildPersonalizerSystemPrompt(),
      user: buildPersonalizerUserPrompt(params),
      maxTokens: 800,
    },
    personalizerOutputSchema
  );
}
