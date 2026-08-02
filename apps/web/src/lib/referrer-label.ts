import { SITE_URL } from "@/lib/site";

// Friendly display names for the referrer hosts likely to actually show up
// — search engines and the social/chat platforms a listing link could
// plausibly be shared through. Anything else just falls back to its raw
// hostname rather than staying unlabeled.
const KNOWN_REFERRERS: Record<string, string> = {
  "www.google.com": "Google-Suche",
  "google.com": "Google-Suche",
  "www.bing.com": "Bing-Suche",
  "bing.com": "Bing-Suche",
  "duckduckgo.com": "DuckDuckGo",
  "www.ecosia.org": "Ecosia",
  "www.qwant.com": "Qwant",
  "search.brave.com": "Brave Search",
  "www.startpage.com": "Startpage",
  "yandex.ru": "Yandex-Suche",
  "www.facebook.com": "Facebook",
  "m.facebook.com": "Facebook",
  "l.facebook.com": "Facebook",
  "t.co": "X (Twitter)",
  "x.com": "X (Twitter)",
  "www.instagram.com": "Instagram",
  "www.linkedin.com": "LinkedIn",
  "chat.openai.com": "ChatGPT",
  "chatgpt.com": "ChatGPT",
  "www.perplexity.ai": "Perplexity",
  "claude.ai": "Claude",
};

/** For the statistics view's source breakdown — never shown for a bot/known
 * user row (those are already named more specifically), only for the
 * remaining anonymous human views. */
export function labelForReferrerHost(host: string | null): string {
  if (!host) return "Direktaufruf / unbekannt";
  const ownHostname = new URL(SITE_URL).hostname;
  if (host === ownHostname || host.endsWith(`.${ownHostname}`)) return "Innerhalb von LiGem";
  return KNOWN_REFERRERS[host] ?? host;
}
