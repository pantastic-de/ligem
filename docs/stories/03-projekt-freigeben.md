---
status: eingefroren
test: apps/web/e2e/03-projekt-freigeben.spec.ts
rollen: [betreiberin, admin, besucher]
---

# 03 · Ein neues Projekt prüfen und freigeben

Jana hat ihr zweites Projekt, den „Wohnprojekt Wiesenweg“, eingetragen. Es ist noch nicht
öffentlich: Neue Projekte schaut sich erst ein Admin an. Wenn Jana sich anmeldet, zeigt ihr
eine Sanduhr oben im Menü, dass ein Projekt geprüft wird. Wer die Projektseite jetzt schon
aufruft, findet sie nicht.

Alex ist Admin. Bei der Anmeldung sieht er an der Sanduhr, dass Projekte auf Freigabe warten,
und gelangt mit einem Klick in die Prüfliste. Er gibt den Wiesenweg frei. Ab jetzt ist das
Projekt für alle sichtbar, und Janas Sanduhr ist verschwunden.

## Vertrag

**Start:** Der Wiesenweg gehört Jana und hat den Status „Wird geprüft“. Jana hat sonst kein
Projekt in Prüfung.

| # | Wer | Schritt | Erwartung |
|---|---|---|---|
| 1 | Besucher | ruft `/projekt/e2e-wohnprojekt-wiesenweg` auf | Seite nicht gefunden (404) |
| 2 | Jana | meldet sich an | oben steht „1 Projekt wird geprüft“ |
| 3 | Jana | klickt darauf | „Meine Projekte“ zeigt den Wiesenweg mit „Wird geprüft“ |
| 4 | Alex | meldet sich an | oben steht „… wartet/warten auf Freigabe“ |
| 5 | Alex | klickt darauf | die Prüfliste „Wird geprüft“ enthält den Wiesenweg |
| 6 | Alex | klickt beim Wiesenweg „Freigeben“ | der Wiesenweg ist aus der Prüfliste verschwunden |
| 7 | Besucher | ruft die Projektseite erneut auf | die Seite lädt, Überschrift „E2E Wohnprojekt Wiesenweg“ |
| 8 | Jana | lädt die Seite neu | die Sanduhr ist weg |

**Ende:** Der Wiesenweg ist veröffentlicht, als geprüft von Alex.

**Nicht Teil davon:** das Eintragen über das Formular und der KI-Import (würden eine
Benachrichtigung an alle echten Admins auslösen), Ablehnen, die Freigabe-E-Mail an Jana (geht
an eine `.invalid`-Adresse).
