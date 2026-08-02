import type { AttributeGroup, AttributeOption } from "@/generated/prisma/client";
import { AddressFields } from "@/components/address-fields";
import { EventDateRangeField } from "@/components/event-date-range-field";
import { RichTextField } from "@/components/rich-text-field";
import { MultiSelectDropdown } from "@/components/multi-select-dropdown";

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
}: {
  attributeGroups: AttributeGroupWithOptions[];
  defaults?: EventFormDefaults;
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="websiteUrl" className="font-medium">
          Homepage
        </label>
        <input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          placeholder="https://..."
          defaultValue={defaults.websiteUrl}
          className={inputClass}
        />
      </div>

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

      <RichTextField
        id="description"
        name="description"
        label="Beschreibung"
        defaultValue={defaults.description}
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
