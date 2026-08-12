// lib/llm/providers/anthropic.ts
import Anthropic from "@anthropic-ai/sdk";
import type { LLMRequest } from "../client";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn(
    "ANTHROPIC_API_KEY is not set. Set it in .env.local before generating any content."
  );
}

const client = new Anthropic({ apiKey });

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export async function callAnthropic(req: LLMRequest): Promise<string> {
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: req.maxTokens ?? 1500,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Anthropic response");
    }
    return textBlock.text;
  } catch (err: any) {
    if (err?.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    if (err?.status >= 500) {
      throw new Error("PROVIDER_UNAVAILABLE");
    }
    throw err;
  }
}
