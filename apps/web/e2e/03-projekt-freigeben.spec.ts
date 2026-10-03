import { expect, test } from "@playwright/test";

import { anmelden } from "./support/anmelden";
import { mitDatenbank, NUTZER, PROJEKTE } from "./support/testdaten";

// Geschichte 03, docs/stories/03-projekt-freigeben.md.
// Der Wiesenweg liegt in der Prüfung: Jana sieht die Sanduhr, die Öffentlichkeit
// sieht nichts; Alex gibt frei, danach ist das Projekt öffentlich und Janas
// Sanduhr weg.

test("03 · Ein neues Projekt prüfen und freigeben", async ({ browser }) => {
  const { wiesenweg } = PROJEKTE;
  const projektseite = `/projekt/${wiesenweg.slug}`;

  const besucher = await (await browser.newContext()).newPage();

  await test.step("1 · vor der Freigabe ist das Projekt nicht öffentlich", async () => {
    const antwort = await besucher.goto(projektseite);
    expect(antwort?.status()).toBe(404);
  });

  const jana = await (await browser.newContext()).newPage();

  await test.step("2 · Jana sieht die Sanduhr", async () => {
    await anmelden(jana, NUTZER.betreiberin.email);
    await expect(jana.getByRole("link", { name: /1 Projekt wird geprüft/ })).toBeVisible();
  });

  await test.step("3 · sie führt zu „Meine Projekte“", async () => {
    await jana.getByRole("link", { name: /1 Projekt wird geprüft/ }).click();
    await expect(jana).toHaveURL(/\/meine-projekte/);
    await expect(jana.locator("li", { hasText: wiesenweg.name })).toContainText("Wird geprüft");
  });

  const alex = await (await browser.newContext()).newPage();
  const zeile = alex.locator("li", { hasText: wiesenweg.name });

  await test.step("4 · Alex sieht, dass Projekte auf Freigabe warten", async () => {
    await anmelden(alex, NUTZER.admin.email);
    await expect(alex.getByRole("link", { name: /(wartet|warten) auf Freigabe/ })).toBeVisible();
  });

  await test.step("5 · ein Klick führt in die Prüfliste", async () => {
    await alex.getByRole("link", { name: /(wartet|warten) auf Freigabe/ }).click();
    await expect(alex).toHaveURL(/\/admin\/projekte\?status=PENDING_REVIEW/);
    await expect(zeile).toBeVisible();
  });

  await test.step("6 · er gibt den Wiesenweg frei", async () => {
    await zeile.getByRole("button", { name: "Freigeben", exact: true }).click();
    await expect(zeile).toHaveCount(0);
  });

  await test.step("7 · jetzt ist das Projekt öffentlich", async () => {
    const antwort = await besucher.goto(projektseite);
    expect(antwort?.status()).toBe(200);
    await expect(besucher.getByRole("heading", { level: 1, name: wiesenweg.name })).toBeVisible();
  });

  await test.step("8 · Janas Sanduhr ist weg", async () => {
    await jana.reload();
    await expect(jana.getByRole("link", { name: /Projekt wird geprüft/ })).toHaveCount(0);
  });

  await test.step("Ende · veröffentlicht und als geprüft von Alex vermerkt", async () => {
    const rows = await mitDatenbank((db) =>
      db.query(`SELECT status, "moderatedById", "publishedAt" IS NOT NULL AS veroeffentlicht FROM "Listing" WHERE id = $1`, [
        wiesenweg.id,
      ]),
    );
    expect(rows.rows).toEqual([{ status: "PUBLISHED", moderatedById: NUTZER.admin.id, veroeffentlicht: true }]);
  });
});
