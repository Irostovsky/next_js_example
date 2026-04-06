import type { NoteListItem } from "@/lib/notes";
import Link from "next/link";

export function NoteList({ notes }: { notes: NoteListItem[] }) {
  if (notes.length === 0) {
    return (
      <p className="mt-8 text-center text-gray-500">
        No notes yet. Create your first note to get started.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {notes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/notes/${note.id}/view`}
            className="block rounded border border-gray-200 px-4 py-3 transition-colors hover:border-gray-400"
          >
            <h2 className="font-medium">{note.title}</h2>
            <time className="mt-1 block text-sm text-gray-500">
              {new Date(note.updated_at + "Z").toLocaleDateString()}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
