import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectBot } from "@/lib/bot-detect";
import { getClientIp, lookupIpInfo } from "@/lib/ip-lookup";

function referrerHostOf(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

/**
 * Does the actual work for the generic site-wide PageView tracker — called
 * from src/middleware.ts via an internal fetch (with the original request's
 * headers, including its session cookie, forwarded along) rather than doing
 * this inline in middleware itself, since middleware runs in a separate,
 * more restricted bundling pipeline that geoip-lite's bundled data file
 * doesn't survive (see middleware.ts for the full explanation). A plain
 * Route Handler runs in the regular server runtime, same as every page.tsx
 * that already calls recordListingViews/recordEventViews.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : null;
  if (!path || !path.startsWith("/") || path.length > 500) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = await auth();
  const { isBot, botName } = detectBot(request.headers.get("user-agent"));
  const referrerHost = referrerHostOf(request.headers.get("referer"));
  const { hostname, country } = await lookupIpInfo(getClientIp(request.headers));

  try {
    await prisma.pageView.create({
      data: {
        path,
        viewerId: session?.user?.id ?? null,
        isBot,
        botName,
        referrerHost,
        hostname,
        country,
      },
    });
  } catch (err) {
    console.error("Fehler beim Speichern von PageView", err);
  }

  return NextResponse.json({ ok: true });
}
