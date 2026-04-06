"use client";

import { createNoteAction, type CreateNoteState } from "@/lib/actions/notes";
import {
  type Editor,
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useActionState } from "react";

export function NoteEditor() {
  const [state, formAction, isPending] = useActionState<
    CreateNoteState,
    FormData
  >(createNoteAction, {});

  const editor = useEditor({
    extensions: [StarterKit],
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

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Note"}
      </button>
    </form>
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

  if (!editor) return null;

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
