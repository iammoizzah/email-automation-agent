// lib/email/sender.ts
import { getGmailClientFor } from "./gmailClient";

interface SendEmailParams {
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  threadId?: string | null; // set on follow-ups to keep them in the same Gmail thread
}

interface SendEmailResult {
  messageId: string;
  threadId: string;
}

function buildRawMessage(params: SendEmailParams): string {
  const { fromEmail, toEmail, subject, body } = params;

  const lines = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body,
  ];

  const raw = lines.join("\r\n");

  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends a single email via the Gmail API. If threadId is provided, the
 * message is sent as part of that thread (used for sequenced follow-ups).
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const gmail = await getGmailClientFor(params.fromEmail);
  const raw = buildRawMessage(params);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: params.threadId || undefined,
    },
  });

  if (!response.data.id || !response.data.threadId) {
    throw new Error("Gmail did not return a message/thread ID after sending.");
  }

  return {
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
}
