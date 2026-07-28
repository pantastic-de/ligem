import type {
  AttributeGroup,
  AttributeOption,
  ListingCategory,
} from "@/generated/prisma/client";

const inputClass =
  "min-h-12 rounded-xl border border-text/20 bg-surface px-4 text-text";
const textareaClass =
  "rounded-xl border border-text/20 bg-surface px-4 py-3 text-text";

export type ListingFormDefaults = {
  projectName?: string;
  motto?: string;
  country?: string;
  state?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  regionDescription?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  howWeLive?: string;
  whoWeAreLooking?: string;
  isTemporary?: boolean;
  groupSizeCurrent?: number | null;
  groupSizePlanned?: number | null;
  freeSpots?: number | null;
  desiredAgeMin?: number | null;
  desiredAgeMax?: number | null;
  costOneTime?: number | null;
  costMonthly?: number | null;
  searchPeriodStart?: string;
  searchPeriodEnd?: string;
  selectedCategoryIds?: string[];
  selectedOptionIds?: string[];
};

type AttributeGroupWithOptions = AttributeGroup & { options: AttributeOption[] };

export function ListingFormFields({
  categories,
  attributeGroups,
  defaults = {},
}: {
  categories: ListingCategory[];
  attributeGroups: AttributeGroupWithOptions[];
  defaults?: ListingFormDefaults;
}) {
  const groupBySlug = (slug: string) =>
    attributeGroups.find((group) => group.slug === slug);

  const multiSelectGroups = attributeGroups.filter((g) => g.allowMultiple);
  const projektTyp = groupBySlug("projekt-typ");
  const projektStatus = groupBySlug("projekt-status");
  const geschlechterverteilung = groupBySlug("geschlechterverteilung");
  const selectedOptionIds = new Set(defaults.selectedOptionIds ?? []);
  const selectedCategoryIds = new Set(defaults.selectedCategoryIds ?? []);

  return (
    <>
      <fieldset className="flex flex-col gap-6">
        <legend className="text-lg font-semibold">Grunddaten</legend>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="projectName" className="font-medium">
            Titel des Projekts *
          </label>
          <input
            id="projectName"
            name="projectName"
            type="text"
            required
            defaultValue={defaults.projectName}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="motto" className="font-medium">
            Motto
          </label>
          <input
            id="motto"
            name="motto"
            type="text"
            placeholder="Ein kurzer Claim für euer Projekt"
            defaultValue={defaults.motto}
            className={inputClass}
          />
        </div>

        {projektTyp ? (
          <div className="flex flex-col gap-2">
            <span className="font-medium">{projektTyp.name}</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {projektTyp.options.map((option) => (
                <label key={option.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name={`attr-${projektTyp.slug}`}
                    value={option.id}
                    defaultChecked={selectedOptionIds.has(option.id)}
                    className="h-5 w-5"
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {projektStatus ? (
          <div className="flex flex-col gap-2">
            <span className="font-medium">{projektStatus.name}</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {projektStatus.options.map((option) => (
                <label key={option.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name={`attr-${projektStatus.slug}`}
                    value={option.id}
                    defaultChecked={selectedOptionIds.has(option.id)}
                    className="h-5 w-5"
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {categories.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="font-medium">Art des Projektinserates</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categories.map((category) => (
                <label key={category.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={category.id}
                    defaultChecked={selectedCategoryIds.has(category.id)}
                    className="h-5 w-5"
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            name="isTemporary"
            defaultChecked={defaults.isTemporary}
            className="h-5 w-5"
          />
          Temporäres Angebot (z. B. Probewohnen, Retreat, Zwischennutzung)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <div>
          <legend className="text-lg font-semibold">Standort</legend>
          <p className="mt-1 text-sm text-text-muted">
            Genaue Adresse oder eine unspezifische Angabe wie &bdquo;Großraum
            Allgäu&ldquo; — beides ist möglich.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="country" className="font-medium">
              Land
            </label>
            <input
              id="country"
              name="country"
              type="text"
              defaultValue={defaults.country}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="state" className="font-medium">
              Bundesland
            </label>
            <input
              id="state"
              name="state"
              type="text"
              defaultValue={defaults.state}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1 flex flex-col gap-1.5">
            <label htmlFor="city" className="font-medium">
              Ort
            </label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={defaults.city}
              className={inputClass}
            />
          </div>
          <div className="col-span-1 grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label htmlFor="street" className="font-medium">
                Straße
              </label>
              <input
                id="street"
                name="street"
                type="text"
                defaultValue={defaults.street}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="houseNumber" className="font-medium">
                Nr.
              </label>
              <input
                id="houseNumber"
                name="houseNumber"
                type="text"
                defaultValue={defaults.houseNumber}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="regionDescription" className="font-medium">
            Unspezifische Ortsangabe
          </label>
          <input
            id="regionDescription"
            name="regionDescription"
            type="text"
            placeholder="z. B. Großraum Allgäu"
            defaultValue={defaults.regionDescription}
            className={inputClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-lg font-semibold">Ansprechperson</legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contactName" className="font-medium">
            Name
          </label>
          <input
            id="contactName"
            name="contactName"
            type="text"
            defaultValue={defaults.contactName}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contactEmail" className="font-medium">
              E-Mail-Adresse
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={defaults.contactEmail}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contactPhone" className="font-medium">
              Telefon
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={defaults.contactPhone}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-lg font-semibold">Über euch</legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="howWeLive" className="font-medium">
            So leben wir
          </label>
          <textarea
            id="howWeLive"
            name="howWeLive"
            rows={4}
            defaultValue={defaults.howWeLive}
            className={textareaClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="whoWeAreLooking" className="font-medium">
            Wen wir suchen
          </label>
          <textarea
            id="whoWeAreLooking"
            name="whoWeAreLooking"
            rows={4}
            defaultValue={defaults.whoWeAreLooking}
            className={textareaClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-lg font-semibold">Gruppe</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="groupSizeCurrent" className="font-medium">
              Aktuelle Gruppengröße
            </label>
            <input
              id="groupSizeCurrent"
              name="groupSizeCurrent"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={defaults.groupSizeCurrent ?? undefined}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="groupSizePlanned" className="font-medium">
              Geplante Gruppengröße
            </label>
            <input
              id="groupSizePlanned"
              name="groupSizePlanned"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={defaults.groupSizePlanned ?? undefined}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="freeSpots" className="font-medium">
            Freie Plätze
          </label>
          <input
            id="freeSpots"
            name="freeSpots"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={defaults.freeSpots ?? undefined}
            className={`${inputClass} max-w-xs`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-medium">Gewünschte Altersspanne</span>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="desiredAgeMin" className="text-sm text-text-muted">
                von
              </label>
              <input
                id="desiredAgeMin"
                name="desiredAgeMin"
                type="number"
                min={0}
                max={120}
                inputMode="numeric"
                defaultValue={defaults.desiredAgeMin ?? undefined}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="desiredAgeMax" className="text-sm text-text-muted">
                bis
              </label>
              <input
                id="desiredAgeMax"
                name="desiredAgeMax"
                type="number"
                min={0}
                max={120}
                inputMode="numeric"
                defaultValue={defaults.desiredAgeMax ?? undefined}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {geschlechterverteilung ? (
          <div className="flex flex-col gap-2">
            <span className="font-medium">{geschlechterverteilung.name}</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {geschlechterverteilung.options.map((option) => (
                <label key={option.id} className="flex min-h-11 items-center gap-2">
                  <input
                    type="radio"
                    name={`attr-${geschlechterverteilung.slug}`}
                    value={option.id}
                    defaultChecked={selectedOptionIds.has(option.id)}
                    className="h-5 w-5"
                  />
                  {option.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="text-lg font-semibold">Kosten &amp; Suchzeitraum</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="costOneTime" className="font-medium">
              Kosten einmalig (EUR)
            </label>
            <input
              id="costOneTime"
              name="costOneTime"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={defaults.costOneTime ?? undefined}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="costMonthly" className="font-medium">
              Kosten monatlich (EUR)
            </label>
            <input
              id="costMonthly"
              name="costMonthly"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={defaults.costMonthly ?? undefined}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="searchPeriodStart" className="font-medium">
              Suchzeitraum ab
            </label>
            <input
              id="searchPeriodStart"
              name="searchPeriodStart"
              type="date"
              defaultValue={defaults.searchPeriodStart}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="searchPeriodEnd" className="font-medium">
              Suchzeitraum bis
            </label>
            <input
              id="searchPeriodEnd"
              name="searchPeriodEnd"
              type="date"
              defaultValue={defaults.searchPeriodEnd}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      {multiSelectGroups.length > 0 ? (
        <fieldset className="flex flex-col gap-8">
          <legend className="text-lg font-semibold">Ausrichtung &amp; Werte</legend>
          {multiSelectGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <span className="font-medium">{group.name}</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.options.map((option) => (
                  <label key={option.id} className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      name={`attr-${group.slug}`}
                      value={option.id}
                      defaultChecked={selectedOptionIds.has(option.id)}
                      className="h-5 w-5"
                    />
                    {option.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}
    </>
  );
}
