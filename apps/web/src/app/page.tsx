import Image from "next/image";
import Link from "next/link";

const zielgruppen = [
  {
    title: "Wohngemeinschaften",
    text: "Präsentiert euer Wohnprojekt, sucht neue Mitbewohner:innen oder tauscht euch mit anderen Gemeinschaften aus.",
    href: "/ueber-uns#wohnprojekte",
    photo: "/zielgruppen/wohngemeinschaften.jpg",
    photoAlt: "Terrasse eines gemeinschaftlich bewohnten Hauses mit Sitzgelegenheiten und Pflanzen",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9"
      />
    ),
  },
  {
    title: "Organisationen",
    text: "Vereine, Genossenschaften und andere gemeinwohlorientierte Initiativen rund ums Thema gemeinschaftliches Wohnen, die sich vernetzen möchten.",
    href: "/ueber-uns#organisationen",
    photo: "/zielgruppen/organisationen.jpg",
    photoAlt: "Freiwillige einer Organisation pflanzen gemeinsam Bäume im Wald",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 2.5-5 6-5s6 2 6 5M10 20c0-3 2.5-5 6-5s6 2 6 5"
      />
    ),
  },
  {
    title: "Interessierte",
    text: "Ihr wollt euch einfach über das Leben in Gemeinschaft informieren, ganz gleich ob mit oder ohne Suchabsicht.",
    href: "/ueber-uns#suchende",
    photo: "/zielgruppen/interessierte.jpg",
    photoAlt: "Person liest gemütlich mit einer Tasse Kaffee in einem Buch",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.5v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
  {
    title: "Veranstalter:innen",
    text: "Tragt Infotage, Besuchstage oder andere Veranstaltungen in den gemeinsamen Kalender ein und schafft Gelegenheiten zum Kennenlernen.",
    href: "/ueber-uns#veranstalter",
    photo: "/zielgruppen/veranstalter.jpg",
    photoAlt: "Nachbar:innen kommen bei einer Gartenfeier auf einer Holztreppe zusammen",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
      />
    ),
  },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-24">
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          Leben in Gemeinschaft
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-text-muted sm:mt-6 sm:text-lg">
          LiGem bringt Wohngemeinschaften, Menschen auf der Suche nach einem
          Zuhause und gemeinwohlorientierte Organisationen zusammen: zum
          Informieren, Vernetzen und Veranstalten. Kostenlos und frei.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4">
          <Link
            href="/projekte"
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-8 text-base font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
          >
            Wohnprojekte entdecken
          </Link>
          <a
            href="#zielgruppen"
            className="flex min-h-12 w-full items-center justify-center rounded-full border border-text/20 px-8 text-base font-semibold transition-colors hover:bg-surface sm:w-auto"
          >
            Mehr erfahren
          </a>
        </div>
      </section>

      <section id="zielgruppen" className="px-4 py-10 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-xl font-bold sm:text-3xl">
            Für wen ist LiGem?
          </h2>
          <div className="mt-6 grid gap-4 sm:mt-10 sm:gap-6 sm:grid-cols-2">
            {zielgruppen.map((gruppe) => (
              <Link
                key={gruppe.title}
                href={gruppe.href}
                className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm transition-colors hover:bg-bg"
              >
                <div className="relative h-40 w-full shrink-0 sm:h-48">
                  <Image
                    src={gruppe.photo}
                    alt={gruppe.photoAlt}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex gap-4 p-4 sm:p-6">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-9 w-9 shrink-0 text-primary"
                  >
                    {gruppe.icon}
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold">{gruppe.title}</h3>
                    <p className="mt-1 text-text-muted">{gruppe.text}</p>
                    <span className="mt-2 inline-block text-sm font-medium text-primary">
                      Mehr erfahren
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-center sm:mt-10">
            <Link href="/ueber-uns" className="font-medium text-primary hover:underline">
              Mehr über die Idee hinter LiGem erfahren
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
