# AI Email Automation Agent

Generate, personalize, sequence, and send email campaigns — with AI agents handling drafting, per-contact personalization, reply classification, and follow-up decisions.

---

## What it does

Create a campaign with a goal and a tone, add contacts, and the system takes it from there:

1. A **Composer agent** writes one base email template for the campaign
2. A **Personalizer agent** runs once per contact, in parallel, producing a tailored final draft for each recipient
3. Drafts are sent via the **Gmail API** — either manually ("Send Due Emails Now") or on a schedule
4. A **Classifier agent** reads inbound replies and categorizes them (interested / not interested / out of office / unsubscribe / neutral)
5. A **Sequencer agent** decides whether a follow-up is warranted, writes it, and schedules it — always in the same Gmail thread as the original

Every agent call is strict JSON, validated against a Zod schema — no fragile text parsing anywhere in the pipeline.

## Features

- AI-drafted campaigns — one base template, personalized per contact automatically
- Real Gmail sending via OAuth — no SMTP config, no third-party email service
- Automatic follow-up sequencing based on reply classification
- Hard-coded unsubscribe handling — enforced in code, never left to agent judgment
- Per-contact status tracking: draft → scheduled → sent, with reply classification shown inline
- Token refresh handled automatically — no manual re-auth once connected
- Follow-ups land in the same Gmail thread as the original, not as new emails

## Tech stack

| Layer      | Choice                                                                             |
| ---------- | ---------------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router) + TypeScript                                               |
| Database   | PostgreSQL (via [Neon](https://neon.tech)) + Prisma ORM                            |
| Email      | Gmail API (`googleapis`), OAuth 2.0                                                |
| LLM        | Anthropic API, provider-agnostic wrapper (swap providers via `lib/llm/providers/`) |
| Validation | Zod — every agent's structured output is schema-checked                            |
| Styling    | Tailwind CSS v4, light professional theme                                          |
| Scheduling | Vercel Cron (production)                                                           |

## Getting started

### 1. Database (Postgres via Neon)

Create a free project at [neon.tech](https://neon.tech), copy the **pooled connection string**, and set it as `DATABASE_URL` in both `.env` and `.env.local` (Prisma CLI reads `.env`; Next.js reads `.env.local` — both need the same value).

### 2. Gmail OAuth

In [Google Cloud Console](https://console.cloud.google.com): create a project, enable the **Gmail API**, configure the OAuth consent screen (External, add yourself as a test user), and create an OAuth Client ID (Web application) with redirect URI `http://localhost:3000/api/gmail/callback`. Copy the Client ID and Secret into `.env.local`.

### 3. Install and run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect Gmail**, then create your first campaign.

### Environment variables

```
# LLM
ANTHROPIC_API_KEY=your_anthropic_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
LLM_PROVIDER=anthropic

# Gmail OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# Database (Neon pooled connection string)
DATABASE_URL="postgresql://..."

# Cron dispatch security
CRON_SECRET=a_random_string_at_least_16_chars
```

Never commit `.env` or `.env.local` — both are gitignored.

## Architecture

```
app/
├── page.tsx                              # Dashboard — campaigns list, Gmail connection status
├── campaigns/new/page.tsx                # Create campaign: goal, tone, contacts
├── campaigns/[id]/page.tsx               # Campaign detail — drafts, status, replies
├── api/
│   ├── campaigns/route.ts                # Create/list campaigns
│   ├── campaigns/[id]/route.ts           # Get/update one campaign
│   ├── campaigns/[id]/contacts/route.ts  # Add contacts to a campaign
│   ├── campaigns/[id]/send-now/route.ts  # Manual send trigger (UI button)
│   ├── generate/route.ts                 # Runs Composer + Personalizer agents
│   ├── dispatch/route.ts                 # Cron-triggered: sends whatever's due, all campaigns
│   ├── gmail/connect/route.ts            # OAuth kickoff
│   ├── gmail/callback/route.ts           # OAuth callback, stores tokens
│   ├── gmail/poll-replies/route.ts       # Cron-triggered: checks inboxes, classifies replies
│   └── gmail/poll-replies-manual/route.ts # Manual poll trigger (UI button)
└── layout.tsx

components/
├── campaign/    # SendNowButton, PollRepliesButton
└── ui/          # Button, Card, Badge

lib/
├── agents/                       # composerAgent, personalizerAgent, sequencerAgent, classifierAgent
├── orchestration/
│   ├── campaignOrchestrator.ts   # Composer once, Personalizer per-contact in parallel
│   ├── dispatchOrchestrator.ts   # Sends due emails — unsubscribe hard rule lives here
│   └── replyOrchestrator.ts      # Polls threads, classifies replies, invokes Sequencer
├── email/
│   ├── gmailClient.ts            # OAuth, token refresh, thread reading
│   └── sender.ts                 # Builds and sends raw Gmail messages
├── llm/                          # generateStructured() (Zod-validated) + generateText()
├── prompts/                      # System/user prompt builders, one per agent
├── validation/schemas.ts         # Zod schemas — the contract every agent's output must satisfy
└── db/prisma.ts                  # Shared Prisma client singleton

prisma/
└── schema.prisma                 # Campaign, Contact, EmailStep, SendLog, Reply, GmailAccount

types/
└── email.ts                      # CampaignConfig, ContactInput, and status/classification unions
```

## How the agents communicate

A persistent, DB-backed pipeline — not a live conversation:

- **Composer** runs once per campaign, producing a base template with `{{firstName}}`-style placeholders.
- **Personalizer** runs once per contact, **in parallel** (`Promise.allSettled`), turning the template into a finished draft. Each becomes a `scheduled` `EmailStep` in the database.
- **Dispatch** (manual button or cron) sends anything due. Before sending, it checks `contact.unsubscribed` directly in code — this is a hard rule, not something any agent decides.
- **Reply polling** (manual button or cron) checks each sent thread for new inbound messages. A new reply goes through **Classifier**. If classified as `unsubscribe`, the contact is marked unsubscribed in code immediately — the Sequencer is never even invoked for that contact.
- **Sequencer** looks at the original email, the reply classification (or lack of a reply after a few days), and decides whether to schedule a follow-up — writing it in the same Gmail thread if so.

Every agent output is validated against a Zod schema before it touches the database; a failed validation gets one automatic retry with a correction prompt.

## Deployment

1. **Database**: your Neon Postgres already works as-is in production — no migration needed beyond what's local.
2. **Push to GitHub**, then import the repo in Vercel.
3. **Environment variables**: add all of the `.env.local` variables to the Vercel project settings, including `DATABASE_URL`, `GOOGLE_CLIENT_ID`/`SECRET`, `ANTHROPIC_API_KEY`, and `CRON_SECRET`.
4. **Update the Google OAuth redirect URI** to your production domain (`https://yourapp.vercel.app/api/gmail/callback`) in Google Cloud Console, and add it as an additional authorized redirect URI alongside the localhost one.
5. **Cron**: `vercel.json` already defines the dispatch (every 10 min) and reply-poll (hourly) schedules. Vercel automatically sends `CRON_SECRET` as an `Authorization: Bearer` header on every cron invocation once it's set as an environment variable — no extra code needed.
6. **Publish the OAuth consent screen** (Google Cloud Console → OAuth consent screen → Publish) once you're ready for people other than test users to connect — until then, only added test users can complete the Gmail connection.

## Hard rules (not agent decisions)

Two behaviors are enforced directly in code, never left to LLM judgment:

- **Unsubscribe → `contact.unsubscribed = true`**, checked before every send and every Sequencer call. A misclassification here is a compliance risk, not just a UX one.
- **No follow-up after a negative signal beyond the first** — the Sequencer is prompted to self-limit, but this is worth eventually hardening into a code-level check too (see Roadmap).

## Roadmap

- [ ] Hard-code the "max one follow-up after negative signal" rule in the orchestrator, not just the prompt
- [ ] Multi-account support — currently `dispatch`/`poll-replies` use the first connected Gmail account only
- [ ] Encrypt stored OAuth tokens rather than plaintext columns
- [ ] Campaign pause/resume controls in the UI (schema already supports `paused` status)
- [ ] Bulk contact import via CSV upload instead of paste-a-list

## License

MIT
