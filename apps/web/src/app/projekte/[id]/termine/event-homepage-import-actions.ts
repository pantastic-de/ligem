"use server";

import Anthropic from "@anthropic-ai/sdk";

import { auth } from "@/lib/auth";
import { normalizeHomepageUrl } from "@/lib/normalize-url";
import { fetchPublicText } from "@/lib/safe-fetch";
import { extractReadableText } from "@/lib/homepage-scrape";
import { sanitizeRichText } from "@/lib/sanitize-html";

/**
 * Scoped-down sibling of src/lib/homepage-import.ts (the Listing KI-Import):
 * a Termin's own homepage only ever needs to fill in one field — its
 * description — not a full multi-field review flow with photos/address/etc.,
 * so this skips the job-store/progress-polling machinery that pipeline needs
 * for its much longer-running work and just runs as one plain awaited Server
 * Action called directly from client code (EventDescriptionImportField),
 * matching this app's established "Server Action called directly from client
 * code" convention (see reorderable-photo-gallery/.bind()ed actions).
 */
export async function importEventDescription(
  rawUrl: string,
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Bitte zuerst anmelden." };
  }

  const url = normalizeHomepageUrl(rawUrl);
  if (!url) {
    return { ok: false, error: "Ungültige Homepage-URL." };
  }

  const html = await fetchPublicText(url);
  if (!html) {
    return { ok: false, error: "Homepage konnte nicht geladen werden." };
  }

  const pageText = extractReadableText(html);

  const schema = {
    type: "object",
    properties: {
      description: {
        type: "string",
        description:
          "Eine einladende Beschreibung dieser Veranstaltung/dieses Termins auf Deutsch (ca. 100-300 Wörter), " +
          "als HTML formatiert und dabei AUSSCHLIESSLICH die Tags <p>, <strong>, <em>, <u>, <h2>, <h3>, " +
          "<blockquote>, <ul>, <ol>, <li>, <br> verwenden - keine anderen Tags, keine Attribute. " +
          "Leerer String, falls auf der Seite keine für Besucher:innen relevante Beschreibung einer " +
          "Veranstaltung/eines Termins erkennbar ist.",
      },
    },
    required: ["description"],
    additionalProperties: false,
  } as const;

  const client = new Anthropic();
  let textBlock;
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      system:
        "Du analysierst den sichtbaren Text einer Website zu einer Veranstaltung/einem Termin " +
        "(z. B. Infotag, Workshop, Besuchstag) und erstellst daraus eine ansprechende Beschreibung für die " +
        "Terminseite einer Plattform für gemeinschaftliches Wohnen. Erfinde keine Informationen. Formuliere " +
        "natürlich und einladend, so wie die Veranstalter:innen selbst schreiben würden, ohne Gedankenstriche " +
        "(—) und ohne typische KI-Formulierungen.",
      messages: [{ role: "user", content: `Website-Inhalt (Text extrahiert aus HTML):\n\n${pageText}` }],
      output_config: { format: { type: "json_schema", schema } },
    });
    textBlock = response.content.find((block) => block.type === "text");
  } catch {
    return { ok: false, error: "KI-Import ist fehlgeschlagen." };
  }
  if (!textBlock || textBlock.type !== "text") {
    return { ok: false, error: "KI-Import ist fehlgeschlagen." };
  }

  let description = "";
  try {
    const raw = JSON.parse(textBlock.text) as { description?: string };
    description = raw.description?.trim() ?? "";
  } catch {
    return { ok: false, error: "KI-Import ist fehlgeschlagen." };
  }
  if (!description) {
    return { ok: false, error: "Auf der Seite wurde keine Veranstaltungsbeschreibung gefunden." };
  }

  const sanitized = sanitizeRichText(description);
  return { ok: true, html: sanitized ?? "" };
}
