"use client";

import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
  toggleShareAction,
  type NoteActionState,
} from "@/lib/actions/notes";
import {
  type Editor,
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useActionState, useState, useTransition } from "react";

type NoteEditorProps = {
  noteId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialIsPublic?: boolean;
  initialPublicSlug?: string | null;
};

export function NoteEditor({
  noteId,
  initialTitle = "",
  initialContent,
  initialIsPublic = false,
  initialPublicSlug = null,
}: NoteEditorProps) {
  const isEditing = !!noteId;

  const action = isEditing
    ? updateNoteAction.bind(null, noteId)
    : createNoteAction;

  const [state, formAction, isPending] = useActionState<
    NoteActionState,
    FormData
  >(action, {});

  const parsedContent = initialContent
    ? (() => {
        try {
          return JSON.parse(initialContent);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const editor = useEditor({
    extensions: [StarterKit],
    content: parsedContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] rounded border border-gray-300 px-3 py-2 text-base focus:border-black focus:outline-none",
      },
    },
  });

  function handleSubmit(formData: FormData) {
    if (editor) {
      formData.set("contentJson", JSON.stringify(editor.getJSON()));
    }
    formAction(formData);
  }

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={initialTitle}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
            placeholder="Note title"
          />
          {state.errors?.title && (
            <p className="mt-1 text-sm text-red-600">{state.errors.title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Content</label>
          <Toolbar editor={editor} />
          <EditorContent editor={editor} />
          <input type="hidden" name="contentJson" />
          {state.errors?.contentJson && (
            <p className="mt-1 text-sm text-red-600">
              {state.errors.contentJson}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending
              ? isEditing
                ? "Saving..."
                : "Creating..."
              : isEditing
                ? "Save"
                : "Create Note"}
          </button>
          {state.success && (
            <span className="text-sm text-green-600">Saved!</span>
          )}
        </div>
      </form>

      {isEditing && (
        <div className="flex items-center gap-4 border-t pt-4">
          <ShareToggle
            noteId={noteId}
            initialIsPublic={initialIsPublic}
            initialPublicSlug={initialPublicSlug}
          />
          <DeleteButton noteId={noteId} />
        </div>
      )}
    </div>
  );
}

function ShareToggle({
  noteId,
  initialIsPublic,
  initialPublicSlug,
}: {
  noteId: string;
  initialIsPublic: boolean;
  initialPublicSlug: string | null;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const newValue = !isPublic;
    startTransition(async () => {
      const result = await toggleShareAction(noteId, newValue);
      if ("error" in result) return;
      setIsPublic(result.isPublic);
      setPublicSlug(result.publicSlug);
    });
  }

  const publicUrl =
    isPublic && publicSlug
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${publicSlug}`
      : null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className="rounded border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        {pending
          ? "Updating..."
          : isPublic
            ? "Unshare"
            : "Share publicly"}
      </button>
      {publicUrl && (
        <span className="text-xs text-gray-500 break-all">{publicUrl}</span>
      )}
    </div>
  );
}

function DeleteButton({ noteId }: { noteId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    startTransition(() => deleteNoteAction(noteId));
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="rounded border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isHeading1: e?.isActive("heading", { level: 1 }) ?? false,
      isHeading2: e?.isActive("heading", { level: 2 }) ?? false,
      isHeading3: e?.isActive("heading", { level: 3 }) ?? false,
      isBulletList: e?.isActive("bulletList") ?? false,
      isOrderedList: e?.isActive("orderedList") ?? false,
      isCodeBlock: e?.isActive("codeBlock") ?? false,
    }),
  });

  if (!editor || !state) return null;

  const buttonClass = (active: boolean) =>
    `rounded px-2 py-1 text-sm ${active ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"}`;

  const preventFocusLoss = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="mt-1 mb-1 flex flex-wrap gap-1">
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={buttonClass(state.isBold)}
        aria-label="Bold"
        aria-pressed={state.isBold}
      >
        B
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={buttonClass(state.isItalic)}
        aria-label="Italic"
        aria-pressed={state.isItalic}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        className={buttonClass(state.isHeading1)}
        aria-label="Heading 1"
        aria-pressed={state.isHeading1}
      >
        H1
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        className={buttonClass(state.isHeading2)}
        aria-label="Heading 2"
        aria-pressed={state.isHeading2}
      >
        H2
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        className={buttonClass(state.isHeading3)}
        aria-label="Heading 3"
        aria-pressed={state.isHeading3}
      >
        H3
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={buttonClass(state.isBulletList)}
        aria-label="Bullet list"
        aria-pressed={state.isBulletList}
      >
        List
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={buttonClass(state.isOrderedList)}
        aria-label="Ordered list"
        aria-pressed={state.isOrderedList}
      >
        1. List
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={buttonClass(state.isCodeBlock)}
        aria-label="Code block"
        aria-pressed={state.isCodeBlock}
      >
        Code
      </button>
    </div>
  );
}
