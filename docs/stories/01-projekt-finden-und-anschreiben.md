---
status: eingefroren
test: apps/web/e2e/01-projekt-finden-und-anschreiben.spec.ts
rollen: [suchende, betreiberin]
---

# 01 · Ein Projekt finden und anschreiben

Mira sucht eine Gemeinschaft, in der sie im Alter nicht allein wohnt. Eine Freundin hat ihr
vom „Sonnenhof“ erzählt, den Namen weiß sie noch, mehr nicht. Sie meldet sich bei LiGem an,
tippt „Sonnenhof“ oben in die Suche und findet das Projekt. Auf der Projektseite schreibt sie
eine kurze Nachricht; Name und E-Mail-Adresse stehen schon im Formular, weil sie angemeldet
ist, und ein CAPTCHA braucht sie nicht, weil ihre Adresse bestätigt ist.

Jana betreibt den Sonnenhof. Als sie sich das nächste Mal anmeldet, zeigt ihr ein roter
Punkt am Kontomenü, dass eine Anfrage offen ist. Ein Klick darauf führt sie direkt zu Miras
Nachricht. Jana nimmt die Anfrage an.

## Vertrag

**Start:** Mira hat ein bestätigtes Konto. Der Sonnenhof ist veröffentlicht und gehört Jana.
Es gibt keine offenen Anfragen.

| # | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Mira | meldet sich an | sie ist angemeldet und nicht mehr auf der Anmeldeseite |
| 2 | Mira | sucht oben nach „Sonnenhof“ | die Ergebnisliste zeigt „E2E Sonnenhof Gemeinschaft“ |
| 3 | Mira | öffnet das Ergebnis | die Projektseite des Sonnenhofs mit Namen als Überschrift |
| 4 | Mira | sieht das Kontaktformular | Name und E-Mail sind vorausgefüllt, kein CAPTCHA |
| 5 | Mira | schreibt eine Nachricht und sendet | „Deine Nachricht wurde verschickt.“ |
| 6 | Jana | meldet sich an | am Kontomenü steht eine offene Anfrage |
| 7 | Jana | klickt auf die Anzeige | Miras Nachricht mit Name und E-Mail, Status „Offen“ |
| 8 | Jana | klickt „Annehmen“ | Status „Angenommen“, keine offene Anfrage mehr am Kontomenü |

**Ende:** Eine Kontaktanfrage von Mira an den Sonnenhof mit Status „Angenommen“.

**Nicht Teil davon:** anonyme Anfragen mit CAPTCHA, die E-Mail-Weiterleitung an Jana (geht
an eine `.invalid`-Adresse und wird nie verschickt), Ablehnen.
