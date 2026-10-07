// Every e-mail LiGem sends, as an editable template (see /admin/e-mails).
// This file holds the defaults and the rendering; it has no database access,
// so the admin editor can use the same functions for its live preview. The
// server side (overrides from the EmailTemplate table, sending) lives in
// email-template-store.ts.
//
// Placeholders are written {{name}}. Plain placeholders are HTML-escaped
// when inserted; the few marked `html` (built by the app itself, e.g. the
// list of favorite news) are inserted as they are.

export type EmailPlaceholder = {
  name: string;
  description: string;
  example: string;
  html?: boolean;
};

// Which notification setting a mail falls under (see /benachrichtigungen).
// "konto" mails (address confirmation, password reset, data export,
// account deleted) always go out; the others can be switched off.
// "teilnahme" (confirmation of one's own event registration and its
// cancellation link) always goes out too, like "konto"; "termine" (organizer
// mails about interest and cancellations) follows its own switch.
export type EmailCategory = "konto" | "teilnahme" | "termine" | "kontaktanfragen" | "projekte" | "favoriten" | "admin" | "fusszeile";

export type EmailTemplateDefinition = {
  key: string;
  category: EmailCategory;
  label: string;
  // When the mail goes out, for the admin overview.
  trigger: string;
  recipients: string;
  placeholders: EmailPlaceholder[];
  subject: string;
  body: string;
};

const P = {
  projekt: { name: "projekt", description: "Name des Projekts", example: "Löwenzahnsiedlung" },
  link: (description: string, example: string): EmailPlaceholder => ({ name: "link", description, example }),
  impressum: {
    name: "impressum_link",
    description: "Link zum Impressum (Kontaktdaten)",
    example: "https://ligem.de/impressum",
  },
  neuigkeiten: {
    name: "neuigkeiten",
    description: "Liste der Neuigkeiten mit Links (wird automatisch erzeugt)",
    example:
      '<ul><li><a href="https://ligem.de/projekt/lowenzahnsiedlung">„Löwenzahnsiedlung“ hat 2 neue Termine eingetragen</a><ul><li><a href="https://ligem.de/event/besuchstag">Besuchstag</a>, 17.10.2026, 14:00 Uhr</li><li><a href="https://ligem.de/event/infoabend">Infoabend</a>, 24.10.2026, 19:00 Uhr</li></ul></li></ul>',
    html: true,
  },
  anzahl: { name: "anzahl_text", description: "z. B. „1 Neuigkeit“ oder „3 Neuigkeiten“", example: "2 Neuigkeiten" },
  favoritenLink: {
    name: "favoriten_link",
    description: "Link zu „Meine Favoriten“",
    example: "https://ligem.de/mein-konto/favoriten",
  },
} satisfies Record<string, EmailPlaceholder | ((...args: string[]) => EmailPlaceholder)>;

const SIGNATURE = "<p>Viele Grüße<br>Euer LiGem-Team</p>";

// Defaults are written compactly below; one block per line keeps them
// readable in the admin editor's text field.
function readable(body: string): string {
  return body.replace(/(<\/(?:p|blockquote|ul|ol|h2|h3)>)(?!\n)/g, "$1\n").replace(/\}\}(?=<p>)/g, "}}\n").trim();
}

const RAW_TEMPLATES: EmailTemplateDefinition[] = [
  {
    key: "email-bestaetigen",
    category: "konto",
    label: "E-Mail-Adresse bestätigen",
    trigger: "Nach der Registrierung, nach einer Änderung der E-Mail-Adresse und auf Wunsch unter „Mein Konto“.",
    recipients: "Die neue Nutzerin bzw. der neue Nutzer",
    placeholders: [P.link("Bestätigungslink (24 Stunden gültig)", "https://ligem.de/verifizieren?token=abc&email=…")],
    subject: "Bitte bestätige deine E-Mail-Adresse bei LiGem",
    body:
      "<p>Willkommen bei LiGem!</p>" +
      '<p>Bitte bestätige deine E-Mail-Adresse, indem du diesen Link öffnest:<br><a href="{{link}}">E-Mail-Adresse bestätigen</a></p>' +
      "<p>Der Link ist 24 Stunden gültig. Nach der Bestätigung kannst du Kontaktanfragen ohne CAPTCHA senden.</p>" +
      "<p>Falls du dich nicht bei LiGem registriert hast, kannst du diese E-Mail ignorieren.</p>" +
      SIGNATURE,
  },
  {
    key: "passwort-zuruecksetzen",
    category: "konto",
    label: "Passwort zurücksetzen",
    trigger: "Wenn jemand unter „Passwort vergessen?“ seine Adresse eingibt.",
    recipients: "Die Inhaberin bzw. der Inhaber des Kontos",
    placeholders: [P.link("Link zum Festlegen eines neuen Passworts (1 Stunde gültig)", "https://ligem.de/passwort-zuruecksetzen?token=abc&email=…")],
    subject: "Dein neues Passwort für LiGem",
    body:
      "<p>Hallo,</p>" +
      "<p>jemand (hoffentlich du) möchte das Passwort für dein LiGem-Konto neu setzen. " +
      'Über diesen Link kannst du ein neues Passwort wählen:<br><a href="{{link}}">Neues Passwort festlegen</a></p>' +
      "<p>Der Link ist eine Stunde lang gültig und funktioniert nur einmal.</p>" +
      "<p>Falls du das nicht warst, ignoriere diese E-Mail einfach. Dein bisheriges Passwort bleibt dann unverändert.</p>" +
      SIGNATURE,
  },
  {
    key: "kontaktanfrage",
    category: "kontaktanfragen",
    label: "Neue Kontaktanfrage",
    trigger: "Wenn jemand über das Kontaktformular eines Projekts schreibt.",
    recipients: "Ersteller:in und Mitverwalter:innen des Projekts (abschaltbar unter „Benachrichtigungen“). Eine Antwort geht direkt an die anfragende Person.",
    placeholders: [
      P.projekt,
      { name: "absender_name", description: "Name der anfragenden Person", example: "Mira Sommer" },
      { name: "absender_email", description: "E-Mail-Adresse der anfragenden Person", example: "mira@example.org" },
      { name: "absender_telefon", description: "Telefonnummer der anfragenden Person, sonst „nicht angegeben“", example: "0151 234 56 78" },
      { name: "email_hinweis", description: "Ob die E-Mail-Adresse geprüft ist (bestätigtes LiGem-Konto) oder nicht", example: "Hinweis: Diese E-Mail-Adresse wurde nicht überprüft. Sie wurde ohne bestätigtes LiGem-Konto angegeben." },
      { name: "nachricht", description: "Die Nachricht (Zeilenumbrüche bleiben erhalten)", example: "Hallo ihr Lieben,\nwir sind eine Familie mit zwei Kindern und würden euch gern kennenlernen." },
      P.link("Link zu den Kontaktanfragen des Projekts", "https://ligem.de/projekte/abc/anfragen"),
    ],
    subject: "Neue Kontaktanfrage für „{{projekt}}“",
    body:
      "<p>Hallo,</p>" +
      "<p>{{absender_name}} ({{absender_email}}) hat über LiGem eine Nachricht zu „{{projekt}}“ geschickt:</p>" +
      "<blockquote>{{nachricht}}</blockquote>" +
      "<p>Telefon: {{absender_telefon}}</p>" +
      "<p>{{email_hinweis}}</p>" +
      "<p>Du kannst direkt auf diese E-Mail antworten, die Antwort geht an {{absender_name}}. " +
      'Annehmen oder ablehnen kannst du die Anfrage hier:<br><a href="{{link}}">Kontaktanfragen ansehen</a></p>' +
      SIGNATURE,
  },
  {
    key: "kontaktanfrage-bestaetigung",
    category: "teilnahme",
    label: "Kontaktanfrage: Bestätigung für den Absender",
    trigger: "Wenn jemand mit bestätigtem LiGem-Konto über das Kontaktformular eines Projekts schreibt.",
    recipients: "Die Person selbst, an die Adresse ihres Kontos. Ohne bestätigtes Konto wird keine Bestätigung verschickt.",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      P.projekt,
      { name: "nachricht", description: "Die gesendete Nachricht", example: "Hallo ihr Lieben,\nwir würden euch gern kennenlernen." },
      { name: "projekt_link", description: "Link zur Projektseite", example: "https://ligem.de/projekt/lowenzahnsiedlung" },
    ],
    subject: "Deine Nachricht an „{{projekt}}“",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>deine Nachricht an „{{projekt}}“ ist angekommen und wurde direkt an die Verantwortlichen weitergeleitet:</p>" +
      "<blockquote>{{nachricht}}</blockquote>" +
      "<p>Sie melden sich per E-Mail oder telefonisch bei dir. Bis dahin kannst du gern weiter stöbern:<br>" +
      '<a href="{{projekt_link}}">Zur Projektseite</a></p>' +
      SIGNATURE,
  },
  {
    key: "termin-teilnahme-bestaetigung",
    category: "teilnahme",
    label: "Termin: Bestätigung für Teilnehmende",
    trigger: "Wenn sich eine Person mit bestätigtem LiGem-Konto über die Terminseite für einen Termin interessiert.",
    recipients: "Die Person selbst, an die Adresse ihres Kontos (nur mit bestätigtem Konto). Enthält den Link zum Absagen.",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "termin", description: "Titel des Termins", example: "Besuchstag im Haus an der Iller" },
      { name: "datum", description: "Datum und Uhrzeit", example: "Samstag, 14. November 2026, 14:00 bis 17:00 Uhr" },
      { name: "ort", description: "Ort, sonst „Ort siehe Terminseite“", example: "Wurms 2, 87452 Altusried" },
      { name: "veranstalter", description: "Veranstaltendes Projekt", example: "Haus an der Iller" },
      { name: "personen", description: "Angegebene Personenzahl", example: "2" },
      { name: "termin_link", description: "Link zur Terminseite", example: "https://ligem.de/event/besuchstag" },
      { name: "kalender_link", description: "Link zur Kalenderdatei (.ics)", example: "https://ligem.de/event/besuchstag/ical" },
      { name: "teilnahme_link", description: "Link zu „Meine Teilnahme“ (Übersicht und Absagen)", example: "https://ligem.de/mein-konto/teilnahme" },
      { name: "absage_link", description: "Persönlicher Link zum Absagen, ohne Anmeldung nutzbar", example: "https://ligem.de/termin-absagen?t=abc" },
    ],
    subject: "Du interessierst dich für „{{termin}}“",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>schön, dass du bei „{{termin}}“ dabei sein möchtest. Wir haben {{veranstalter}} Bescheid gegeben, dass du kommen möchtest.</p>" +
      "<p><strong>{{termin}}</strong><br>{{datum}}<br>{{ort}}<br>Personen: {{personen}}</p>" +
      "<p>Alles Weitere, etwa ob noch Plätze frei sind, klärt {{veranstalter}} direkt mit dir.</p>" +
      '<p><a href="{{termin_link}}">Zur Terminseite</a> · <a href="{{kalender_link}}">In meinen Kalender übernehmen</a></p>' +
      "<p>Falls etwas dazwischenkommt, ist das überhaupt kein Problem. Wir würden dich nur herzlich bitten, kurz abzusagen, " +
      "damit {{veranstalter}} Bescheid weiß und den Platz vielleicht jemand anderem anbieten kann. " +
      'Das geht ganz einfach unter <a href="{{teilnahme_link}}">„Meine Teilnahme“</a>, dort kannst du auch einen kurzen Kommentar hinterlassen.</p>' +
      '<p>Ohne Anmeldung geht es auch direkt über diesen Link: <a href="{{absage_link}}">Teilnahme absagen</a></p>' +
      SIGNATURE,
  },
  {
    key: "termin-absage-bestaetigung",
    category: "teilnahme",
    label: "Termin: Bestätigung der Absage für Teilnehmende",
    trigger: "Wenn eine Person mit bestätigtem LiGem-Konto ihre Teilnahme absagt (über „Meine Teilnahme“ oder den Link aus der Bestätigungsmail).",
    recipients: "Die Person selbst, an die Adresse ihres Kontos.",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "termin", description: "Titel des Termins", example: "Besuchstag im Haus an der Iller" },
      { name: "datum", description: "Datum und Uhrzeit", example: "Samstag, 14. November 2026, 14:00 bis 17:00 Uhr" },
      { name: "veranstalter", description: "Veranstaltendes Projekt", example: "Haus an der Iller" },
      { name: "kommentar", description: "Kommentar zur Absage, sonst „kein Kommentar“", example: "Leider krank, wir kommen gern zum nächsten Besuchstag." },
      { name: "termine_link", description: "Link zum Terminkalender", example: "https://ligem.de/termine" },
    ],
    subject: "Abgesagt: „{{termin}}“",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>danke, dass du Bescheid gegeben hast. Deine Teilnahme an „{{termin}}“ ({{datum}}) ist abgesagt, und {{veranstalter}} ist informiert.</p>" +
      "<p>Dein Kommentar: {{kommentar}}</p>" +
      '<p>Vielleicht passt ja ein anderer Termin: <a href="{{termine_link}}">Zum Terminkalender</a></p>' +
      SIGNATURE,
  },
  {
    key: "termin-interesse-veranstalter",
    category: "termine",
    label: "Termin: neue Interessensmeldung (an Veranstalter)",
    trigger: "Wenn jemand über die Terminseite Interesse an einem Termin meldet.",
    recipients: "Ersteller:in des Termins sowie Ersteller:in und Mitverwalter:innen des Projekts. Eine Antwort geht direkt an die Person.",
    placeholders: [
      { name: "termin", description: "Titel des Termins", example: "Besuchstag im Haus an der Iller" },
      { name: "datum", description: "Datum und Uhrzeit", example: "Samstag, 14. November 2026, 14:00 bis 17:00 Uhr" },
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "email", description: "E-Mail-Adresse der Person", example: "mira@example.org" },
      { name: "personen", description: "Angegebene Personenzahl", example: "2" },
      { name: "nachricht", description: "Nachricht der Person, sonst „keine Nachricht“", example: "Wir bringen einen Kuchen mit." },
      { name: "email_hinweis", description: "Ob die E-Mail-Adresse geprüft ist (bestätigtes LiGem-Konto) oder nicht", example: "Hinweis: Diese E-Mail-Adresse wurde nicht überprüft. Sie wurde ohne bestätigtes LiGem-Konto angegeben." },
      { name: "gesamt", description: "Personen insgesamt, die bisher Interesse gemeldet haben", example: "7" },
      { name: "uebersicht_link", description: "Link zur Übersicht aller Anmeldungen", example: "https://ligem.de/mein-konto/anmeldungen" },
    ],
    subject: "Neue Interessensmeldung für „{{termin}}“",
    body:
      "<p>Hallo,</p>" +
      "<p>{{name}} ({{email}}) möchte mit {{personen}} Person(en) zu „{{termin}}“ kommen ({{datum}}).</p>" +
      "<blockquote>{{nachricht}}</blockquote>" +
      "<p>{{email_hinweis}}</p>" +
      "<p>Damit haben bisher insgesamt {{gesamt}} Personen Interesse gemeldet. Du kannst direkt auf diese E-Mail antworten, die Antwort geht an {{name}}.</p>" +
      '<p><a href="{{uebersicht_link}}">Alle Anmeldungen ansehen</a></p>' +
      SIGNATURE,
  },
  {
    key: "termin-absage-veranstalter",
    category: "termine",
    label: "Termin: Absage (an Veranstalter)",
    trigger: "Wenn jemand über den Link in der Bestätigungsmail absagt.",
    recipients: "Ersteller:in des Termins sowie Ersteller:in und Mitverwalter:innen des Projekts.",
    placeholders: [
      { name: "termin", description: "Titel des Termins", example: "Besuchstag im Haus an der Iller" },
      { name: "datum", description: "Datum und Uhrzeit", example: "Samstag, 14. November 2026, 14:00 bis 17:00 Uhr" },
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "email", description: "E-Mail-Adresse der Person", example: "mira@example.org" },
      { name: "personen", description: "Personenzahl der abgesagten Meldung", example: "2" },
      { name: "kommentar", description: "Kommentar zur Absage, sonst „kein Kommentar“", example: "Leider krank, wir kommen gern zum nächsten Besuchstag." },
      { name: "gesamt", description: "Personen insgesamt nach der Absage", example: "5" },
      { name: "uebersicht_link", description: "Link zur Übersicht aller Anmeldungen", example: "https://ligem.de/mein-konto/anmeldungen" },
    ],
    subject: "Absage für „{{termin}}“",
    body:
      "<p>Hallo,</p>" +
      "<p>{{name}} ({{email}}) kann leider nicht zu „{{termin}}“ kommen ({{datum}}) und hat die Teilnahme für {{personen}} Person(en) abgesagt.</p>" +
      "<blockquote>{{kommentar}}</blockquote>" +
      "<p>Damit haben jetzt insgesamt {{gesamt}} Personen Interesse gemeldet.</p>" +
      '<p><a href="{{uebersicht_link}}">Alle Anmeldungen ansehen</a></p>' +
      SIGNATURE,
  },
  {
    key: "projekt-eingereicht",
    category: "projekte",
    label: "Projekt eingereicht (Eingangsbestätigung)",
    trigger: "Nach dem Eintragen eines neuen Projekts.",
    recipients: "Wer das Projekt eingetragen hat",
    placeholders: [P.projekt, P.link("Link zu „Meine Projekte“", "https://ligem.de/meine-projekte")],
    subject: "Danke für euer Projekt „{{projekt}}“",
    body:
      "<p>Hallo,</p>" +
      "<p>schön, dass ihr „{{projekt}}“ bei LiGem eingetragen habt! Wir schauen uns den Eintrag kurz an und schalten ihn dann frei. " +
      "Sobald er öffentlich sichtbar ist, bekommt ihr eine weitere E-Mail.</p>" +
      '<p>Bis dahin könnt ihr ihn jederzeit weiter bearbeiten:<br><a href="{{link}}">Meine Projekte</a></p>' +
      SIGNATURE,
  },
  {
    key: "projekt-eingereicht-admin",
    category: "admin",
    label: "Neues Projekt zur Prüfung (an Admins)",
    trigger: "Nach dem Eintragen eines neuen Projekts.",
    recipients: "Alle Admins (außer der Person, die es eingetragen hat)",
    placeholders: [
      P.projekt,
      { name: "eingereicht_von", description: "Name oder E-Mail der Person, die es eingetragen hat", example: "Jonas Weber" },
      P.link("Link zur Freigabe-Liste", "https://ligem.de/admin/projekte?status=PENDING_REVIEW"),
    ],
    subject: "Neues Projekt zur Prüfung: „{{projekt}}“",
    body:
      "<p>Hallo,</p>" +
      "<p>{{eingereicht_von}} hat das Projekt „{{projekt}}“ eingetragen. Es wartet auf die Prüfung:<br>" +
      '<a href="{{link}}">Zur Freigabe</a></p>',
  },
  {
    key: "projekt-online",
    category: "projekte",
    label: "Projekt freigegeben (erstmals online)",
    trigger: "Wenn ein Admin ein neues Projekt freigibt.",
    recipients: "Ersteller:in und alle Mitverwalter:innen",
    placeholders: [P.projekt, P.link("Link zur öffentlichen Projektseite", "https://ligem.de/projekt/lowenzahnsiedlung")],
    subject: "„{{projekt}}“ ist jetzt bei LiGem online",
    body:
      "<p>Hallo,</p>" +
      '<p>gute Nachrichten: „{{projekt}}“ ist freigegeben und ab sofort für alle sichtbar:<br><a href="{{link}}">{{projekt}} ansehen</a></p>' +
      "<p>Tipp: Mit Terminen wie Besuchstagen oder Infoabenden lernen Interessierte euch am leichtesten persönlich kennen. " +
      "Termine tragt ihr unter „Meine Projekte“ ein.</p>" +
      SIGNATURE,
  },
  {
    key: "projekt-aenderungen-freigegeben",
    category: "projekte",
    label: "Änderungen am Projekt freigegeben",
    trigger: "Wenn ein Admin Änderungen an einem bereits veröffentlichten Projekt freigibt.",
    recipients: "Ersteller:in und alle Mitverwalter:innen",
    placeholders: [P.projekt, P.link("Link zur öffentlichen Projektseite", "https://ligem.de/projekt/lowenzahnsiedlung")],
    subject: "Eure Änderungen an „{{projekt}}“ sind freigegeben",
    body:
      "<p>Hallo,</p>" +
      '<p>eure Änderungen an „{{projekt}}“ sind geprüft und jetzt öffentlich sichtbar:<br><a href="{{link}}">{{projekt}} ansehen</a></p>' +
      SIGNATURE,
  },
  {
    key: "projekt-entfernt-moderation",
    category: "projekte",
    label: "Projekt von der Moderation gelöscht",
    trigger: "Wenn ein Admin ein Projekt löscht.",
    recipients: "Ersteller:in und alle Mitverwalter:innen",
    placeholders: [P.projekt, P.impressum],
    subject: "„{{projekt}}“ wurde von LiGem entfernt",
    body:
      "<p>Hallo,</p>" +
      "<p>euer Projekt „{{projekt}}“ wurde von der LiGem-Moderation gelöscht, zusammen mit seinen Terminen, Fotos und Videos.</p>" +
      "<p>Wenn ihr Fragen dazu habt oder das für ein Versehen haltet, antwortet einfach auf diese E-Mail " +
      'oder schreibt uns über die Kontaktdaten im <a href="{{impressum_link}}">Impressum</a>.</p>' +
      SIGNATURE,
  },
  {
    key: "projekt-geloescht-inhaber",
    category: "projekte",
    label: "Projekt von der Inhaberin bzw. dem Inhaber gelöscht",
    trigger: "Wenn die Person, die ein Projekt eingetragen hat, es selbst löscht.",
    recipients: "Ersteller:in (als Bestätigung) und alle Mitverwalter:innen",
    placeholders: [
      P.projekt,
      { name: "geloescht_von", description: "Name der Person, die gelöscht hat", example: "Jonas Weber" },
      P.impressum,
    ],
    subject: "„{{projekt}}“ wurde gelöscht",
    body:
      "<p>Hallo,</p>" +
      "<p>{{geloescht_von}} hat das Projekt „{{projekt}}“ bei LiGem gelöscht, zusammen mit seinen Terminen, Fotos und Videos. " +
      "Es ist nicht mehr öffentlich sichtbar.</p>" +
      "<p>Falls das nicht so gewollt war, antwortet einfach auf diese E-Mail " +
      'oder schreibt uns über die Kontaktdaten im <a href="{{impressum_link}}">Impressum</a>.</p>' +
      SIGNATURE,
  },
  {
    key: "favoriten-sofort",
    category: "favoriten",
    label: "Favoriten: Neuigkeit (sofort)",
    trigger: "Direkt nach einer Neuigkeit bei einem Favoriten mit der Einstellung „Sofort“.",
    recipients: "Alle, die das Projekt bzw. den Termin gemerkt haben",
    placeholders: [P.neuigkeiten, P.anzahl, P.favoritenLink],
    subject: "Neues bei deinen Favoriten auf LiGem",
    body:
      "<p>Hallo,</p>" +
      "<p>es gibt Neues bei deinen Favoriten auf LiGem:</p>" +
      "{{neuigkeiten}}" +
      '<p>Alle Favoriten und wie oft wir dir schreiben, kannst du hier ändern:<br><a href="{{favoriten_link}}">Meine Favoriten</a></p>' +
      SIGNATURE,
  },
  {
    key: "favoriten-zusammenfassung",
    category: "favoriten",
    label: "Favoriten: wöchentliche/monatliche Zusammenfassung",
    trigger: "Einmal pro Woche bzw. Monat, wenn es bei Favoriten mit dieser Einstellung Neues gab.",
    recipients: "Alle, die Favoriten mit „Wöchentlich“ oder „Monatlich“ haben",
    placeholders: [P.neuigkeiten, P.anzahl, P.favoritenLink],
    subject: "{{anzahl_text}} bei deinen Favoriten auf LiGem",
    body:
      "<p>Hallo,</p>" +
      "<p>hier ist deine Zusammenfassung, was sich bei deinen Favoriten auf LiGem getan hat:</p>" +
      "{{neuigkeiten}}" +
      '<p>Alle Favoriten und wie oft wir dir schreiben, kannst du hier ändern:<br><a href="{{favoriten_link}}">Meine Favoriten</a></p>' +
      SIGNATURE,
  },
  {
    key: "projekt-uebertragen",
    category: "projekte",
    label: "Projekt an dich übertragen",
    trigger: "Wenn jemand beim Löschen des eigenen Kontos ein Projekt an eine andere Person übergibt.",
    recipients: "Die neue Inhaberin bzw. der neue Inhaber",
    placeholders: [
      P.projekt,
      { name: "uebertragen_von", description: "Name der Person, die das Projekt übergeben hat", example: "Jonas Weber" },
      P.link("Link zum Bearbeiten des Projekts", "https://ligem.de/projekte/abc/bearbeiten"),
    ],
    subject: "„{{projekt}}“ gehört jetzt dir",
    body:
      "<p>Hallo,</p>" +
      "<p>{{uebertragen_von}} hat das eigene LiGem-Konto gelöscht und dir dabei das Projekt „{{projekt}}“ übergeben. " +
      "Du bist jetzt Inhaberin bzw. Inhaber, mit allen Terminen, Fotos und Kontaktanfragen.</p>" +
      '<p>Hier kannst du das Projekt ansehen und bearbeiten:<br><a href="{{link}}">Projekt bearbeiten</a></p>' +
      SIGNATURE,
  },
  {
    key: "konto-geloescht",
    category: "konto",
    label: "Konto gelöscht (Bestätigung)",
    trigger: "Direkt nachdem jemand das eigene Konto gelöscht hat.",
    recipients: "Die Person, die ihr Konto gelöscht hat",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "zusammenfassung", description: "Was mit Projekten, Terminen und Favoriten passiert ist", example: "„Löwenzahnsiedlung“: an Jonas Weber übertragen\n„Haus am See“: gelöscht\n3 Favoriten gelöscht" },
    ],
    subject: "Dein LiGem-Konto ist gelöscht",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>dein Konto bei LiGem ist gelöscht. Das ist mit deinen Inhalten passiert:</p>" +
      "<blockquote>{{zusammenfassung}}</blockquote>" +
      "<p>Danke, dass du dabei warst. Du bist jederzeit wieder willkommen.</p>" +
      SIGNATURE,
  },
  {
    key: "konto-gesperrt",
    category: "konto",
    label: "Konto gesperrt",
    trigger: "Wenn ein Admin ein Konto unter Admin > Nutzer:innen sperrt.",
    recipients: "Die Person, deren Konto gesperrt wurde",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "grund", description: "Begründung des Admins (oder „kein Grund angegeben“)", example: "Wiederholt Werbung in Kontaktanfragen" },
    ],
    subject: "Dein LiGem-Konto ist gesperrt",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>die LiGem-Moderation hat dein Konto gesperrt. Du kannst dich vorerst nicht mehr anmelden. " +
      "Deine Projekte und Termine bleiben gespeichert.</p>" +
      "<p><strong>Begründung:</strong> {{grund}}</p>" +
      "<p>Wenn du glaubst, dass das ein Irrtum ist, antworte einfach auf diese E-Mail oder schreib an info@ligem.de.</p>" +
      SIGNATURE,
  },
  {
    key: "konto-entsperrt",
    category: "konto",
    label: "Konto entsperrt",
    trigger: "Wenn ein Admin die Sperre eines Kontos aufhebt.",
    recipients: "Die Person, deren Konto wieder freigegeben wurde",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      P.link("Link zur Anmeldung", "https://ligem.de/anmelden"),
    ],
    subject: "Dein LiGem-Konto ist wieder freigegeben",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>dein Konto bei LiGem ist wieder freigegeben. Du kannst dich ab sofort wieder anmelden:</p>" +
      '<p><a href="{{link}}">Zur Anmeldung</a></p>' +
      SIGNATURE,
  },
  {
    key: "konto-geloescht-moderation",
    category: "konto",
    label: "Konto von der Moderation gelöscht",
    trigger: "Wenn ein Admin ein Konto unter Admin > Nutzer:innen löscht.",
    recipients: "Die Person, deren Konto gelöscht wurde",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "grund", description: "Begründung des Admins (oder „kein Grund angegeben“)", example: "Wiederholt Werbung in Kontaktanfragen" },
      { name: "zusammenfassung", description: "Was mit Projekten, Terminen und Favoriten passiert ist", example: "„Haus am See“: gelöscht\n2 Favoriten gelöscht" },
    ],
    subject: "Dein LiGem-Konto wurde gelöscht",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>die LiGem-Moderation hat dein Konto gelöscht.</p>" +
      "<p><strong>Begründung:</strong> {{grund}}</p>" +
      "<p>Das ist mit deinen Inhalten passiert:</p>" +
      "<blockquote>{{zusammenfassung}}</blockquote>" +
      "<p>Wenn du glaubst, dass das ein Irrtum ist, antworte einfach auf diese E-Mail oder schreib an info@ligem.de.</p>" +
      SIGNATURE,
  },
  {
    key: "datenauskunft-angefragt",
    category: "admin",
    label: "Datenauskunft angefragt (an Admins)",
    trigger: "Wenn jemand unter „Mein Konto“ eine Zusammenstellung der eigenen Daten anfordert.",
    recipients: "Alle Admins",
    placeholders: [
      { name: "nutzer", description: "Name und E-Mail der anfragenden Person", example: "Mira Sommer (mira@example.org)" },
      P.link("Link zur Freigabe der Datenauskunft", "https://ligem.de/admin/datenauskunft"),
    ],
    subject: "Datenauskunft angefragt: {{nutzer}}",
    body:
      "<p>Hallo,</p>" +
      "<p>{{nutzer}} möchte eine Zusammenstellung der bei LiGem gespeicherten Daten. " +
      'Bitte prüfen und freigeben, dann geht sie per E-Mail raus:<br><a href="{{link}}">Zur Datenauskunft</a></p>',
  },
  {
    key: "datenauskunft-versand",
    category: "konto",
    label: "Datenauskunft (Versand an die Person)",
    trigger: "Wenn ein Admin eine angefragte Datenauskunft freigibt. Die Daten hängen als Datei an.",
    recipients: "Die Person, die ihre Daten angefordert hat",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "uebersicht", description: "Kurze Übersicht der gespeicherten Daten (wird automatisch erzeugt)", example: "Konto seit 12.03.2026\n2 Projekte, 5 Termine, 4 Favoriten", html: false },
    ],
    subject: "Deine bei LiGem gespeicherten Daten",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>hier ist die Zusammenstellung der Daten, die LiGem über dich gespeichert hat. Kurz zusammengefasst:</p>" +
      "<blockquote>{{uebersicht}}</blockquote>" +
      "<p>Alle Einzelheiten stehen in der angehängten Datei (JSON-Format, lässt sich mit jedem Texteditor öffnen). " +
      "Wenn du Fragen hast oder etwas berichtigt oder gelöscht haben möchtest, antworte einfach auf diese E-Mail.</p>" +
      SIGNATURE,
  },
  {
    key: "datenauskunft-abgelehnt",
    category: "konto",
    label: "Datenauskunft abgelehnt",
    trigger: "Wenn ein Admin eine angefragte Datenauskunft ablehnt.",
    recipients: "Die Person, die ihre Daten angefordert hat",
    placeholders: [
      { name: "name", description: "Name der Person", example: "Mira Sommer" },
      { name: "grund", description: "Begründung des Admins", example: "Wir konnten die Anfrage keinem Konto eindeutig zuordnen." },
    ],
    subject: "Deine Anfrage zur Datenauskunft",
    body:
      "<p>Hallo {{name}},</p>" +
      "<p>deine Anfrage nach einer Zusammenstellung deiner Daten konnten wir so leider nicht erfüllen:</p>" +
      "<blockquote>{{grund}}</blockquote>" +
      "<p>Antworte gern auf diese E-Mail, dann klären wir das zusammen.</p>" +
      SIGNATURE,
  },
  {
    key: "fusszeile",
    category: "fusszeile",
    label: "Fußzeile aller E-Mails (Abbestellen)",
    trigger: "Steht unter jeder E-Mail. Der Link führt ohne Anmeldung zu den persönlichen E-Mail-Einstellungen.",
    recipients: "Alle",
    placeholders: [
      {
        name: "einstellungen_link",
        description: "Persönlicher Link zu den E-Mail-Einstellungen (ohne Anmeldung)",
        example: "https://ligem.de/benachrichtigungen?t=…",
      },
    ],
    subject: "(Fußzeile, kein eigener Betreff)",
    body:
      "<p>Du bekommst diese E-Mail, weil du ein Konto bei LiGem hast. Welche E-Mails du von uns bekommst und wie oft, " +
      "kannst du jederzeit ändern oder alle abbestellen, auch ohne Anmeldung:<br>" +
      '<a href="{{einstellungen_link}}">E-Mail-Einstellungen ändern oder abbestellen</a></p>',
  },
];

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = RAW_TEMPLATES.map((t) => ({ ...t, body: readable(t.body) }));

export type EmailTemplateKey = string;

export function getTemplateDefinition(key: string): EmailTemplateDefinition | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fills {{placeholders}} in the HTML body; unknown ones stay visible so a typo is noticed. */
export function fillBody(body: string, definition: EmailTemplateDefinition, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => {
    const placeholder = definition.placeholders.find((p) => p.name === name);
    const value = values[name];
    if (!placeholder || value === undefined) return match;
    return placeholder.html ? value : escapeHtml(value).replace(/\n/g, "<br>");
  });
}

/** Subjects are plain text: placeholders are inserted as they are. */
export function fillSubject(subject: string, values: Record<string, string>): string {
  return subject.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (match, name: string) => values[name] ?? match).replace(/\s+/g, " ").trim();
}

/** Wraps a body in the shared mail layout (inline styles, since many mail programs ignore <style>). */
export function wrapEmailHtml(bodyHtml: string, siteUrl = "https://ligem.de", footerHtml = ""): string {
  const host = siteUrl.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  a { color: #b7511f; }
  p { margin: 0 0 14px; }
  ul, ol { margin: 0 0 14px; padding-left: 22px; }
  li { margin: 0 0 6px; }
  h2, h3 { margin: 18px 0 10px; color: #3b2e22; }
  blockquote { margin: 0 0 14px; padding: 10px 14px; border-left: 4px solid #e6d8c3; background: #fbf3e7; }
</style>
</head>
<body style="margin:0;padding:0;background:#fbf3e7;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.55;color:#3b2e22;">
  <div style="margin:0 0 16px;font-size:24px;font-weight:800;color:#b7511f;">LiGem <span style="font-size:14px;font-weight:600;color:#5e7645;">Leben in Gemeinschaft</span></div>
  <div style="background:#ffffff;border-radius:16px;padding:24px;">
${bodyHtml}
  </div>
  ${footerHtml ? `<div style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#7a6650;">${footerHtml}</div>` : ""}
  <p style="margin:16px 0 0;font-size:13px;color:#7a6650;">LiGem · Leben in Gemeinschaft · <a href="${siteUrl}" style="color:#b7511f;">${host}</a></p>
</div>
</body>
</html>`;
}

/**
 * Plain-text version for mail programs that don't show HTML (and for spam
 * filters, which like seeing both). Links become "Text: URL".
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return !text || text === href ? href : `${text}: ${href}`;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|h2|h3|blockquote|ul|ol)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Sample values for previews and test mails. */
export function exampleValues(definition: EmailTemplateDefinition): Record<string, string> {
  return Object.fromEntries(definition.placeholders.map((p) => [p.name, p.example]));
}
