"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";

export async function authenticate(formData: FormData): Promise<void> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/anmelden?error=1");
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" });
}
