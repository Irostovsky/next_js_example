import { get, query, run } from "@/lib/db";

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

export function createNote(
  userId: string,
  title: string,
  contentJson: string
): Note {
  const id = crypto.randomUUID();
  run(
    "INSERT INTO notes (id, user_id, title, content_json) VALUES (?, ?, ?, ?)",
    id,
    userId,
    title,
    contentJson
  );
  return get<Note>("SELECT * FROM notes WHERE id = ?", id)!;
}

export function getNotesByUser(userId: string): Note[] {
  return query<Note>(
    "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC",
    userId
  );
}
