"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 400;

/**
 * Site-wide floating "nach oben" button (bottom-right, same corner used by
 * other floating controls like the map's expand button). Only rendered once
 * the user has actually scrolled down a bit, so it doesn't clutter short
 * pages.
 *
 * On `/projekte`/`/termine` it targets the same `#ergebnisse` anchor the
 * Weiter/Zurück-Blättern links already scroll to (the top of the
 * results/detail pane, not the very top of the page — see CLAUDE.md) so the
 * button lands you at a consistent spot rather than scrolling past that
 * pane back up to the page's h1/intro text. `scrollIntoView` respects that
 * element's own `scroll-mt-4` (scroll-margin-top), matching hash-navigation
 * behavior exactly. Pages without that anchor (everything else) fall back
 * to a plain scroll to the very top of the page.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  function handleClick() {
    const results = document.getElementById("ergebnisse");
    if (results) {
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Nach oben scrollen"
      title="Nach oben"
      className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-hover"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
