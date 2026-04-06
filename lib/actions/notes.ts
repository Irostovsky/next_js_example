"use server";

import { auth } from "@/lib/auth";
import { createNote } from "@/lib/notes";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  contentJson: z.string().min(1, "Content is required"),
});

export type CreateNoteState = {
  errors?: Record<string, string>;
};

export async function createNoteAction(
  _prevState: CreateNoteState,
  formData: FormData
): Promise<CreateNoteState> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/authenticate");
  }

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

  redirect(`/notes/${note.id}`);
}
