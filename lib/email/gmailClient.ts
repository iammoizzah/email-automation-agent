// lib/email/gmailClient.ts
import { google } from "googleapis";
import { prisma } from "@/lib/db/prisma";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Step 1 of OAuth: builds the URL the user is redirected to for consent.
 */
export function buildAuthUrl(): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // required to get a refresh_token
    prompt: "consent",      // forces refresh_token on every connect, not just the first
    scope: GMAIL_SCOPES,
  });
}

/**
 * Step 2 of OAuth: exchanges the callback code for tokens, fetches the
 * account email, and upserts it into the database.
 */
export async function handleOAuthCallback(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error(
      "Google did not return a refresh token. Try disconnecting the app at https://myaccount.google.com/permissions and reconnecting."
    );
  }

  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    throw new Error("Could not determine the connected Gmail address.");
  }

  await prisma.gmailAccount.upsert({
    where: { email: data.email },
    create: {
      email: data.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date),
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date),
    },
  });

  return data.email;
}

/**
 * Returns an authenticated Gmail API client for a given connected account,
 * refreshing the access token first if it has expired.
 */
export async function getGmailClientFor(email: string) {
  const account = await prisma.gmailAccount.findUnique({ where: { email } });
  if (!account) {
    throw new Error(`No connected Gmail account found for ${email}`);
  }

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiresAt.getTime(),
  });

  // Refresh proactively if within 5 minutes of expiry
  if (account.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token && credentials.expiry_date) {
      await prisma.gmailAccount.update({
        where: { email },
        data: {
          accessToken: credentials.access_token,
          expiresAt: new Date(credentials.expiry_date),
        },
      });
      oauth2Client.setCredentials(credentials);
    }
  }

  return google.gmail({ auth: oauth2Client, version: "v1" });
}
