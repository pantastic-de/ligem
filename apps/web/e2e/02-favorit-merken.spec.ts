import { expect, test } from "@playwright/test";

import { anmelden } from "./support/anmelden";
import { mitDatenbank, NUTZER, PROJEKTE } from "./support/testdaten";

// Geschichte 02, docs/stories/02-favorit-merken.md.
// Mira klickt ohne Anmeldung aufs Herz, meldet sich über den Hinweis an, landet
// wieder in ihrer Suche, merkt sich den Sonnenhof und verwaltet ihn unter
// „Meine Favoriten“.

test("02 · Ein Projekt als Favorit merken", async ({ page }) => {
  const { sonnenhof } = PROJEKTE;
  const karte = page.locator("li", { hasText: sonnenhof.name });

  await test.step("1 · ohne Anmeldung nach dem Projekt suchen", async () => {
    await page.goto(`/projekte?suche=${sonnenhof.suchwort}`);
    await expect(karte).toBeVisible();
    await expect(karte.getByRole("button", { name: "Projekt als Favorit merken" })).toBeVisible();
  });

  await test.step("2 · Herz zeigt den Anmelde-Hinweis", async () => {
    await karte.getByRole("button", { name: "Projekt als Favorit merken" }).click();
    const hinweis = page.getByRole("dialog", { name: "Favoriten merken" });
    await expect(hinweis).toBeVisible();
    await expect(hinweis.getByRole("link", { name: "Konto erstellen" })).toBeVisible();
    await hinweis.getByRole("link", { name: "Anmelden" }).click();
  });

  await test.step("3 · nach der Anmeldung zurück in derselben Suche", async () => {
    await expect(page).toHaveURL(/\/anmelden\?weiter=/);
    await anmelden(page, NUTZER.suchende.email);
    await expect(page).toHaveURL(/\/projekte\?suche=Sonnenhof/);
  });

  await test.step("4 · jetzt setzt das Herz den Favoriten", async () => {
    await karte.getByRole("button", { name: "Projekt als Favorit merken" }).click();
    const gesetzt = karte.getByRole("button", { name: "Projekt aus den Favoriten entfernen" });
    await expect(gesetzt).toBeVisible();
    // The heart turns red at once; the button stays disabled until the server has saved it.
    await expect(gesetzt).toBeEnabled();
    await page.reload();
    await expect(karte.getByRole("button", { name: "Projekt aus den Favoriten entfernen" })).toBeVisible();
  });

  const eintrag = page.locator("li", { hasText: sonnenhof.name });

  await test.step("5 · „Meine Favoriten“ über das Kontomenü", async () => {
    await page.getByText(NUTZER.suchende.name, { exact: true }).click();
    await page.getByRole("link", { name: "Meine Favoriten" }).click();
    await expect(page).toHaveURL(/\/mein-konto\/favoriten/);
    await expect(page.getByRole("heading", { name: "Projekte (1)" })).toBeVisible();
    await expect(eintrag.getByRole("button", { name: "Wöchentlich" })).toHaveAttribute("aria-pressed", "true");
  });

  await test.step("6 · Benachrichtigung auf „Monatlich“", async () => {
    await eintrag.getByRole("button", { name: "Monatlich" }).click();
    await expect(eintrag.getByRole("button", { name: "Monatlich" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(eintrag.getByRole("button", { name: "Monatlich" })).toHaveAttribute("aria-pressed", "true");
    const rows = await mitDatenbank((db) =>
      db.query(`SELECT frequency FROM "FavoriteListing" WHERE "userId" = $1`, [NUTZER.suchende.id]),
    );
    expect(rows.rows).toEqual([{ frequency: "MONTHLY" }]);
  });

  await test.step("7 · Favorit entfernen", async () => {
    await eintrag.getByRole("button", { name: "Entfernen" }).click();
    await expect(page.getByText("Aus deinen Favoriten entfernt.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projekte (0)" })).toBeVisible();
  });
});
