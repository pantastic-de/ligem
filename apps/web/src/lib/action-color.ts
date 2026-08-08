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
