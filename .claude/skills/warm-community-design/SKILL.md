---
name: warm-community-design
description: Diesen Skill verwenden, sobald UI/UX für die ligem-App (apps/web) entworfen, gebaut oder überarbeitet wird – Farbpalette, Typografie, Barrierefreiheit (WCAG) und Mobile-First-Layout für eine gemeinwohlorientierte, alternative, nicht-technische Zielgruppe. Trigger-Stichworte: Design, Farben, Button, Komponente, Formular, Seite, Layout, Navigation, Barrierefreiheit, Accessibility, Mobile.
version: 0.1.0
---

# Warme, barrierefreie Designsprache für "Leben in Gemeinschaft"

## Zielgruppe & Grundhaltung

Die Nutzer:innen sind Wohngemeinschaften, WG-Suchende und gemeinwohlorientierte Organisationen – überwiegend **alternativ, wertorientiert und nicht technikaffin**. Das Design muss einladend, vertrauensbildend und unaufgeregt wirken, keine Tech-Startup-Ästhetik.

- Erdig, warm, handgemacht statt glatt/glänzend – keine Neonfarben, kein Glassmorphism, keine harten Schlagschatten.
- Klare, einfache Sprache (kurze Sätze, keine Anglizismen/Jargon: "Weiter" statt "Submit", "Suche" statt "Search").
- Lieber ein Element zu viel weglassen als die Seite zu überladen – Ruhe und Übersicht schlagen Dichte.

## Farbpalette

Alle Kontrastwerte sind gegen ihren jeweiligen Verwendungskontext geprüft (WCAG-Kontrastformel). Bei Anpassungen der Töne den Kontrast erneut mit einem Contrast-Checker verifizieren.

| Token | Hex | Verwendung | Kontrast |
|---|---|---|---|
| `--color-bg` | `#FAF6F0` | Seitenhintergrund (warmes Sandweiß) | – |
| `--color-surface` | `#FFFFFF` | Karten/Panels | – |
| `--color-text` | `#3A2E27` | Haupttext (Espresso-Braun) | 12.2:1 auf `--color-bg` |
| `--color-text-muted` | `#6B5C4F` | Sekundärtext, Labels (warmes Taupe) | 5.96:1 auf `--color-bg` |
| `--color-primary` | `#B14F24` | Primäre Buttons/Links (Terrakotta) | 5.23:1 mit weißem Text |
| `--color-secondary` | `#61703F` | Sekundäre Aktionen (Olivgrün) | 5.38:1 mit weißem Text |
| `--color-accent` | `#C89B3C` | Badges, Hervorhebungen (Ocker/Gold) | 5.13:1 mit `--color-text` |
| `--color-success` | `#4C6B3A` | Bestätigungen (Moosgrün) | 6.05:1 mit weißem Text |
| `--color-warning` | `#96631A` | Hinweise (Bernstein-Braun) | 5.13:1 mit weißem Text |
| `--color-error` | `#A63B2E` | Fehler (Ziegelrot) | 6.39:1 mit weißem Text |

Alle Werte erfüllen mindestens WCAG AA (≥ 4.5:1) für Fließtext. Für Status-Banner (Erfolg/Warnung/Fehler) statt der satten Farbe eine helle Tönung (10–15 % Beimischung auf `--color-bg`) als Hintergrund mit `--color-text` als Schriftfarbe verwenden – das ist zugänglicher als weiße Schrift auf kräftiger Fläche in kleinen Textgrößen.

### Tailwind v4 Theme (passend zu `apps/web/src/app/globals.css`)

```css
@import "tailwindcss";

:root {
  --color-bg: #FAF6F0;
  --color-surface: #FFFFFF;
  --color-text: #3A2E27;
  --color-text-muted: #6B5C4F;
  --color-primary: #B14F24;
  --color-secondary: #61703F;
  --color-accent: #C89B3C;
  --color-success: #4C6B3A;
  --color-warning: #96631A;
  --color-error: #A63B2E;
}

@theme inline {
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-text: var(--color-text);
  --color-text-muted: var(--color-text-muted);
  --color-primary: var(--color-primary);
  --color-secondary: var(--color-secondary);
  --color-accent: var(--color-accent);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
}
```

Kein separates Dark-Theme erzwingen, solange es nicht explizit gefordert wird – der bestehende `@media (prefers-color-scheme: dark)`-Block in `globals.css` kann später um abgedunkelte Varianten derselben warmen Farbfamilie ergänzt werden (nicht auf Blau/Grau wechseln).

## Typografie

- Humanistische, gut lesbare Sans-Serif (z. B. system-ui-Stack oder eine warme Schrift wie "Nunito"/"Work Sans") statt der Standard-Geist-Fonts, die eher technisch wirken.
- Basis-Schriftgröße **16px** (`body { font-size: 16px }` in `globals.css`, Tailwinds Standardwert). Eine spätere Nutzerentscheidung hatte dies zwischenzeitlich um ~20 % auf 14.4px verkleinert (inkl. proportional herunterskalierter `--text-*`-Skala); das wurde per explizitem Folge-Auftrag wieder rückgängig gemacht, da es Überschriften, Eingabefelder und Label unter die 16px-Schwelle drückte, ab der iOS Safari beim Fokussieren automatisch in die Seite hineinzoomt (siehe die jetzt behobene Abweichung unter Mobile-First unten). Die Spacing-Skala (`p-*`, `gap-*`, ...) ist von dieser Font-Größen-Historie unberührt.
- Zeilenhöhe ≥ 1.5, Zeilenlänge max. ~70 Zeichen für Fließtext.
- Keine dünnen Schriftschnitte (< 400) für Fließtext, keine reinen Großbuchstaben-Label (schlecht für Screenreader und Lesbarkeit).

## Barrierefreiheit (WCAG 2.2 AA) – Checkliste

- Kontrast: Text ≥ 4.5:1, große Schrift/UI-Elemente ≥ 3:1 (siehe Palette oben).
- Fokus sichtbar: jedes interaktive Element bekommt einen deutlichen Fokusring (z. B. 3px `--color-text` Outline mit 2px Abstand), niemals `outline: none` ohne Ersatz.
- Keine Information nur über Farbe – zusätzlich Icon, Text oder Muster (z. B. Fehler = rote Farbe **und** Text **und** Icon).
- Alle Formularfelder mit sichtbarem `<label>` (kein reines Placeholder-Label), Fehlermeldungen als Text direkt am Feld, nicht nur farblich.
- Alt-Texte für alle bedeutungstragenden Bilder; dekorative Bilder mit leerem `alt=""`.
- Tastaturbedienbarkeit: alle Aktionen ohne Maus erreichbar, logische Tab-Reihenfolge.
- `prefers-reduced-motion` respektieren – Animationen kurz, dezent, abschaltbar.
- Einfache Sprache statt Fachbegriffen; Buttons klar benennen ("Termin eintragen" statt "Erstellen").

## Mobile-First

- Layout immer zuerst für schmale Screens entwerfen, einspaltig, dann für größere Breakpoints erweitern.
- Tap-Ziele mind. 48×48px, Mindestabstand 8px zwischen klickbaren Elementen. **Abweichung:** Formularfelder und die Kalender-Tageszellen sind seit der globalen `--spacing`-Reduktion in `globals.css` (0.19rem statt 0.25rem, spätere explizite Nutzerentscheidung) deutlich kleiner als 48px (`min-h-12` ≈ 36.5px, `min-h-11` ≈ 33.4px, Checkboxen/Radios `h-5` ≈ 15.2px) — das unterschreitet sowohl dieses 48px-Ziel als auch die WCAG-AA-Mindestgröße von 44×44px für Formularfelder/Tap-Ziele.
- Eingabefelder mit Schriftgröße ≥ 16px (verhindert Auto-Zoom in iOS Safari). **Behoben:** `body`/`--text-*` sind wieder auf Standardwerte (16px Basis), und eine globale, `!important`-qualifizierte Regel in `globals.css` (`input, select, textarea, label { font-size: 16px !important; }`) erzwingt zusätzlich 16px für genau diese vier Elementtypen, unabhängig davon, welche Tailwind-Textgrößen-Klasse (`text-sm`, `text-xs`, ...) sie sonst tragen — direkt vom Nutzer als Zoom-Problem gemeldet und seither in Playwright gegengeprüft.
- Navigation nicht hinter einem reinen Hamburger-Icon verstecken – sichtbare Labels (z. B. Bottom-Navigation mit Icon **und** Text) sind für nicht-technische Nutzer:innen auffindbarer.
- Primäre Aktion (z. B. "WG-Zimmer inserieren", "Termin eintragen") als gut erreichbarer, daumenfreundlicher Button im unteren Bildschirmbereich platzieren.
- Keine Interaktionen, die nur per Hover funktionieren (Touch hat kein Hover).

## Do / Don't

- ✅ Erdige, gedeckte Töne, viel Weißraum, große Buttons, klare Labels.
- ✅ Icons immer mit Textbeschriftung kombinieren.
- ❌ Keine grellen/satten Neonfarben oder reines Schwarz/Weiß-Kontrastdesign.
- ❌ Keine dichten Datentabellen oder Fachjargon auf zentralen Seiten.
- ❌ Keine wichtigen Aktionen, die ausschließlich per Hover oder Icon-ohne-Label zugänglich sind.
