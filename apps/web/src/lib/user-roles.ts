import type { UserRole } from "@/generated/prisma/client";

// Roles in two groups: what someone wants to do on LiGem (self-chosen at
// registration and on /mein-konto, no rights attached) and the staff roles
// an admin assigns (MODERATOR may review projects and events, ADMIN may do
// everything).

export const INTEREST_ROLES = ["SUCHENDE", "INFORMIEREN", "ANBIETER", "VERANSTALTER", "ORGANISATION"] as const satisfies readonly UserRole[];
export type InterestRole = (typeof INTEREST_ROLES)[number];

export const STAFF_ROLES = ["MODERATOR", "ADMIN"] as const satisfies readonly UserRole[];
export const ALL_ROLES: UserRole[] = [...INTEREST_ROLES, ...STAFF_ROLES];

/** Wording for "Ich möchte (optional):" on /registrieren and /mein-konto. */
export const INTEREST_OPTIONS: { role: InterestRole; label: string }[] = [
  { role: "SUCHENDE", label: "ein gemeinschaftliches Zuhause finden" },
  { role: "INFORMIEREN", label: "mich erst einmal informieren und Leute kennenlernen" },
  { role: "ANBIETER", label: "unser Wohnprojekt vorstellen" },
  { role: "VERANSTALTER", label: "Veranstaltungen anbieten" },
  { role: "ORGANISATION", label: "für eine Organisation oder Initiative mitwirken" },
];

/** Short names for admin lists and badges. */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUCHENDE: "Sucht ein Zuhause",
  INFORMIEREN: "Informiert sich",
  ANBIETER: "Wohnprojekt",
  VERANSTALTER: "Veranstalter:in",
  ORGANISATION: "Organisation",
  MODERATOR: "Moderator:in",
  ADMIN: "Admin",
};

/** Reads the interest checkboxes (`interest` values) from a form. */
export function interestRolesFromForm(formData: FormData): InterestRole[] {
  const picked = new Set(formData.getAll("interest").map(String));
  return INTEREST_ROLES.filter((role) => picked.has(role));
}
