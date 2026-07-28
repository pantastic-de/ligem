import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiGem - Leben in Gemeinschaft",
  description:
    "LiGem bringt Wohngemeinschaften, WG-Suchende und gemeinwohlorientierte Organisationen zusammen: informieren, vernetzen, Veranstaltungen finden.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-text/10 px-6 py-8 text-center text-sm text-text-muted">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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
