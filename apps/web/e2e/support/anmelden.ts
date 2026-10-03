import { expect, type Page } from "@playwright/test";

import { PASSWORT } from "./testdaten";

/** Logs in through the real form, as a person would. Starts on /anmelden unless already there. */
export async function anmelden(page: Page, email: string): Promise<void> {
  if (!new URL(page.url(), "http://x").pathname.startsWith("/anmelden")) {
    await page.goto("/anmelden");
  }
  await page.getByLabel("E-Mail-Adresse oder Benutzername").fill(email);
  await page.locator("#password").fill(PASSWORT);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await expect(page).not.toHaveURL(/\/anmelden/);
}
