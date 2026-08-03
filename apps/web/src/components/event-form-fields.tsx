import type { AttributeGroup, AttributeOption } from "@/generated/prisma/client";
import { AddressFields } from "@/components/address-fields";
import { EventDateRangeField } from "@/components/event-date-range-field";
import { EventDescriptionImportField } from "@/components/event-description-import-field";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";
import { RECURRENCE_LABELS } from "@/lib/recurrence";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";

export type EventFormDefaults = {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  addressText?: string;
  country?: string;
  state?: string;
  postalCode?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  latitude?: number | null;
  longitude?: number | null;
  websiteUrl?: string;
  cost?: number | null;
  maxParticipants?: number | null;
  registrationRequired?: boolean;
  selectedOptionIds?: string[];
};

type AttributeGroupWithOptions = AttributeGroup & { options: AttributeOption[] };

export function EventFormFields({
  attributeGroups,
  defaults = {},
  showRecurrence = false,
  aiImportEnabled = false,
}: {
  attributeGroups: AttributeGroupWithOptions[];
  defaults?: EventFormDefaults;
  // Only offered when creating a brand-new event, never on the edit form —
  // a recurring series is just a batch-creation convenience (see
  // src/lib/recurrence.ts): every generated occurrence is immediately its
  // own independent Event afterward, so "editing the recurrence" isn't a
  // concept that exists once occurrences already exist.
  showRecurrence?: boolean;
  // Gates the "KI-Import in Beschreibung" button next to the Homepage field
  // (see EventDescriptionImportField) — same env-var-driven pattern as the
  // Listing KI-Import (Boolean(process.env.ANTHROPIC_API_KEY)).
  aiImportEnabled?: boolean;
}) {
  const groupBySlug = (slug: string) =>
    attributeGroups.find((group) => group.slug === slug);
  const multiSelectGroups = attributeGroups.filter((g) => g.allowMultiple);
  const veranstaltungsart = groupBySlug("veranstaltungsart");
  const selectedOptionIds = new Set(defaults.selectedOptionIds ?? []);
  const selectedInGroup = (group: AttributeGroupWithOptions) =>
    group.options.filter((o) => selectedOptionIds.has(o.id)).map((o) => o.id);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="font-medium">
          Titel *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={defaults.title}
          placeholder="z. B. Infotag, Besuchstag"
          className={inputClass}
        />
      </div>

      {veranstaltungsart ? (
        <MultiSelectDropdown
          label={veranstaltungsart.name}
          name={`attr-${veranstaltungsart.slug}`}
          options={veranstaltungsart.options}
          defaultSelected={selectedInGroup(veranstaltungsart)}
          multiple={veranstaltungsart.allowMultiple}
        />
      ) : null}

      <EventDateRangeField
        defaultStartAt={defaults.startAt}
        defaultEndAt={defaults.endAt}
      />

      {showRecurrence ? (
        <fieldset className="flex flex-col gap-2 rounded-xl border border-text/20 p-4">
          <legend className="px-1 font-medium">Wiederholung (optional)</legend>
          <p className="text-sm text-text-muted">
            Legt bei der Auswahl direkt mehrere unabhängige Termine an
            (Beginn/Ende-Uhrzeit und alle anderen Angaben oben werden für
            jeden Termin übernommen). Jeder einzelne Termin lässt sich danach
            wie gewohnt einzeln bearbeiten oder löschen, unabhängig von den
            anderen.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recurrence" className="font-medium">
                Wiederholt sich
              </label>
              <select
                id="recurrence"
                name="recurrence"
                defaultValue=""
                className={inputClass}
              >
                <option value="">Keine Wiederholung</option>
                {Object.entries(RECURRENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="recurrenceUntil" className="font-medium">
                Wiederholen bis
              </label>
              <input
                id="recurrenceUntil"
                name="recurrenceUntil"
                type="date"
                className={inputClass}
              />
            </div>
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="addressText" className="font-medium">
          Zusätzliche Ortsangabe
        </label>
        <input
          id="addressText"
          name="addressText"
          type="text"
          placeholder="z. B. Gemeinschaftshaus, Hintereingang"
          defaultValue={defaults.addressText}
          className={inputClass}
        />
      </div>

      <AddressFields
        defaults={{
          country: defaults.country,
          state: defaults.state,
          postalCode: defaults.postalCode,
          city: defaults.city,
          street: defaults.street,
          houseNumber: defaults.houseNumber,
          latitude: defaults.latitude,
          longitude: defaults.longitude,
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cost" className="font-medium">
            Kosten (EUR)
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={defaults.cost ?? undefined}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxParticipants" className="font-medium">
            Maximale Teilnehmerzahl
          </label>
          <input
            id="maxParticipants"
            name="maxParticipants"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={defaults.maxParticipants ?? undefined}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="registrationRequired"
          defaultChecked={defaults.registrationRequired}
          className="h-5 w-5"
        />
        Voranmeldung notwendig
      </label>

      <EventDescriptionImportField
        defaultWebsiteUrl={defaults.websiteUrl}
        defaultDescription={defaults.description}
        aiImportEnabled={aiImportEnabled}
      />

      {multiSelectGroups.map((group) => (
        <MultiSelectDropdown
          key={group.id}
          label={group.name}
          name={`attr-${group.slug}`}
          options={group.options}
          defaultSelected={selectedInGroup(group)}
        />
      ))}
    </>
  );
}
