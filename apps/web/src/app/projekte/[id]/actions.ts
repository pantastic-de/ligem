"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTemplateMail } from "@/lib/email-template-store";
import { isDeliverable } from "@/lib/listing-notifications";
import { SITE_URL } from "@/lib/site";
import { getClientIp } from "@/lib/ip-lookup";
import { turnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { checkSender, emailNote, type SenderCheck } from "@/lib/sender-verification";
import { withQueryParam } from "@/lib/return-url";

// The contact form is rendered both on the standalone /projekt/[slug] page
// and inline in /projekte's results column (both via the shared
// ProjektePageView, see projekte-page-view.tsx's buildProjekteHref) —
// `returnTo` says which of the two to redirect back to after submitting.
// It's client-supplied (a hidden input), so it's restricted to same-origin
// /projekte or /projekt paths rather than trusted as-is, to rule out it
// being used as an open redirect.
function sanitizeReturnTo(value: string | undefined, fallback: string): string {
  if (
    value &&
    (value === "/projekte" ||
      value.startsWith("/projekte/") ||
      value.startsWith("/projekte?") ||
      value.startsWith("/projekt/"))
  ) {
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
  senderPhone: string | null,
  message: string,
  sender: SenderCheck,
): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      projectName: true,
      slug: true,
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
        .map((u) => u.email)
        .filter(isDeliverable),
    ),
  ];
  const values = {
    projekt: listing.projectName,
    absender_name: senderName,
    absender_email: senderEmail,
    absender_telefon: senderPhone ?? "nicht angegeben",
    nachricht: message,
    link: `${SITE_URL}/projekte/${listingId}/anfragen`,
    email_hinweis: emailNote(sender.emailVerified),
  };
  after(async () => {
    // Confirmation to the sender, only to a confirmed account address.
    if (sender.confirmationTo) {
      await sendTemplateMail("kontaktanfrage-bestaetigung", sender.confirmationTo, {
        name: senderName,
        projekt: listing.projectName,
        nachricht: message,
        projekt_link: `${SITE_URL}/projekt/${listing.slug}`,
      });
    }
    for (const to of recipients) {
      // Reply-To: a plain "Antworten" reaches the person who asked, not LiGem.
      await sendTemplateMail("kontaktanfrage", to, values, { replyTo: senderEmail });
    }
  });
}

export async function submitContactRequest(formData: FormData): Promise<void> {
  const listingId = formData.get("listingId")?.toString();
  // Hard caps: the form is public, so nothing stops a script from posting
  // megabytes into these fields otherwise.
  const senderName = formData.get("senderName")?.toString().trim().slice(0, 200);
  const senderEmail = formData.get("senderEmail")?.toString().trim().slice(0, 320);
  const message = formData.get("message")?.toString().trim().slice(0, 5000);
  // Optional. Kept loose (people write numbers in many formats); only
  // characters a phone number can contain are accepted.
  const rawPhone = formData.get("senderPhone")?.toString().trim().slice(0, 40) ?? "";
  if (rawPhone && !/^[0-9+()\/\-. ]{4,40}$/.test(rawPhone)) {
    redirect(withQueryParam(sanitizeReturnTo(formData.get("returnTo")?.toString(), `/projekte/${listingId ?? ""}`), "error", "telefon"));
  }
  const senderPhone = rawPhone || null;
  const returnTo = sanitizeReturnTo(
    formData.get("returnTo")?.toString(),
    `/projekte/${listingId ?? ""}`,
  );

  if (!listingId || !senderName || !senderEmail || !message) {
    redirect(withQueryParam(returnTo, "error", "1"));
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
      redirect(withQueryParam(returnTo, "error", "captcha"));
    }
  }

  // Only published projects accept messages (the id comes from a hidden
  // field and could name any listing).
  const target = await prisma.listing.findUnique({ where: { id: listingId }, select: { status: true } });
  if (target?.status !== "PUBLISHED") {
    redirect(withQueryParam(returnTo, "error", "1"));
  }

  const sender = await checkSender(session?.user?.id, senderEmail);
  await prisma.contactRequest.create({
    data: {
      listingId,
      senderName,
      senderEmail,
      senderPhone,
      senderEmailVerified: sender.emailVerified,
      message,
      senderUserId: session?.user?.id ?? null,
    },
  });
  await notifyContactRequest(listingId, senderName, senderEmail, senderPhone, message, sender);

  redirect(withQueryParam(returnTo, "kontakt", "1"));
}
