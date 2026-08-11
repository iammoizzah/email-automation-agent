// app/api/gmail/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleOAuthCallback } from "@/lib/email/gmailClient";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?gmail_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?gmail_error=missing_code", req.url)
    );
  }

  try {
    const email = await handleOAuthCallback(code);
    return NextResponse.redirect(
      new URL(`/?gmail_connected=${encodeURIComponent(email)}`, req.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(
      new URL(`/?gmail_error=${encodeURIComponent(message)}`, req.url)
    );
  }
}
