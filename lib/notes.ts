import { get, query, run } from "@/lib/db";
import { nanoid } from "nanoid";

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteListItem = Pick<
  Note,
  "id" | "user_id" | "title" | "is_public" | "public_slug" | "created_at" | "updated_at"
>;

export function createNote(
  userId: string,
  title: string,
  contentJson: string
): Note | undefined {
  const id = crypto.randomUUID();
  run(
    "INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?)",
    id,
    userId,
    title,
    contentJson
  );
  return get<Note>("SELECT * FROM notes WHERE id = ?", id);
}

export function getNotesByUser(userId: string): NoteListItem[] {
  return query<NoteListItem>(
    "SELECT id, user_id, title, is_public, public_slug, created_at, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    userId
  );
}

export function getNoteById(userId: string, noteId: string): Note | undefined {
  return get<Note>(
    "SELECT * FROM notes WHERE id = ? AND user_id = ?",
    noteId,
    userId
  );
}

export function updateNote(
  userId: string,
  noteId: string,
  data: { title?: string; contentJson?: string }
): Note | undefined {
  const note = getNoteById(userId, noteId);
  if (!note) return undefined;

  const title = data.title ?? note.title;
  const contentJson = data.contentJson ?? note.content_json;

  run(
    "UPDATE notes SET title = ?, content_json = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    title,
    contentJson,
    noteId,
    userId
  );
  return getNoteById(userId, noteId);
}

export function deleteNote(userId: string, noteId: string): boolean {
  const note = getNoteById(userId, noteId);
  if (!note) return false;
  run("DELETE FROM notes WHERE id = ? AND user_id = ?", noteId, userId);
  return true;
}

export function setNotePublic(
  userId: string,
  noteId: string,
  isPublic: boolean
): Note | undefined {
  const note = getNoteById(userId, noteId);
  if (!note) return undefined;

  if (isPublic) {
    const slug = note.public_slug ?? nanoid(16);
    run(
      "UPDATE notes SET is_public = 1, public_slug = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      slug,
      noteId,
      userId
    );
  } else {
    run(
      "UPDATE notes SET is_public = 0, public_slug = NULL, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
      noteId,
      userId
    );
  }
  return getNoteById(userId, noteId);
}

export function getNoteByPublicSlug(slug: string): Note | undefined {
  return get<Note>(
    "SELECT * FROM notes WHERE public_slug = ? AND is_public = 1",
    slug
  );
}
