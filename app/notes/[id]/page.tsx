import { NoteEditor } from "@/components/note-editor";
import { auth } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/authenticate");
  }

  const { id } = await params;
  const note = getNoteById(session.user.id, id);

  if (!note) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <NoteEditor
        noteId={note.id}
        initialTitle={note.title}
        initialContent={note.content_json}
        initialIsPublic={note.is_public === 1}
        initialPublicSlug={note.public_slug}
      />
    </main>
  );
}
