"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export function PublicNoteViewer({ contentJson }: { contentJson: string }) {
  const content = (() => {
    try {
      return JSON.parse(contentJson);
    } catch {
      return undefined;
    }
  })();

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
}
