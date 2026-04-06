"use server";

import { auth } from "@/lib/auth";
import {
  createNote,
  updateNote,
  deleteNote,
  setNotePublic,
} from "@/lib/notes";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const jsonString = z
  .string()
  .min(1, "Content is required")
  .refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Content must be valid JSON" }
  );

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  contentJson: jsonString,
});

const updateNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title is too long")
    .optional(),
  contentJson: jsonString.optional(),
});

export type NoteActionState = {
  errors?: Record<string, string>;
  success?: boolean;
};

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) redirect("/authenticate");
  return session;
}

export async function createNoteAction(
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const session = await requireSession();

  const result = createNoteSchema.safeParse({
    title: formData.get("title"),
    contentJson: formData.get("contentJson"),
  });

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const note = createNote(
    session.user.id,
    result.data.title,
    result.data.contentJson
  );

  if (!note) {
    return { errors: { title: "Failed to create note. Please try again." } };
  }

  redirect(`/notes/${note.id}`);
}

export async function updateNoteAction(
  noteId: string,
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const session = await requireSession();

  const result = updateNoteSchema.safeParse({
    title: formData.get("title") || undefined,
    contentJson: formData.get("contentJson") || undefined,
  });

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const note = updateNote(session.user.id, noteId, result.data);
  if (!note) {
    return { errors: { title: "Note not found." } };
  }

  revalidatePath(`/notes/${noteId}`);
  return { success: true };
}

export async function deleteNoteAction(noteId: string): Promise<void> {
  const session = await requireSession();
  deleteNote(session.user.id, noteId);
  redirect("/dashboard");
}

export async function toggleShareAction(
  noteId: string,
  isPublic: boolean
): Promise<{ publicSlug: string | null; isPublic: boolean } | { error: string }> {
  const session = await requireSession();
  const note = setNotePublic(session.user.id, noteId, isPublic);
  if (!note) return { error: "Note not found." };

  revalidatePath(`/notes/${noteId}`);
  return {
    publicSlug: note.public_slug,
    isPublic: note.is_public === 1,
  };
}
