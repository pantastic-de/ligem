"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * A password <input> with an eye-icon toggle to reveal/hide the typed
 * value — a small client island inside an otherwise plain server-rendered
 * `<form action={serverAction}>` (see CLAUDE.md's Pages convention), same
 * pattern as RichTextField/HomepageImportField: the input keeps its normal
 * `name` attribute either way, so the server action still just reads
 * `formData.get(name)` unchanged.
 */
export function PasswordField({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete={autoComplete}
        className="min-h-12 w-full rounded-xl border border-text/20 bg-surface px-4 pr-11 text-text"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-text-muted"
      >
        {visible ? (
          <EyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
