// types/email.ts

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type SendStatus = "scheduled" | "sent" | "failed" | "skipped";
export type ReplyClassification =
  | "interested"
  | "not_interested"
  | "out_of_office"
  | "unsubscribe"
  | "neutral";

export interface CampaignConfig {
  name: string;
  goal: string;
  tone: string;
}

export interface ContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  metadata?: Record<string, string>;
}
