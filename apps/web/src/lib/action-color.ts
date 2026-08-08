// Shared "icon in a colored circle" tone for links/menu items throughout
// the app: primary (orange) marks anything about a Projekt, secondary
// (green) anything about a Termin, and accent (gold) anything
// administrative or account-related (Verwaltungsaufgaben, Benutzerprofil —
// e.g. Admin, Mein Konto, Kontaktanfragen). One shared definition so every
// usage (site-header.tsx, account-menu.tsx, app-shell.tsx, listing-detail.tsx,
// ...) stays visually in sync instead of each component picking its own
// shade/opacity. `text-warning` (not `text-accent`) pairs with the accent
// background specifically, matching the higher-contrast combo already used
// for the homepage's "Interessierte" zielgruppen card.
export const ACTION_TONE_CLASSES = {
  projekt: "bg-primary/15 text-primary",
  termin: "bg-secondary/15 text-secondary",
  verwaltung: "bg-accent/25 text-warning",
} as const;

export type ActionTone = keyof typeof ACTION_TONE_CLASSES;

// A bolder, near-solid variant of the same two content tones (no
// `verwaltung` — this variant is only used where a stronger accent is
// wanted, e.g. floating over a photo or drawing extra attention to
// prev/next navigation, not for routine menu items) — white icon on a
// near-opaque fill instead of a colored icon on a light tint. First used
// for the homepage hero tiles' badge (see homepage-hero-tiles.tsx, which
// sits directly on a photo and needs much more contrast than the usual
// tint), now shared with the prev/next chevrons on the listing/event
// detail views for the same "same icon language, everywhere" consistency.
export const SOLID_ACTION_TONE_CLASSES = {
  projekt: "bg-primary/90 text-white",
  termin: "bg-secondary/90 text-white",
} as const;
