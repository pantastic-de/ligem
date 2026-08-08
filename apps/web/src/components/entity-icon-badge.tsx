import { Home, CalendarDays } from "lucide-react";

import { SOLID_ACTION_TONE_CLASSES } from "@/lib/action-color";

// The single "this link leads to a Projekt/Termin" badge — a Home or
// CalendarDays icon on a solid primary/secondary circle (see
// SOLID_ACTION_TONE_CLASSES) — used everywhere such a link appears (list
// rows, "Zurück zum Projekt"/"Projekt ansehen" links, prev/next navigation,
// homepage hero tiles, ...) so the same icon language reads consistently
// across the whole app rather than each call site picking its own icon/size.
const ENTITY_ICONS = { projekt: Home, termin: CalendarDays } as const;

const SIZE_CLASSES = {
  sm: { badge: "h-5 w-5", icon: "h-3 w-3" },
  md: { badge: "h-6 w-6", icon: "h-3.5 w-3.5" },
  nav: { badge: "h-7 w-7", icon: "h-4 w-4" },
  lg: { badge: "h-8 w-8", icon: "h-4 w-4" },
  xl: { badge: "h-9 w-9", icon: "h-5 w-5" },
} as const;

export function EntityIconBadge({
  tone,
  size = "sm",
  className,
}: {
  tone: "projekt" | "termin";
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const Icon = ENTITY_ICONS[tone];
  const { badge, icon } = SIZE_CLASSES[size];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${badge} ${SOLID_ACTION_TONE_CLASSES[tone]} ${className ?? ""}`}
    >
      <Icon className={icon} aria-hidden="true" />
    </span>
  );
}
