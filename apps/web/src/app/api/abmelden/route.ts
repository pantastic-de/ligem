import { NextResponse, type NextRequest } from "next/server";

import { userIdFromNotificationToken } from "@/lib/notification-token";
import { unsubscribeAll } from "@/lib/notification-settings";
import { SITE_URL } from "@/lib/site";

// Target of the List-Unsubscribe header in every switchable mail. Mail
// programs (Gmail, Apple Mail, …) offer an "Abbestellen" button that POSTs
// here without opening a page (RFC 8058 one-click); that switches off all
// notifications. A plain GET (someone opening the URL) only leads to the
// settings page, so a link scanner pre-fetching URLs can't unsubscribe anyone.

export async function POST(request: NextRequest) {
  const userId = userIdFromNotificationToken(request.nextUrl.searchParams.get("t"));
  if (!userId) return new NextResponse("Ungültiger Link", { status: 400 });
  await unsubscribeAll(userId);
  return new NextResponse("Abbestellt", { status: 200 });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const origin = process.env.NODE_ENV === "production" ? SITE_URL : request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/benachrichtigungen?t=${encodeURIComponent(token)}`, 303);
}
