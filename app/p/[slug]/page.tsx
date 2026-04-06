import { PublicNoteViewer } from "@/components/public-note-viewer";
import { getNoteByPublicSlug } from "@/lib/notes";
import { notFound } from "next/navigation";

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getNoteByPublicSlug(slug);

  if (!note) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">{note.title}</h1>
      <div className="mt-6">
        <PublicNoteViewer contentJson={note.content_json} />
      </div>
    </main>
  );
}
