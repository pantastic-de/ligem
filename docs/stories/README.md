# Geschichten

Eine Geschichte beschreibt einen zusammenhängenden Ablauf aus der Sicht der Menschen, die
LiGem benutzen: eine Suchende, eine Projektbetreiberin, ein Admin. Sie fragt nicht „tut
diese Seite, was sie soll?", sondern „kommt ein Mensch mit diesem Ziel an?".

Jede Geschichte hat zwei Teile:

1. **Die Geschichte selbst** (diese Dateien): Ausgangslage, Ablauf in Prosa, und der
   **Vertrag**: Startzustand, Schritte mit Erwartung, Endzustand und was ausdrücklich nicht
   dazugehört. Der Vertrag steht vor dem ersten Klick fest, damit hinterher nicht gegen das
   bewertet wird, was man vorgefunden hat.
2. **Der eingefrorene Test** in `apps/web/e2e/NN-*.spec.ts`: derselbe Ablauf als
   Playwright-Test, der durch die echte Oberfläche klickt. Läuft er grün, kommt die
   Geschichte noch an; läuft er rot, hat eine Änderung sie unterbrochen.

| Nr. | Geschichte | Test | Status |
|---|---|---|---|
| 01 | [Ein Projekt finden und anschreiben](01-projekt-finden-und-anschreiben.md) | `e2e/01-projekt-finden-und-anschreiben.spec.ts` | eingefroren |
| 02 | [Ein Projekt als Favorit merken](02-favorit-merken.md) | `e2e/02-favorit-merken.spec.ts` | eingefroren |
| 03 | [Ein neues Projekt prüfen und freigeben](03-projekt-freigeben.md) | `e2e/03-projekt-freigeben.spec.ts` | eingefroren |

## Ausführen

Voraussetzung: Der Entwicklungs-Stack läuft (`docker compose up`, App unter
http://localhost:3000). Dann auf dem Mac, nicht im Container:

```bash
cd apps/web
npx playwright test            # alle Geschichten
npx playwright test 02         # nur Geschichte 02
npx playwright test --headed   # dabei zusehen
npx playwright show-report     # Bericht des letzten Laufs (mit Screenshots bei Fehlern)
```

Beim ersten Mal einmalig den Browser holen: `npx playwright install chromium`.

## Testdaten

`e2e/global-setup.ts` legt vor jedem Lauf frische Testdaten an und räumt Reste eines
abgebrochenen Laufs vorher weg; `e2e/global-teardown.ts` entfernt sie danach
(`E2E_KEEP=1` lässt sie zum Nachsehen stehen). Alles trägt das Präfix `e2e-`:

| Person | Konto | Rolle |
|---|---|---|
| Mira Suchend | mira@e2e.ligem.invalid | sucht ein Wohnprojekt |
| Jana Hofmann | jana@e2e.ligem.invalid | betreibt „E2E Sonnenhof Gemeinschaft“ (veröffentlicht) und „E2E Wohnprojekt Wiesenweg“ (in Prüfung) |
| Alex Admin | alex@e2e.ligem.invalid | Admin |

Passwort aller drei: `e2e-Passwort-123`. Die Adressen enden auf `.invalid`, an solche
Adressen verschickt LiGem nie eine E-Mail. Die Geschichten sind außerdem so gewählt, dass
keine Mail an echte Admins ausgelöst wird (ein neu eingereichtes Projekt würde alle Admins
benachrichtigen; deshalb liegt das Projekt in Geschichte 03 schon in der Prüfung).

## Eine neue Geschichte

1. Ablauf in Prosa aufschreiben, als `NN-kurzname.md` hier im Ordner.
2. Vertrag ergänzen: Start, Schritte mit Erwartung, Ende, nicht Teil davon.
3. Durchspielen (von Hand oder von Claude im Browser). Was hakt, wird behoben oder als
   offene Frage notiert.
4. Läuft sie durch: als `apps/web/e2e/NN-kurzname.spec.ts` einfrieren, Testdaten in
   `e2e/support/testdaten.ts` ergänzen, Tabelle oben nachtragen.
