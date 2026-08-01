"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

function ToolbarButton({
  onClick,
  isActive,
  label,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // A plain mousedown on this button would shift focus (and collapse
      // whatever text selection was just made in the editor) before
      // onClick's chain().focus().toggle...().run() even runs — by then
      // there'd be nothing left to apply Bold/Italic to. Preventing the
      // mousedown's default keeps the editor's selection intact.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      title={label}
      className={
        isActive
          ? "flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"
          : "flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg"
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap gap-1 border-b border-text/10 p-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        label="Fett"
      >
        <Bold className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        label="Kursiv"
      >
        <Italic className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        label="Aufzählung"
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        label="Nummerierte Liste"
      >
        <ListOrdered className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
    </div>
  );
}

/**
 * A deliberately reduced rich-text input — bold, italic, and the two list
 * types, nothing else (no headings/tables/images/colors/links) — built on
 * Tiptap. Renders a real `<textarea>`-shaped bordered box with a small
 * toolbar on top, and syncs its HTML into a hidden `<input>` of the given
 * `name` on every change, so it drops into the existing plain
 * `<form action={serverAction}>` convention (see CLAUDE.md's Pages section)
 * exactly like the `<textarea>` it replaces — the server action still just
 * reads `formData.get(name)`, now getting sanitized-on-save HTML instead of
 * plain text (see `src/lib/sanitize-html.ts`).
 */
export function RichTextField({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: false,
      }),
    ],
    content: defaultValue ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        class: "min-h-28 px-4 py-3 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
      },
    },
    onUpdate: ({ editor }) => {
      // Tiptap's "empty" doc still serializes to "<p></p>", not "" — without
      // this, an untouched/cleared field would submit that instead of
      // nothing, defeating the optional-field handling on the server side.
      setHtml(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <div className="rounded-xl border border-text/20 bg-surface text-text">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
