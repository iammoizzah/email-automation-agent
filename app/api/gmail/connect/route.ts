// app/api/gmail/connect/route.ts
import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/email/gmailClient";

export async function GET() {
  const url = buildAuthUrl();
  return NextResponse.redirect(url);
}
