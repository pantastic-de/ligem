"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { AccountBlockedError, signIn } from "@/lib/auth";
import { safeInternalPath, withQueryParam } from "@/lib/return-url";

export async function authenticate(formData: FormData): Promise<void> {
  const weiter = safeInternalPath(formData.get("weiter"));
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo: weiter,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = error instanceof AccountBlockedError || (error as { code?: string }).code === "gesperrt" ? "gesperrt" : "1";
      const target = `/anmelden?error=${code}`;
      redirect(weiter === "/" ? target : withQueryParam(target, "weiter", weiter));
    }
    throw error;
  }
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeInternalPath(formData.get("weiter")) });
}

export async function signInWithApple(formData: FormData): Promise<void> {
  await signIn("apple", { redirectTo: safeInternalPath(formData.get("weiter")) });
}

export async function signInWithMicrosoft(formData: FormData): Promise<void> {
  await signIn("microsoft-entra-id", { redirectTo: safeInternalPath(formData.get("weiter")) });
}
