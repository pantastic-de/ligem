import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { DemoDataRibbon } from "@/components/demo-data-ribbon";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/site";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "LiGem bringt Wohngemeinschaften, WG-Suchende und gemeinwohlorientierte Organisationen zusammen: informieren, vernetzen, Veranstaltungen finden. Ohne automatisiertes Matching.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LiGem - Leben in Gemeinschaft",
    template: "%s - LiGem",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "LiGem - Leben in Gemeinschaft",
    title: "LiGem - Leben in Gemeinschaft",
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-default.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LiGem - Leben in Gemeinschaft",
    description: SITE_DESCRIPTION,
    images: ["/og-default.jpg"],
  },
};

// Site-wide entity identity (Organization + WebSite) — present on every
// page, separate from the per-page structured data (e.g. schema.org/Event
// on /termine/[eventId]) added closer to that content itself.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LiGem - Leben in Gemeinschaft",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  logo: `${SITE_URL}/logo.png`,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "LiGem - Leben in Gemeinschaft",
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
        <DemoDataRibbon />
        <ScrollToTopButton />
        <CookieConsentBanner />
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-text/10 px-6 py-8 text-center text-sm text-text-muted">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/ueber-uns" className="hover:text-text">
              Über uns
            </Link>
            <Link href="/hilfe" className="hover:text-text">
              Hilfe
            </Link>
            <Link href="/impressum" className="hover:text-text">
              Impressum
            </Link>
            <Link href="/datenschutz" className="hover:text-text">
              Datenschutz
            </Link>
            <Link href="/agb" className="hover:text-text">
              AGB
            </Link>
          </nav>
          <p className="mt-3">
            © {new Date().getFullYear()} LiGem - Leben in Gemeinschaft
          </p>
        </footer>
      </body>
    </html>
  );
}
