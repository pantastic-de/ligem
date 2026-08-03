"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { SITE_URL } from "@/lib/site";
import { getClientIp } from "@/lib/ip-lookup";
import { turnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";

// The contact form is rendered both on the standalone /projekte/[id] page
// and inline in /projekte's results column (see listing-detail.tsx /
// projekte/page.tsx's `?projekt=<id>` mechanism) — `returnTo` says which of
// the two to redirect back to after submitting. It's client-supplied (a
// hidden input), so it's restricted to same-origin /projekte paths rather
// than trusted as-is, to rule out it being used as an open redirect.
function sanitizeReturnTo(value: string | undefined, fallback: string): string {
  if (value && (value === "/projekte" || value.startsWith("/projekte/") || value.startsWith("/projekte?"))) {
    return value;
  }
  return fallback;
}

// Fires a best-effort email to every owner/co-manager of this listing who
// opted in via /mein-konto's "Kontaktanfragen per E-Mail weiterhilfen"
// checkbox (User.notifyContactRequestsByEmail) — otherwise a new contact
// request only ever shows up inside the app itself (/projekte/[id]/anfragen),
// with no notification at all. The actual SMTP send is deferred via after()
// (see recordListingViews for the same pattern) so a slow/failing mail
// server can't hold up the redirect this action already does.
async function notifyContactRequest(
  listingId: string,
  senderName: string,
  senderEmail: string,
  message: string,
): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      projectName: true,
      createdBy: { select: { email: true, notifyContactRequestsByEmail: true } },
      managers: { select: { user: { select: { email: true, notifyContactRequestsByEmail: true } } } },
    },
  });
  if (!listing) return;

  // Deduped — a co-manager row for the same user as the creator shouldn't
  // normally exist, but nothing actively prevents it, and this is a one-line
  // guard against ever double-sending the same notification.
  const recipients = [
    ...new Set(
      [listing.createdBy, ...listing.managers.map((m) => m.user)]
        .filter((u) => u.notifyContactRequestsByEmail)
        .map((u) => u.email),
    ),
  ];
  if (recipients.length === 0) return;

  const subject = `Neue Kontaktanfrage für „${listing.projectName}"`;
  const text = `${senderName} (${senderEmail}) hat über LiGem eine Nachricht zu „${listing.projectName}" geschickt:\n\n${message}\n\nDu kannst direkt per E-Mail an ${senderEmail} antworten, oder die Anfrage annehmen/ablehnen unter:\n${SITE_URL}/projekte/${listingId}/anfragen`;

  after(async () => {
    for (const to of recipients) {
      await sendMail({ to, subject, text });
    }
  });
}

export async function submitContactRequest(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  const senderName = formData.get("senderName")?.toString().trim();
  const senderEmail = formData.get("senderEmail")?.toString().trim();
  const message = formData.get("message")?.toString().trim();
  const returnTo = sanitizeReturnTo(
    formData.get("returnTo")?.toString(),
    `/projekte/${listingId ?? ""}`,
  );
  const separator = returnTo.includes("?") ? "&" : "?";

  if (!listingId || !senderName || !senderEmail || !message) {
    redirect(`${returnTo}${separator}error=1`);
  }

  const session = await auth();

  // Registered *and email-verified* senders skip CAPTCHA entirely (see
  // CLAUDE.md's "Kontaktanfragen" section for the full rationale) — anyone
  // else needs to pass Cloudflare Turnstile, checked here server-side
  // regardless of what the form's own client-side widget did or didn't
  // show, since that's the only check that actually matters.
  const isVerifiedSender = Boolean(
    session?.user?.id &&
      (await prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true } }))
        ?.emailVerified,
  );
  if (turnstileEnabled && !isVerifiedSender) {
    const hdrs = await headers();
    const token = formData.get("cf-turnstile-response")?.toString() ?? null;
    const ok = await verifyTurnstileToken(token, getClientIp(hdrs));
    if (!ok) {
      redirect(`${returnTo}${separator}error=captcha`);
    }
  }

  await prisma.contactRequest.create({
    data: {
      listingId,
      senderName,
      senderEmail,
      message,
      senderUserId: session?.user?.id ?? null,
    },
  });
  await notifyContactRequest(listingId, senderName, senderEmail, message);

  redirect(`${returnTo}${separator}kontakt=1`);
}
