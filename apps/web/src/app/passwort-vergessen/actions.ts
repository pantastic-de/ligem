"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getClientIp } from "@/lib/ip-lookup";
import { requestPasswordReset } from "@/lib/password-reset-token";
import { registerAttempt } from "@/lib/rate-limit";

// Per-IP cap on top of the per-address cooldown in requestPasswordReset(),
// so one client can't send reset mails to many different addresses.
const MAX_REQUESTS_PER_IP = 10;
const IP_WINDOW_MS = 60 * 60_000;

export async function submitPasswordResetRequest(formData: FormData): Promise<void> {
  const email = formData.get("email")?.toString().trim().toLowerCase();
  if (!email || !email.includes("@")) {
    redirect("/passwort-vergessen?error=email");
  }

  const ip = getClientIp(await headers());
  const withinLimit = registerAttempt(`passwort-vergessen:${ip ?? "unbekannt"}`, MAX_REQUESTS_PER_IP, IP_WINDOW_MS);

  // Lookup and SMTP send both run after the response: otherwise a known
  // address (DB hit + mail send) would answer noticeably slower than an
  // unknown one, which would leak which addresses have an account. Over the
  // IP limit, the response is the same, just without a mail.
  if (withinLimit) {
    after(async () => {
      try {
        await requestPasswordReset(email);
      } catch (err) {
        console.error("[passwort-vergessen] Reset-Mail fehlgeschlagen:", err);
      }
    });
  }

  redirect("/passwort-vergessen?gesendet=1");
}
