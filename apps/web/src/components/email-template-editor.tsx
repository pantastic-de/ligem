"use client";

import { useMemo, useRef, useState } from "react";

import {
  exampleValues,
  fillBody,
  fillSubject,
  getTemplateDefinition,
  htmlToText,
  wrapEmailHtml,
} from "@/lib/email-templates";
import { resetEmailTemplate, saveEmailTemplate, sendTestEmail } from "@/app/admin/e-mails/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

type Wrap = { label: string; title: string; before: string; after: string };

// Toolbar for "simple HTML": each button wraps the selected text in a tag.
const WRAPS: Wrap[] = [
  { label: "Absatz", title: "Absatz <p>", before: "<p>", after: "</p>" },
  { label: "Fett", title: "Fett <strong>", before: "<strong>", after: "</strong>" },
  { label: "Kursiv", title: "Kursiv <em>", before: "<em>", after: "</em>" },
  { label: "Überschrift", title: "Überschrift <h3>", before: "<h3>", after: "</h3>" },
  { label: "Zitat", title: "Zitat <blockquote>", before: "<blockquote>", after: "</blockquote>" },
  { label: "Liste", title: "Aufzählung <ul><li>", before: "<ul>\n  <li>", after: "</li>\n</ul>" },
  { label: "Link", title: 'Link <a href="…">', before: '<a href="https://">', after: "</a>" },
  { label: "Zeilenumbruch", title: "Zeilenumbruch <br>", before: "<br>", after: "" },
];

/**
 * Edits one e-mail template: subject, body as simple HTML, placeholder
 * buttons and a live preview filled with example values. Saving, resetting
 * and the test mail are plain form posts to server actions; the preview is
 * the only client-side part.
 */
export function EmailTemplateEditor({
  templateKey,
  initialSubject,
  initialBody,
  customized,
  footerBody,
}: {
  templateKey: string;
  initialSubject: string;
  initialBody: string;
  customized: boolean;
  // Current standard footer, shown under the preview (not for the footer itself).
  footerBody: string;
}) {
  const definition = getTemplateDefinition(templateKey)!;
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [view, setView] = useState<"html" | "text">("html");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<"subject" | "body">("body");

  const examples = useMemo(() => exampleValues(definition), [definition]);
  const isFooter = definition.category === "fusszeile";
  const filledBody = fillBody(body, definition, examples);
  const previewSubject = fillSubject(subject, examples);
  const footerDefinition = getTemplateDefinition("fusszeile")!;
  const previewHtml = isFooter
    ? wrapEmailHtml("<p>… Text der jeweiligen E-Mail …</p>", undefined, filledBody)
    : wrapEmailHtml(filledBody, undefined, fillBody(footerBody, footerDefinition, exampleValues(footerDefinition)));

  function insert(before: string, after = "") {
    const field = lastFocus.current === "subject" ? subjectRef.current : bodyRef.current;
    const setValue = lastFocus.current === "subject" ? setSubject : setBody;
    if (!field) return;
    const { selectionStart: start, selectionEnd: end, value } = field;
    const next = value.slice(0, start ?? 0) + before + value.slice(start ?? 0, end ?? 0) + after + value.slice(end ?? 0);
    setValue(next);
    const cursor = (end ?? 0) + before.length + (start === end ? 0 : after.length);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(cursor, cursor);
    });
  }

  const buttonClass = "min-h-9 rounded-full border border-text/20 px-3 text-sm font-medium transition-colors hover:bg-bg";

  return (
    <form className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <input type="hidden" name="key" value={templateKey} />

      <div className="flex min-w-0 flex-col gap-4">
        <div className={`flex flex-col gap-1.5 ${isFooter ? "hidden" : ""}`}>
          <label htmlFor="subject" className="font-medium">
            Betreff
          </label>
          <input
            ref={subjectRef}
            id="subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => (lastFocus.current = "subject")}
            maxLength={300}
            required
            className="min-h-12 rounded-xl border border-text/20 bg-surface px-4"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="body" className="font-medium">
            Text (einfaches HTML)
          </label>
          <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Formatierung">
            {WRAPS.map((w) => (
              <button
                key={w.label}
                type="button"
                title={w.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  lastFocus.current = "body";
                  insert(w.before, w.after);
                }}
                className={buttonClass}
              >
                {w.label}
              </button>
            ))}
          </div>
          <textarea
            ref={bodyRef}
            id="body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => (lastFocus.current = "body")}
            rows={18}
            spellCheck
            className="min-h-80 rounded-xl border border-text/20 bg-surface p-3 font-mono leading-relaxed"
          />
          <p className="text-sm text-text-muted">
            Erlaubt sind Absätze, Fett, Kursiv, Unterstrichen, Überschriften, Zitate, Listen, Zeilenumbrüche und
            Links. Alles andere entfernt LiGem beim Speichern.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-xl border border-text/10 p-3">
          <legend className="px-1 font-medium">Platzhalter</legend>
          <p className="text-sm text-text-muted">Klick fügt den Platzhalter an der Cursorposition ein (im Betreff oder im Text).</p>
          <ul className="flex flex-col gap-2">
            {definition.placeholders.map((p) => (
              <li key={p.name} className="flex flex-wrap items-baseline gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(`{{${p.name}}}`)}
                  className="rounded-md bg-accent/25 px-2 py-1 font-mono text-sm font-semibold hover:bg-accent/40"
                >
                  {`{{${p.name}}}`}
                </button>
                <span className="text-sm text-text-muted">{p.description}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            formAction={saveEmailTemplate}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Speichern
          </button>
          <button
            type="submit"
            formAction={sendTestEmail}
            className="inline-flex min-h-11 items-center rounded-full border border-text/20 px-5 font-semibold transition-colors hover:bg-bg"
          >
            Testmail an mich
          </button>
          {customized ? (
            <ConfirmSubmitButton
              formAction={resetEmailTemplate}
              confirmText="Den angepassten Text verwerfen und wieder den Standardtext verwenden?"
              className="inline-flex min-h-11 items-center rounded-full px-5 font-semibold text-error transition-colors hover:bg-error/10"
            >
              Auf Standard zurücksetzen
            </ConfirmSubmitButton>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Vorschau mit Beispieldaten</h2>
          <div className="flex gap-1.5" role="group" aria-label="Ansicht">
            {(["html", "text"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`min-h-9 rounded-full px-3 text-sm font-medium ${view === v ? "bg-secondary text-white" : "border border-text/20 hover:bg-bg"}`}
              >
                {v === "html" ? "HTML" : "Textfassung"}
              </button>
            ))}
          </div>
        </div>
        {isFooter ? null : (
          <p className="rounded-xl bg-surface px-4 py-3 text-sm">
            <span className="text-text-muted">Betreff:</span> <strong>{previewSubject}</strong>
          </p>
        )}
        {view === "html" ? (
          <iframe
            title="Vorschau der E-Mail"
            // No scripts, no same-origin: the preview only renders markup.
            sandbox=""
            srcDoc={previewHtml}
            className="h-[640px] w-full rounded-xl border border-text/10 bg-white"
          />
        ) : (
          <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap rounded-xl border border-text/10 bg-surface p-4 font-mono text-sm">
            {htmlToText(filledBody)}
          </pre>
        )}
      </div>
    </form>
  );
}
