import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/lib/prisma";
import { fetchPublicBuffer, fetchPublicText } from "@/lib/safe-fetch";
import { extractImageUrls, extractReadableText } from "@/lib/homepage-scrape";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { processAndStoreImage } from "@/lib/media";

function nullableString(description?: string) {
  return {
    anyOf: [{ type: "string" as const }, { type: "null" as const }],
    ...(description ? { description } : {}),
  };
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    motto: nullableString("Kurzer, einprägsamer Claim/Untertitel des Projekts (wenige Worte), oder null falls nicht erkennbar."),
    howWeLive: nullableString(
      "Ein Profiltext von ca. 400-600 Wörtern über das Projekt/die Gemeinschaft, auf Deutsch, in mehrere Absätze gegliedert. " +
        "Als HTML formatiert und dabei AUSSCHLIESSLICH die Tags <p>, <strong>, <em>, <ul>, <ol>, <li>, <br> verwenden - keine anderen Tags, keine Attribute, kein <html>/<body>. " +
        "null, falls die Seite keine sinnvollen Inhalte dafür hergibt.",
    ),
    contactPhone: nullableString(),
    contactEmail: nullableString(),
    street: nullableString("Nur der Straßenname, ohne Hausnummer."),
    houseNumber: nullableString(),
    postalCode: nullableString(),
    city: nullableString(),
    state: nullableString("Bundesland/Region."),
    country: nullableString(),
    eventHints: {
      type: "array",
      items: { type: "string" },
      description:
        "Kurze, für Menschen lesbare Textzeilen zu auf der Seite erwähnten Terminen/Veranstaltungen/Besuchstagen mit Datum, z. B. 'Tag der offenen Tür - 12.03.2026'. Leeres Array, falls nichts gefunden wurde.",
    },
  },
  required: [
    "motto",
    "howWeLive",
    "contactPhone",
    "contactEmail",
    "street",
    "houseNumber",
    "postalCode",
    "city",
    "state",
    "country",
    "eventHints",
  ],
  additionalProperties: false,
} as const;

type ExtractedListingInfo = {
  motto: string | null;
  howWeLive: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  eventHints: string[];
};

async function extractListingInfo(pageText: string): Promise<ExtractedListingInfo | null> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system:
      "Du analysierst den sichtbaren Text einer Wohnprojekt-/WG-/Gemeinschafts-Website und extrahierst strukturierte " +
      "Informationen daraus, um ein Profil auf einer Plattform für gemeinschaftliches Wohnen automatisch vorauszufüllen. " +
      "Erfinde keine Informationen - wenn etwas auf der Seite nicht klar erkennbar ist, gib null (bzw. ein leeres Array) zurück.",
    messages: [
      {
        role: "user",
        content: `Website-Inhalt (Text extrahiert aus HTML):\n\n${pageText}`,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: EXTRACTION_SCHEMA },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;
  try {
    return JSON.parse(textBlock.text) as ExtractedListingInfo;
  } catch {
    return null;
  }
}

/**
 * Runs the full "KI-Import" pipeline for a listing: fetches the given
 * homepage (SSRF-guarded), extracts readable text + candidate images,
 * asks Claude to extract structured listing info, persists whichever
 * fields it found (never clobbering an existing value with null), and
 * downloads/stores a handful of images into the listing's photo gallery
 * via the same pipeline manual uploads use. Returns event/date hints found
 * on the page for display as a suggestion — no Event rows are created.
 */
export async function runHomepageImport(
  listingId: string,
  homepageUrl: string,
  ownerId: string,
): Promise<{ ok: true; eventHints: string[] } | { ok: false; error: string }> {
  const html = await fetchPublicText(homepageUrl);
  if (!html) {
    return { ok: false, error: "nicht-erreichbar" };
  }

  const pageText = extractReadableText(html);
  const imageUrls = extractImageUrls(html, homepageUrl);

  const extracted = await extractListingInfo(pageText);
  if (!extracted) {
    return { ok: false, error: "extraktion-fehlgeschlagen" };
  }

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(extracted.motto ? { motto: extracted.motto } : {}),
      ...(extracted.howWeLive ? { howWeLive: sanitizeRichText(extracted.howWeLive) } : {}),
      ...(extracted.contactPhone ? { contactPhone: extracted.contactPhone } : {}),
      ...(extracted.contactEmail ? { contactEmail: extracted.contactEmail } : {}),
      ...(extracted.street ? { street: extracted.street } : {}),
      ...(extracted.houseNumber ? { houseNumber: extracted.houseNumber } : {}),
      ...(extracted.postalCode ? { postalCode: extracted.postalCode } : {}),
      ...(extracted.city ? { city: extracted.city } : {}),
      ...(extracted.state ? { state: extracted.state } : {}),
      ...(extracted.country ? { country: extracted.country } : {}),
      lastAiImportAt: new Date(),
    },
  });

  const lastPosition = await prisma.media.aggregate({
    where: { listingId },
    _max: { position: true },
  });
  let nextPosition = (lastPosition._max.position ?? -1) + 1;

  for (const imageUrl of imageUrls) {
    const buffer = await fetchPublicBuffer(imageUrl);
    if (!buffer) continue;
    const contentType = imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
    const file = new File([new Uint8Array(buffer)], "import.jpg", { type: contentType });
    const stored = await processAndStoreImage(file, `listings/${listingId}`);
    if (!stored) continue;

    await prisma.media.create({
      data: {
        listingId,
        type: "PHOTO",
        storageKey: stored.storageKey,
        thumbnailKey: stored.thumbnailKey,
        position: nextPosition,
        uploadedById: ownerId,
      },
    });
    nextPosition += 1;
  }

  return { ok: true, eventHints: extracted.eventHints };
}
