import { DeleteNoteButton } from "@/components/delete-note-button";
import { PublicNoteViewer } from "@/components/public-note-viewer";
import { auth } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function NoteViewPage({
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
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/notes/${note.id}`}
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Edit
          </Link>
          <DeleteNoteButton noteId={note.id} />
        </div>
      </div>
      <h1 className="text-2xl font-bold">{note.title}</h1>
      <time className="mt-2 block text-sm text-gray-500">
        {new Date(note.updated_at + "Z").toLocaleDateString()}
      </time>
      <div className="mt-6">
        <PublicNoteViewer contentJson={note.content_json} />
      </div>
    </main>
  );
}
