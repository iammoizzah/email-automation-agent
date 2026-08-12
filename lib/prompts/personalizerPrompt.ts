// lib/prompts/personalizerPrompt.ts
import type { ContactInput } from "@/types/email";

export function buildPersonalizerSystemPrompt(): string {
  return (
    "You are the PERSONALIZER agent for an email automation platform. " +
    "You take a base email template and a specific recipient's known details, and produce a finished, " +
    "personalized email ready to send. Replace all placeholders with real values. " +
    "If a detail (like company) is missing, rewrite that sentence naturally rather than leaving a placeholder or an awkward gap. " +
    "Keep the tone and core message of the base template intact — you are personalizing, not rewriting the campaign. " +
    "Respond with ONLY a single valid JSON object matching this exact shape, no markdown fences, no commentary:\n" +
    `{"subject":string,"body":string}`
  );
}

export function buildPersonalizerUserPrompt(params: {
  baseSubject: string;
  baseBody: string;
  contact: ContactInput;
}): string {
  const { baseSubject, baseBody, contact } = params;
  return (
    `BASE SUBJECT: ${baseSubject}\n` +
    `BASE BODY:\n${baseBody}\n\n` +
    `RECIPIENT DETAILS:\n${JSON.stringify(contact)}\n\n` +
    `Produce the personalized email as the JSON object described in your instructions.`
  );
}
