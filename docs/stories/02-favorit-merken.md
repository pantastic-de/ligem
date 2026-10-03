---
status: eingefroren
test: apps/web/e2e/02-favorit-merken.spec.ts
rollen: [suchende]
---

# 02 · Ein Projekt als Favorit merken

Mira schaut sich ohne Anmeldung Projekte an. Beim Sonnenhof klickt sie auf das Herz, um ihn
sich zu merken. LiGem erklärt ihr, dass sie dafür ein Konto braucht, und bietet „Anmelden“
an. Nach der Anmeldung landet sie genau dort, wo sie war, in derselben Suche. Jetzt klickt
sie das Herz noch einmal, und es wird rot.

Unter „Meine Favoriten“ findet sie den Sonnenhof wieder. E-Mails zu jeder Kleinigkeit möchte
sie nicht, also stellt sie die Benachrichtigung auf „Monatlich“. Ein paar Tage später hat sie
sich anders entschieden und entfernt den Favoriten wieder.

## Vertrag

**Start:** Mira ist nicht angemeldet und hat keine Favoriten.

| # | Schritt | Erwartung |
|---|---|---|
| 1 | sucht ohne Anmeldung nach „Sonnenhof“ | der Sonnenhof steht in der Ergebnisliste, mit einem Herz |
| 2 | klickt auf das Herz | ein Hinweis „Favoriten merken“ mit „Anmelden“ und „Konto erstellen“ |
| 3 | klickt „Anmelden“ und meldet sich an | sie ist zurück in derselben Suche (`/projekte?suche=Sonnenhof`) |
| 4 | klickt auf das Herz | das Herz ist gesetzt („aus den Favoriten entfernen“) |
| 5 | öffnet „Meine Favoriten“ über das Kontomenü | der Sonnenhof steht unter „Projekte (1)“, Benachrichtigung „Wöchentlich“ |
| 6 | wählt „Monatlich“ | „Monatlich“ ist ausgewählt, auch nach dem Neuladen |
| 7 | klickt „Entfernen“ | „Aus deinen Favoriten entfernt.“, unter Projekte steht wieder nichts |

**Ende:** Mira hat keinen Favoriten mehr.

**Nicht Teil davon:** Termine als Favoriten, Neuigkeiten und das rote Herz im Menü (dafür
müsste sich am Projekt etwas ändern), die E-Mails selbst.
