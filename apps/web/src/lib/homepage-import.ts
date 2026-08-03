import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/lib/prisma";
import { fetchPublicBuffer, fetchPublicText } from "@/lib/safe-fetch";
import { extractImageUrls, extractReadableText } from "@/lib/homepage-scrape";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { processAndStoreImage } from "@/lib/media";
import { geocodeAddress } from "@/lib/geocode-address";
import { setListingLocation } from "@/lib/geo";
import { updateImportJob } from "@/lib/homepage-import-progress";

// Claude's structured-output schemas cap out at 16 union/anyOf-typed
// parameters total ("Schemas contains too many parameters with union
// types... exponential compilation cost" — hit directly during testing with
// 19). Plain strings/numbers don't actually need a real `null` branch here —
// an empty string / -1 sentinel works just as well as "nothing found" and
// avoids the anyOf entirely, which only the three enum fields below still
// need (an enum's valid values can't include an empty-string stand-in
// without polluting the option list itself).
function optionalString(description?: string) {
  return {
    type: "string" as const,
    description: `${description ? `${description} ` : ""}Leerer String, falls nicht erkennbar.`,
  };
}

function optionalInt(description: string) {
  return {
    type: "integer" as const,
    description: `${description} -1, falls nicht genannt/nicht erkennbar.`,
  };
}

function nullableEnum(options: string[], description: string) {
  return {
    anyOf: [{ type: "string" as const, enum: options }, { type: "null" as const }],
    description: `${description} Bitte exakt einen der folgenden Werte übernehmen, oder null falls keiner erkennbar passt: ${options.join(", ")}.`,
  };
}

function orNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

function intOrNull(value: number): number | null {
  return value === -1 ? null : value;
}

type ExtractedListingInfo = {
  motto: string | null;
  howWeLive: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  groupSizeCurrent: number | null;
  groupSizePlanned: number | null;
  freeSpots: number | null;
  costOneTime: number | null;
  costMonthly: number | null;
  geschlechterverteilung: string | null;
  projektTyp: string | null;
  projektStatus: string | null;
  artDesInserats: string[];
  eventHints: string[];
};

/** One comparison row for the review UI (src/components/homepage-import-field.tsx)
 * — `current` is whatever the Listing already has, `proposed` is what the AI
 * found. Only fields where the AI actually found *something different* from
 * the current value are meant to be shown at all (see buildComparison). */
type Field<T> = { current: T; proposed: T };

export type HomepageImportResult = {
  motto: Field<string | null>;
  howWeLive: Field<string | null>;
  contactName: Field<string | null>;
  contactPhone: Field<string | null>;
  contactEmail: Field<string | null>;
  address: Field<{
    street: string | null;
    houseNumber: string | null;
    postalCode: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
  groupSizeCurrent: Field<number | null>;
  groupSizePlanned: Field<number | null>;
  freeSpots: Field<number | null>;
  costOneTime: Field<number | null>;
  costMonthly: Field<number | null>;
  // `proposed`/`current` are option *names* (for display); the actual id to
  // assign travels alongside since a name alone can't be persisted.
  geschlechterverteilung: Field<string | null> & { proposedOptionId: string | null };
  projektTyp: Field<string | null> & { proposedOptionId: string | null };
  projektStatus: Field<string | null> & { proposedOptionId: string | null };
  artDesInserats: Field<string[]> & { proposedCategoryIds: string[] };
  eventHints: string[];
};

async function extractListingInfo(
  pageText: string,
  options: {
    geschlechterverteilung: string[];
    projektTyp: string[];
    projektStatus: string[];
    kategorien: string[];
  },
): Promise<ExtractedListingInfo | null> {
  const schema = {
    type: "object",
    properties: {
      motto: optionalString("Kurzer, einprägsamer Claim/Untertitel des Projekts (wenige Worte)."),
      howWeLive: optionalString(
        "Ein Profiltext von ca. 400-600 Wörtern über das Projekt/die Gemeinschaft, auf Deutsch, in mehrere Absätze gegliedert. " +
          "Als HTML formatiert und dabei AUSSCHLIESSLICH die Tags <p>, <strong>, <em>, <u>, <h2>, <h3>, <blockquote>, <ul>, <ol>, <li>, <br> verwenden - keine anderen Tags, keine Attribute, kein <html>/<body>.",
      ),
      contactName: optionalString("Name der Ansprechperson für Interessierte, falls auf der Seite genannt."),
      contactPhone: optionalString(),
      contactEmail: optionalString(),
      street: optionalString("Nur der Straßenname, ohne Hausnummer."),
      houseNumber: optionalString(),
      postalCode: optionalString(),
      city: optionalString(),
      state: optionalString("Bundesland/Region."),
      country: optionalString(),
      groupSizeCurrent: optionalInt("Aktuelle Anzahl der Bewohner:innen/Mitglieder, falls genannt."),
      groupSizePlanned: optionalInt("Geplante/angestrebte Gruppengröße, falls genannt."),
      freeSpots: optionalInt("Anzahl aktuell freier Plätze/Zimmer, falls genannt."),
      costOneTime: optionalInt("Einmaliger Betrag in vollen Euro (z. B. Genossenschaftsanteile, Kaution), falls genannt."),
      costMonthly: optionalInt("Monatlicher Betrag in vollen Euro (Miete/Beitrag), falls genannt."),
      geschlechterverteilung: nullableEnum(options.geschlechterverteilung, "Geschlechterverteilung der Gemeinschaft."),
      projektTyp: nullableEnum(options.projektTyp, "Art/Typ des Projekts."),
      projektStatus: nullableEnum(options.projektStatus, "Aktueller Status des Projekts (z. B. in Gründung, etabliert)."),
      artDesInserats: {
        type: "array",
        items: { type: "string", enum: options.kategorien },
        description:
          "Welche der folgenden Kategorien passen auf das, was hier angeboten/gesucht wird (mehrere möglich): " +
          options.kategorien.join(", ") + ". Leeres Array, falls nichts eindeutig passt.",
      },
      eventHints: {
        type: "array",
        items: { type: "string" },
        description:
          "Kurze, für Menschen lesbare Textzeilen zu auf der Seite erwähnten Terminen/Veranstaltungen/Besuchstagen mit Datum, z. B. 'Tag der offenen Tür - 12.03.2026'. Leeres Array, falls nichts gefunden wurde.",
      },
    },
    required: [
      "motto", "howWeLive", "contactName", "contactPhone", "contactEmail",
      "street", "houseNumber", "postalCode", "city", "state", "country",
      "groupSizeCurrent", "groupSizePlanned", "freeSpots", "costOneTime", "costMonthly",
      "geschlechterverteilung", "projektTyp", "projektStatus", "artDesInserats", "eventHints",
    ],
    additionalProperties: false,
  } as const;

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    system:
      "Du analysierst den sichtbaren Text einer Wohnprojekt-/WG-/Gemeinschafts-Website und extrahierst strukturierte " +
      "Informationen daraus, um ein Profil auf einer Plattform für gemeinschaftliches Wohnen automatisch vorauszufüllen. " +
      "Erfinde keine Informationen - wenn ein Text-Feld auf der Seite nicht klar erkennbar ist, gib einen leeren String zurück; " +
      "bei einem Zahlen-Feld gib -1 zurück; bei einer Liste ein leeres Array. " +
      "Bei Feldern mit vorgegebenen Werten (Enum) darfst du NUR einen der vorgegebenen Werte oder null zurückgeben, nie einen eigenen Text. " +
      "Formuliere motto und howWeLive in natürlicher, persönlicher und wertschätzender Sprache, so wie die Bewohner:innen selbst " +
      "schreiben würden. Verwende dabei keine Gedankenstriche (—) und keine typischen KI-Formulierungen.",
    messages: [
      { role: "user", content: `Website-Inhalt (Text extrahiert aus HTML):\n\n${pageText}` },
    ],
    output_config: {
      format: { type: "json_schema", schema },
    },
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return null;
  try {
    const raw = JSON.parse(textBlock.text) as Record<string, unknown>;
    return {
      motto: orNull(String(raw.motto ?? "")),
      howWeLive: orNull(String(raw.howWeLive ?? "")),
      contactName: orNull(String(raw.contactName ?? "")),
      contactPhone: orNull(String(raw.contactPhone ?? "")),
      contactEmail: orNull(String(raw.contactEmail ?? "")),
      street: orNull(String(raw.street ?? "")),
      houseNumber: orNull(String(raw.houseNumber ?? "")),
      postalCode: orNull(String(raw.postalCode ?? "")),
      city: orNull(String(raw.city ?? "")),
      state: orNull(String(raw.state ?? "")),
      country: orNull(String(raw.country ?? "")),
      groupSizeCurrent: intOrNull(Number(raw.groupSizeCurrent ?? -1)),
      groupSizePlanned: intOrNull(Number(raw.groupSizePlanned ?? -1)),
      freeSpots: intOrNull(Number(raw.freeSpots ?? -1)),
      costOneTime: intOrNull(Number(raw.costOneTime ?? -1)),
      costMonthly: intOrNull(Number(raw.costMonthly ?? -1)),
      geschlechterverteilung: (raw.geschlechterverteilung as string | null) ?? null,
      projektTyp: (raw.projektTyp as string | null) ?? null,
      projektStatus: (raw.projektStatus as string | null) ?? null,
      artDesInserats: Array.isArray(raw.artDesInserats) ? (raw.artDesInserats as string[]) : [],
      eventHints: Array.isArray(raw.eventHints) ? (raw.eventHints as string[]) : [],
    };
  } catch {
    return null;
  }
}

function stringField(current: string | null, proposed: string | null): Field<string | null> {
  return { current, proposed: proposed && proposed !== current ? proposed : null };
}

function intField(current: number | null, proposed: number | null): Field<number | null> {
  return { current, proposed: proposed != null && proposed !== current ? proposed : null };
}

/**
 * Runs the full "KI-Import" extraction (fetch → scrape → LLM → geocode),
 * reporting progress into the job store as it goes, and — unlike the
 * pipeline's original version — does NOT write anything to the Listing
 * itself. It only builds a current-vs-proposed comparison for the review UI
 * (src/components/homepage-import-field.tsx); nothing is persisted until the
 * user picks which fields to keep and applyHomepageImportResult() runs.
 * Image URLs are found here (cheap) but not downloaded yet — that's deferred
 * to the apply step so a review the user abandons never fetches them.
 */
export async function runHomepageExtraction(
  jobId: string,
  listingId: string,
  homepageUrl: string,
): Promise<{ ok: true; result: HomepageImportResult; imageUrls: string[] } | { ok: false; error: string }> {
  updateImportJob(jobId, "Lade Homepage…");
  const html = await fetchPublicText(homepageUrl);
  if (!html) return { ok: false, error: "nicht-erreichbar" };

  const pageText = extractReadableText(html);
  const imageUrls = extractImageUrls(html, homepageUrl);

  updateImportJob(jobId, "Lade Filteroptionen…");
  const [listing, attributeGroups, categories] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: { attributeOptions: { include: { option: { include: { group: true } } } }, categories: { include: { category: true } } },
    }),
    prisma.attributeGroup.findMany({
      where: { slug: { in: ["geschlechterverteilung", "projekt-typ", "projekt-status"] } },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.listingCategory.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!listing) return { ok: false, error: "nicht-gefunden" };

  const groupBySlug = Object.fromEntries(attributeGroups.map((g) => [g.slug, g]));
  const geschlechterGroup = groupBySlug["geschlechterverteilung"];
  const typGroup = groupBySlug["projekt-typ"];
  const statusGroup = groupBySlug["projekt-status"];

  updateImportJob(jobId, "Analysiere Inhalt mit KI…");
  const extracted = await extractListingInfo(pageText, {
    geschlechterverteilung: geschlechterGroup?.options.map((o) => o.name) ?? [],
    projektTyp: typGroup?.options.map((o) => o.name) ?? [],
    projektStatus: statusGroup?.options.map((o) => o.name) ?? [],
    kategorien: categories.map((c) => c.name),
  });
  if (!extracted) return { ok: false, error: "extraktion-fehlgeschlagen" };

  updateImportJob(jobId, "Suche Standort…");
  const hasNewAddress = Boolean(extracted.street || extracted.postalCode || extracted.city);
  const geocoded = hasNewAddress
    ? await geocodeAddress({
        street: extracted.street ?? listing.street,
        houseNumber: extracted.houseNumber ?? listing.houseNumber,
        postalCode: extracted.postalCode ?? listing.postalCode,
        city: extracted.city ?? listing.city,
        country: extracted.country ?? listing.country,
      })
    : null;

  const currentOptionName = (slug: string) =>
    listing.attributeOptions.find((a) => a.option.group.slug === slug)?.option.name ?? null;
  const findOptionId = (group: typeof geschlechterGroup, name: string | null) =>
    (name && group?.options.find((o) => o.name === name)?.id) || null;
  const findCategoryIds = (names: string[]) =>
    names.map((name) => categories.find((c) => c.name === name)?.id).filter((id): id is string => Boolean(id));

  const currentCategoryNames = listing.categories.map((c) => c.category.name);
  const proposedCategoryNames = extracted.artDesInserats.filter(
    (name) => !currentCategoryNames.includes(name),
  );

  const result: HomepageImportResult = {
    motto: stringField(listing.motto, extracted.motto),
    howWeLive: stringField(listing.howWeLive, extracted.howWeLive ? sanitizeRichText(extracted.howWeLive) : null),
    contactName: stringField(listing.contactName, extracted.contactName),
    contactPhone: stringField(listing.contactPhone, extracted.contactPhone),
    contactEmail: stringField(listing.contactEmail, extracted.contactEmail),
    address: {
      current: {
        street: listing.street, houseNumber: listing.houseNumber, postalCode: listing.postalCode,
        city: listing.city, state: listing.state, country: listing.country,
        latitude: listing.latitude, longitude: listing.longitude,
      },
      proposed: hasNewAddress
        ? {
            street: extracted.street, houseNumber: extracted.houseNumber, postalCode: extracted.postalCode,
            city: extracted.city, state: extracted.state, country: extracted.country,
            latitude: geocoded?.latitude ?? null, longitude: geocoded?.longitude ?? null,
          }
        : {
            street: null, houseNumber: null, postalCode: null, city: null, state: null, country: null,
            latitude: null, longitude: null,
          },
    },
    groupSizeCurrent: intField(listing.groupSizeCurrent, extracted.groupSizeCurrent),
    groupSizePlanned: intField(listing.groupSizePlanned, extracted.groupSizePlanned),
    freeSpots: intField(listing.freeSpots, extracted.freeSpots),
    costOneTime: intField(listing.costOneTime, extracted.costOneTime),
    costMonthly: intField(listing.costMonthly, extracted.costMonthly),
    geschlechterverteilung: {
      current: currentOptionName("geschlechterverteilung"),
      proposed:
        extracted.geschlechterverteilung && extracted.geschlechterverteilung !== currentOptionName("geschlechterverteilung")
          ? extracted.geschlechterverteilung
          : null,
      proposedOptionId: findOptionId(geschlechterGroup, extracted.geschlechterverteilung),
    },
    projektTyp: {
      current: currentOptionName("projekt-typ"),
      proposed: extracted.projektTyp && extracted.projektTyp !== currentOptionName("projekt-typ") ? extracted.projektTyp : null,
      proposedOptionId: findOptionId(typGroup, extracted.projektTyp),
    },
    projektStatus: {
      current: currentOptionName("projekt-status"),
      proposed:
        extracted.projektStatus && extracted.projektStatus !== currentOptionName("projekt-status") ? extracted.projektStatus : null,
      proposedOptionId: findOptionId(statusGroup, extracted.projektStatus),
    },
    artDesInserats: {
      current: currentCategoryNames,
      proposed: proposedCategoryNames,
      proposedCategoryIds: findCategoryIds(extracted.artDesInserats),
    },
    eventHints: extracted.eventHints,
  };

  return { ok: true, result, imageUrls };
}

/**
 * Persists exactly the fields the user checked in the review UI, plus the
 * (always additive, never gated) photo import. `selections` keys match
 * HomepageImportResult's own keys.
 */
export async function applyHomepageImportResult(
  listingId: string,
  ownerId: string,
  result: HomepageImportResult,
  imageUrls: string[],
  selections: Record<string, boolean>,
): Promise<void> {
  const data: Record<string, unknown> = {};
  if (selections.motto && result.motto.proposed != null) data.motto = result.motto.proposed;
  if (selections.howWeLive && result.howWeLive.proposed != null) data.howWeLive = result.howWeLive.proposed;
  if (selections.contactName && result.contactName.proposed != null) data.contactName = result.contactName.proposed;
  if (selections.contactPhone && result.contactPhone.proposed != null) data.contactPhone = result.contactPhone.proposed;
  if (selections.contactEmail && result.contactEmail.proposed != null) data.contactEmail = result.contactEmail.proposed;
  if (selections.groupSizeCurrent && result.groupSizeCurrent.proposed != null) data.groupSizeCurrent = result.groupSizeCurrent.proposed;
  if (selections.groupSizePlanned && result.groupSizePlanned.proposed != null) data.groupSizePlanned = result.groupSizePlanned.proposed;
  if (selections.freeSpots && result.freeSpots.proposed != null) data.freeSpots = result.freeSpots.proposed;
  if (selections.costOneTime && result.costOneTime.proposed != null) data.costOneTime = result.costOneTime.proposed;
  if (selections.costMonthly && result.costMonthly.proposed != null) data.costMonthly = result.costMonthly.proposed;

  let applyAddress = false;
  if (selections.address && result.address.proposed.street != null) {
    applyAddress = true;
    const a = result.address.proposed;
    data.street = a.street;
    data.houseNumber = a.houseNumber;
    data.postalCode = a.postalCode;
    data.city = a.city;
    data.state = a.state;
    data.country = a.country;
    data.latitude = a.latitude;
    data.longitude = a.longitude;
  }

  if (Object.keys(data).length > 0) {
    await prisma.listing.update({ where: { id: listingId }, data });
  }
  if (applyAddress) {
    await setListingLocation(listingId, result.address.proposed.latitude, result.address.proposed.longitude);
  }

  // Attribute-group selections (single-value groups) — replace whatever
  // this listing currently has assigned in that specific group, since these
  // are exclusive choices (Geschlechterverteilung/Projekt Typ/Projekt
  // Status each only ever hold one value per listing).
  const attributeUpdates: { slug: string; enabled: boolean; optionId: string | null }[] = [
    { slug: "geschlechterverteilung", enabled: Boolean(selections.geschlechterverteilung), optionId: result.geschlechterverteilung.proposedOptionId },
    { slug: "projekt-typ", enabled: Boolean(selections.projektTyp), optionId: result.projektTyp.proposedOptionId },
    { slug: "projekt-status", enabled: Boolean(selections.projektStatus), optionId: result.projektStatus.proposedOptionId },
  ];
  for (const update of attributeUpdates) {
    if (!update.enabled || !update.optionId) continue;
    await prisma.listingAttributeOption.deleteMany({
      where: { listingId, option: { group: { slug: update.slug } } },
    });
    await prisma.listingAttributeOption.create({
      data: { listingId, optionId: update.optionId },
    });
  }

  if (selections.artDesInserats && result.artDesInserats.proposedCategoryIds.length > 0) {
    for (const categoryId of result.artDesInserats.proposedCategoryIds) {
      await prisma.listingCategoryAssignment.upsert({
        where: { listingId_categoryId: { listingId, categoryId } },
        update: {},
        create: { listingId, categoryId },
      });
    }
  }

  const lastPosition = await prisma.media.aggregate({ where: { listingId }, _max: { position: true } });
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
        listingId, type: "PHOTO", storageKey: stored.storageKey, thumbnailKey: stored.thumbnailKey,
        position: nextPosition, uploadedById: ownerId,
      },
    });
    nextPosition += 1;
  }
}
