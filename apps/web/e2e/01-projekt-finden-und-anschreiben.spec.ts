import { expect, test } from "@playwright/test";

import { anmelden } from "./support/anmelden";
import { mitDatenbank, NUTZER, PROJEKTE } from "./support/testdaten";

// Geschichte 01, docs/stories/01-projekt-finden-und-anschreiben.md.
// Mira findet den Sonnenhof über die Suche und schreibt ihn an; Jana sieht die
// Anfrage am Kontomenü und nimmt sie an.

const NACHRICHT = "Hallo ihr Lieben, ich würde euch gern bei einem Besuchstag kennenlernen. Viele Grüße, Mira";

test("01 · Ein Projekt finden und anschreiben", async ({ browser }) => {
  const { sonnenhof } = PROJEKTE;

  // --- Mira -----------------------------------------------------------------
  const mira = await (await browser.newContext()).newPage();

  await test.step("1 · Mira meldet sich an", async () => {
    await anmelden(mira, NUTZER.suchende.email);
  });

  await test.step("2 · sie sucht oben nach dem Namen", async () => {
    await mira.getByRole("searchbox").or(mira.getByPlaceholder(/such/i)).first().fill(sonnenhof.suchwort);
    await mira.keyboard.press("Enter");
    await expect(mira).toHaveURL(/\/projekte\?suche=Sonnenhof/);
    await expect(mira.getByRole("link", { name: new RegExp(sonnenhof.name) })).toBeVisible();
  });

  await test.step("3 · sie öffnet das Ergebnis", async () => {
    await mira.getByRole("link", { name: new RegExp(sonnenhof.name) }).click();
    await expect(mira).toHaveURL(new RegExp(`/projekt/${sonnenhof.slug}`));
    await expect(mira.getByRole("heading", { level: 1, name: sonnenhof.name })).toBeVisible();
  });

  await test.step("4 · das Formular ist vorausgefüllt, ohne CAPTCHA", async () => {
    await expect(mira.locator('input[name="senderName"]')).toHaveValue(NUTZER.suchende.name);
    await expect(mira.locator('input[name="senderEmail"]')).toHaveValue(NUTZER.suchende.email);
    await expect(mira.locator('[data-captcha="turnstile"]')).toHaveCount(0);
  });

  await test.step("5 · sie schreibt und sendet", async () => {
    await mira.locator('textarea[name="message"]').fill(NACHRICHT);
    await mira.getByRole("button", { name: "Nachricht senden" }).click();
    await expect(mira.getByText("Deine Nachricht wurde verschickt.")).toBeVisible();
  });

  // --- Jana -----------------------------------------------------------------
  const jana = await (await browser.newContext()).newPage();

  await test.step("6 · Jana meldet sich an und sieht die offene Anfrage", async () => {
    await anmelden(jana, NUTZER.betreiberin.email);
    await expect(jana.getByRole("link", { name: "1 offene Anfragen ansehen" })).toBeVisible();
  });

  await test.step("7 · ein Klick führt zu Miras Nachricht", async () => {
    await jana.getByRole("link", { name: "1 offene Anfragen ansehen" }).click();
    await expect(jana).toHaveURL(new RegExp(`/projekte/${sonnenhof.id}/anfragen`));
    const anfrage = jana.locator("li", { hasText: NACHRICHT });
    await expect(anfrage).toContainText(NUTZER.suchende.name);
    await expect(anfrage).toContainText(NUTZER.suchende.email);
    await expect(anfrage).toContainText("Offen");
  });

  await test.step("8 · sie nimmt die Anfrage an", async () => {
    const anfrage = jana.locator("li", { hasText: NACHRICHT });
    await anfrage.getByRole("button", { name: "Annehmen" }).click();
    await expect(jana.locator("li", { hasText: NACHRICHT })).toContainText("Angenommen");
    await jana.reload();
    await expect(jana.getByRole("link", { name: /offene Anfragen ansehen/ })).toHaveCount(0);
  });

  await test.step("Ende · die Anfrage ist gespeichert und angenommen", async () => {
    const rows = await mitDatenbank((db) =>
      db.query(`SELECT status, "senderUserId" FROM "ContactRequest" WHERE "listingId" = $1`, [sonnenhof.id]),
    );
    expect(rows.rows).toEqual([{ status: "ACCEPTED", senderUserId: NUTZER.suchende.id }]);
  });
});
