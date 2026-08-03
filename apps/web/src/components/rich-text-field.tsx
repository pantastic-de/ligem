"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useImperativeHandle, useState } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
} from "lucide-react";

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
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        label="Unterstrichen"
      >
        <UnderlineIcon className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        label="Überschrift"
      >
        <Heading2 className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        label="Zwischenüberschrift"
      >
        <Heading3 className="h-4 w-4" aria-hidden="true" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        label="Zitat"
      >
        <Quote className="h-4 w-4" aria-hidden="true" />
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
 * A deliberately reduced rich-text input — bold, italic, underline,
 * headings (H2/H3), blockquote, and the two list types, nothing else (no
 * tables/images/colors/links/code) — built on Tiptap. Renders a real
 * `<textarea>`-shaped bordered box with a small toolbar on top, and syncs
 * its HTML into a hidden `<input>` of the given `name` on every change, so
 * it drops into the existing plain `<form action={serverAction}>`
 * convention (see CLAUDE.md's Pages section) exactly like the `<textarea>`
 * it replaces — the server action still just reads `formData.get(name)`,
 * now getting sanitized-on-save HTML instead of plain text (see
 * `src/lib/sanitize-html.ts`, whose allowlist must stay in sync with
 * whatever tags this toolbar can produce).
 */
export type RichTextFieldHandle = {
  /** Replaces the editor's whole content — used by EventDescriptionImportField
   * to push in a KI-Import result after the fact, since Tiptap otherwise only
   * ever reads `defaultValue` once at mount. */
  setContent: (html: string) => void;
};

export const RichTextField = forwardRef<RichTextFieldHandle, {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
}>(function RichTextField({ id, name, label, defaultValue }, ref) {
  const [html, setHtml] = useState(defaultValue ?? "");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: {},
        underline: {},
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: false,
      }),
    ],
    content: defaultValue ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        class:
          "min-h-28 px-4 py-3 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-text/20 [&_blockquote]:pl-4 [&_blockquote]:italic",
      },
    },
    onUpdate: ({ editor }) => {
      // Tiptap's "empty" doc still serializes to "<p></p>", not "" — without
      // this, an untouched/cleared field would submit that instead of
      // nothing, defeating the optional-field handling on the server side.
      setHtml(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  useImperativeHandle(ref, () => ({
    setContent: (newHtml: string) => {
      editor?.commands.setContent(newHtml);
      setHtml(newHtml);
    },
  }), [editor]);

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
});
