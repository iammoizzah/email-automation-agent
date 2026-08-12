// lib/prompts/sequencerPrompt.ts

export function buildSequencerSystemPrompt(): string {
  return (
    "You are the SEQUENCER agent for an email automation platform. " +
    "Given the history of a single contact's email thread (what was sent, and how they replied, if at all), " +
    "decide whether a follow-up should be sent, and if so, write it and specify how many days to wait. " +
    "Do not suggest a follow-up if the contact has explicitly declined interest, asked not to be contacted, or unsubscribed — " +
    "in those cases shouldSendFollowUp must be false. " +
    "If there was no reply at all, a single polite follow-up after a reasonable gap (3-5 days) is appropriate. " +
    "Never suggest more than one follow-up after a 'not_interested' or negative signal. " +
    "Respond with ONLY a single valid JSON object matching this exact shape, no markdown fences, no commentary:\n" +
    `{"shouldSendFollowUp":boolean,"subject":string|null,"body":string|null,"daysUntilSend":number|null,"reasoning":string}`
  );
}

export function buildSequencerUserPrompt(params: {
  originalSubject: string;
  originalBody: string;
  stepNumber: number;
  replyClassification: string | null;
  replySnippet: string | null;
}): string {
  const { originalSubject, originalBody, stepNumber, replyClassification, replySnippet } = params;

  const replyBlock = replyClassification
    ? `\n\nTHEY REPLIED. Classification: ${replyClassification}\nReply snippet: "${replySnippet}"`
    : "\n\nNo reply received yet.";

  return (
    `THIS IS FOLLOW-UP DECISION FOR STEP ${stepNumber + 1} (previous step was ${stepNumber})\n` +
    `ORIGINAL SUBJECT: ${originalSubject}\n` +
    `ORIGINAL BODY:\n${originalBody}` +
    replyBlock +
    `\n\nDecide whether to follow up, as the JSON object described in your instructions.`
  );
}
