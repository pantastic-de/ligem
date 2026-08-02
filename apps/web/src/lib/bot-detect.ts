// Known search-engine crawlers and web/AI agents, matched by User-Agent
// substring — same spirit as the crawler list this app already welcomes in
// robots.ts (see CLAUDE.md's SEO section: every crawler including AI bots
// is deliberately allowed, not blocked), just used here to label listing
// views by source instead of to gate access. Order matters: more specific
// patterns (e.g. "Google-Extended") must come before broader ones that
// would also match their substring (e.g. plain "Google").
const KNOWN_BOTS: { pattern: RegExp; name: string }[] = [
  { pattern: /googlebot/i, name: "Googlebot (Google)" },
  { pattern: /google-extended/i, name: "Google-Extended (KI-Training)" },
  { pattern: /bingbot/i, name: "Bingbot (Microsoft)" },
  { pattern: /duckduckbot/i, name: "DuckDuckBot (DuckDuckGo)" },
  { pattern: /yandexbot/i, name: "YandexBot (Yandex)" },
  { pattern: /baiduspider/i, name: "Baiduspider (Baidu)" },
  { pattern: /gptbot/i, name: "GPTBot (OpenAI)" },
  { pattern: /chatgpt-user/i, name: "ChatGPT-User (OpenAI)" },
  { pattern: /oai-searchbot/i, name: "OAI-SearchBot (OpenAI)" },
  { pattern: /claudebot/i, name: "ClaudeBot (Anthropic)" },
  { pattern: /anthropic-ai/i, name: "Anthropic AI" },
  { pattern: /perplexitybot/i, name: "PerplexityBot (Perplexity)" },
  { pattern: /ccbot/i, name: "CCBot (Common Crawl)" },
  { pattern: /applebot/i, name: "Applebot (Apple)" },
  { pattern: /facebookexternalhit|meta-externalagent/i, name: "Meta (Facebook/Instagram)" },
  { pattern: /twitterbot/i, name: "Twitterbot (X/Twitter)" },
  { pattern: /linkedinbot/i, name: "LinkedInBot" },
  { pattern: /whatsapp/i, name: "WhatsApp" },
  { pattern: /telegrambot/i, name: "Telegram" },
  { pattern: /semrushbot/i, name: "SemrushBot" },
  { pattern: /ahrefsbot/i, name: "AhrefsBot" },
  { pattern: /mj12bot/i, name: "MJ12bot (Majestic)" },
  { pattern: /dotbot/i, name: "DotBot (Moz)" },
  // Generic fallback — catches any other UA identifying itself as a
  // crawler that isn't specifically named above, still separated out from
  // real human traffic even without a friendly display name.
  { pattern: /bot|spider|crawler|slurp/i, name: "Sonstiger Bot" },
];

export function detectBot(userAgent: string | null): { isBot: boolean; botName: string | null } {
  if (!userAgent) return { isBot: false, botName: null };
  for (const { pattern, name } of KNOWN_BOTS) {
    if (pattern.test(userAgent)) return { isBot: true, botName: name };
  }
  return { isBot: false, botName: null };
}
