import { NoteList } from "@/components/note-list";
import { auth } from "@/lib/auth";
import { getNotesByUser } from "@/lib/notes";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/authenticate");
  }

  const notes = getNotesByUser(session.user.id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Notes</h1>
        <Link
          href="/notes/new"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New Note
        </Link>
      </div>
      <NoteList notes={notes} />
    </main>
  );
}
