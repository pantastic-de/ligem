"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";

import { toggleFavorite } from "@/app/mein-konto/favoriten/actions";

/**
 * Heart to mark a listing/event as favorite. Logged-in visitors toggle it
 * directly (optimistically, reverted if the server disagrees); everyone
 * else gets a small hint with links to log in or register, which bring
 * them back to the current page afterwards (`weiter`).
 */
export function FavoriteButton({
  kind,
  id,
  initialFavorite,
  loggedIn,
  size = "md",
  className = "",
}: {
  kind: "listing" | "event";
  id: string;
  initialFavorite: boolean;
  loggedIn: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [hintOpen, setHintOpen] = useState(false);
  const [returnTo, setReturnTo] = useState("/");
  const [pending, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hintOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrapperRef.current?.contains(e.target as Node)) {
        setHintOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [hintOpen]);

  function handleClick() {
    if (!loggedIn) {
      setReturnTo(window.location.pathname + window.location.search);
      setHintOpen((open) => !open);
      return;
    }
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      const result = await toggleFavorite(kind, id);
      if (result === null) {
        setFavorite(false);
        setHintOpen(true);
      } else if (result !== next) {
        setFavorite(result);
      }
    });
  }

  const thing = kind === "listing" ? "Projekt" : "Termin";
  const label = favorite ? `${thing} aus den Favoriten entfernen` : `${thing} als Favorit merken`;
  const box = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const icon = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const weiter = encodeURIComponent(returnTo);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={loggedIn ? favorite : undefined}
        aria-label={label}
        title={label}
        className={`flex ${box} items-center justify-center rounded-full bg-surface/95 shadow-sm ring-1 ring-text/10 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error`}
      >
        <Heart
          className={`${icon} transition-colors ${favorite ? "fill-error text-error" : "text-text-muted"}`}
          aria-hidden="true"
        />
      </button>
      {hintOpen ? (
        <div
          role="dialog"
          aria-label="Favoriten merken"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-text/10 bg-surface p-4 text-left shadow-lg"
        >
          <button
            type="button"
            onClick={() => setHintOpen(false)}
            aria-label="Hinweis schließen"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="pr-6 font-semibold">Favoriten merken</p>
          <p className="mt-1 text-sm text-text-muted">
            Melde dich an oder erstelle ein Konto, dann speichern wir deine Favoriten in deinem Profil und sagen
            dir Bescheid, wenn es dort Neues gibt.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/anmelden?weiter=${weiter}`}
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Anmelden
            </Link>
            <Link
              href={`/registrieren?weiter=${weiter}`}
              className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-4 text-sm font-semibold hover:bg-bg"
            >
              Konto erstellen
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
