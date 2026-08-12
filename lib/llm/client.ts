// lib/llm/client.ts
import { z } from "zod";
import { callAnthropic } from "./providers/anthropic";

export interface LLMRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface LLMProvider {
  generate(req: LLMRequest): Promise<string>;
}

const providers: Record<string, LLMProvider> = {
  anthropic: { generate: callAnthropic },
};

const ACTIVE_PROVIDER = process.env.LLM_PROVIDER || "anthropic";

function getProvider(): LLMProvider {
  const provider = providers[ACTIVE_PROVIDER];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${ACTIVE_PROVIDER}`);
  }
  return provider;
}

/**
 * Calls the active LLM provider and validates the response against a Zod schema.
 * Retries once with a correction prompt if the first response fails validation
 * or isn't valid JSON.
 */
export async function generateStructured<T>(
  req: LLMRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const provider = getProvider();

  const attempt = async (correctionNote?: string): Promise<T> => {
    const user = correctionNote ? `${req.user}\n\n${correctionNote}` : req.user;
    const raw = await provider.generate({ ...req, user });
    const parsed = extractJson(raw);

    if (parsed === null) {
      throw new LLMOutputError("Response was not valid JSON", raw);
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new LLMOutputError(
        `Schema validation failed: ${result.error.message}`,
        raw
      );
    }
    return result.data;
  };

  try {
    return await attempt();
  } catch (err) {
    if (err instanceof LLMOutputError) {
      return await attempt(
        "Your previous response did not match the required JSON schema exactly. " +
          "Respond with ONLY valid JSON matching the schema — no markdown fences, no preamble."
      );
    }
    throw err;
  }
}

/**
 * Calls the active LLM provider and returns raw text — no JSON schema validation.
 * Used for prose tasks that don't need structured output.
 */
export async function generateText(req: LLMRequest): Promise<string> {
  const provider = getProvider();
  return provider.generate(req);
}

function extractJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```json\s*|```\s*$/g, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export class LLMOutputError extends Error {
  constructor(message: string, public rawResponse: string) {
    super(message);
    this.name = "LLMOutputError";
  }
}
