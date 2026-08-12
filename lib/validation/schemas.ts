// lib/validation/schemas.ts
import { z } from "zod";

export const composerOutputSchema = z.object({
  subject: z.string().min(1),
  body: z
    .string()
    .min(1)
    .describe("Base email template with {{placeholder}} variables for personalization"),
  placeholders: z.array(z.string()),
});

export const personalizerOutputSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const sequencerOutputSchema = z.object({
  shouldSendFollowUp: z.boolean(),
  subject: z.string().nullable(),
  body: z.string().nullable(),
  daysUntilSend: z.number().min(0).nullable(),
  reasoning: z.string(),
});

export const classifierOutputSchema = z.object({
  classification: z.enum([
    "interested",
    "not_interested",
    "out_of_office",
    "unsubscribe",
    "neutral",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
