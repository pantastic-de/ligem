import { Handshake, Home as HomeIcon, UserRound } from "lucide-react";

/**
 * The homepage's statement of what LiGem is for: bringing interested people
 * and housing projects together, ideally in person. A small diagram ("Du" — getting to know each other in person — "Deine Gemeinschaft", joined by dashed lines that drift toward
 * the middle, see .ligem-bridge-line in globals.css) above a short slogan.
 */
export function HomeMeetingBridge() {
  return (
    <div className="mx-auto mt-5 max-w-xl lg:mx-0">
      <div className="flex items-start justify-center gap-1 sm:gap-2 lg:justify-start" aria-hidden="true">
        <BridgeNode icon={<UserRound className="h-6 w-6" />} label="Du" tone="bg-primary/12 text-primary" />
        <span className="ligem-bridge-line ligem-bridge-line--right mt-6 h-0.5 flex-1" />
        <BridgeNode
          icon={<Handshake className="h-7 w-7" />}
          label="Kennenlernen vor Ort"
          tone="bg-accent text-text shadow-md"
          large
        />
        <span className="ligem-bridge-line ligem-bridge-line--left mt-6 h-0.5 flex-1" />
        <BridgeNode icon={<HomeIcon className="h-6 w-6" />} label="Deine Gemeinschaft" tone="bg-secondary/12 text-secondary" />
      </div>
      <p className="mt-4 text-2xl font-bold leading-snug text-text sm:text-3xl">
        Erst kennenlernen, <span className="text-secondary">dann zusammenleben.</span>
      </p>
      {/* Hidden on phones so the entry cards stay on the first screen. */}
      <p className="mt-2 hidden text-text-muted sm:block sm:text-lg">
        LiGem bringt dich und Wohnprojekte zusammen. Am besten persönlich, bei Besuchstagen,
        Infoabenden und Mitmachtagen.
      </p>
    </div>
  );
}

function BridgeNode({
  icon,
  label,
  tone,
  large = false,
}: {
  icon: React.ReactNode;
  label: string;
  tone: string;
  large?: boolean;
}) {
  return (
    <span className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
      <span
        className={`flex items-center justify-center rounded-full ${tone} ${large ? "-mt-1 h-14 w-14" : "h-12 w-12"}`}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold leading-tight text-text-muted">{label}</span>
    </span>
  );
}
