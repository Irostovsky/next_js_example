import { describe, expect, it } from "vitest";
import {
  createNote,
  deleteNote,
  getNoteById,
  getNoteByPublicSlug,
  getNotesByUser,
  setNotePublic,
  updateNote,
} from "@/lib/notes";
import { TEST_USER_A, TEST_USER_B } from "../tests/setup";

const sampleContent = JSON.stringify({ type: "doc", content: [] });

function create(userId: string, title = "Untitled note", content = sampleContent) {
  const note = createNote(userId, title, content);
  if (!note) throw new Error("createNote returned undefined in test fixture");
  return note;
}

describe("createNote", () => {
  it("creates a note owned by the given user", () => {
    const note = create(TEST_USER_A, "Hello", sampleContent);
    expect(note.user_id).toBe(TEST_USER_A);
    expect(note.title).toBe("Hello");
    expect(note.content_json).toBe(sampleContent);
    expect(note.is_public).toBe(0);
    expect(note.public_slug).toBeNull();
    expect(note.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("populates created_at and updated_at", () => {
    const note = create(TEST_USER_A);
    expect(note.created_at).toBeTruthy();
    expect(note.updated_at).toBeTruthy();
  });
});

describe("getNoteById", () => {
  it("returns the note for its owner", () => {
    const created = create(TEST_USER_A);
    const fetched = getNoteById(TEST_USER_A, created.id);
    expect(fetched?.id).toBe(created.id);
  });

  it("does not return another user's note", () => {
    const created = create(TEST_USER_A);
    expect(getNoteById(TEST_USER_B, created.id)).toBeUndefined();
  });

  it("returns undefined for unknown id", () => {
    expect(getNoteById(TEST_USER_A, "missing")).toBeUndefined();
  });
});

describe("getNotesByUser", () => {
  it("returns only the user's notes", () => {
    create(TEST_USER_A, "A1");
    create(TEST_USER_A, "A2");
    create(TEST_USER_B, "B1");
    const aNotes = getNotesByUser(TEST_USER_A);
    expect(aNotes).toHaveLength(2);
    expect(aNotes.every((n) => n.user_id === TEST_USER_A)).toBe(true);
  });

  it("orders by updated_at descending", () => {
    const first = create(TEST_USER_A, "first");
    const second = create(TEST_USER_A, "second");
    // Touch the first note so its updated_at moves forward.
    updateNote(TEST_USER_A, first.id, { title: "first-updated" });
    const notes = getNotesByUser(TEST_USER_A);
    expect(notes.map((n) => n.id)).toEqual([first.id, second.id]);
  });

  it("omits content_json from the list response", () => {
    create(TEST_USER_A);
    const notes = getNotesByUser(TEST_USER_A);
    expect(notes[0]).not.toHaveProperty("content_json");
  });
});

describe("updateNote", () => {
  it("updates the title", () => {
    const note = create(TEST_USER_A, "old title");
    const updated = updateNote(TEST_USER_A, note.id, { title: "new title" });
    expect(updated?.title).toBe("new title");
    expect(updated?.content_json).toBe(note.content_json);
  });

  it("updates the content", () => {
    const note = create(TEST_USER_A);
    const newContent = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
    const updated = updateNote(TEST_USER_A, note.id, { contentJson: newContent });
    expect(updated?.content_json).toBe(newContent);
  });

  it("preserves untouched fields when only one is supplied", () => {
    const note = create(TEST_USER_A, "keep me");
    const updated = updateNote(TEST_USER_A, note.id, {
      contentJson: JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] }),
    });
    expect(updated?.title).toBe("keep me");
  });

  it("does not update another user's note", () => {
    const note = create(TEST_USER_A, "private");
    expect(updateNote(TEST_USER_B, note.id, { title: "stolen" })).toBeUndefined();
    expect(getNoteById(TEST_USER_A, note.id)?.title).toBe("private");
  });

  it("returns undefined for unknown id", () => {
    expect(updateNote(TEST_USER_A, "missing", { title: "x" })).toBeUndefined();
  });
});

describe("deleteNote", () => {
  it("hard deletes the note", () => {
    const note = create(TEST_USER_A);
    expect(deleteNote(TEST_USER_A, note.id)).toBe(true);
    expect(getNoteById(TEST_USER_A, note.id)).toBeUndefined();
  });

  it("does not delete another user's note", () => {
    const note = create(TEST_USER_A);
    expect(deleteNote(TEST_USER_B, note.id)).toBe(false);
    expect(getNoteById(TEST_USER_A, note.id)).toBeDefined();
  });

  it("returns false for unknown id", () => {
    expect(deleteNote(TEST_USER_A, "missing")).toBe(false);
  });
});

describe("setNotePublic", () => {
  it("generates a public slug when enabling sharing", () => {
    const note = create(TEST_USER_A);
    const updated = setNotePublic(TEST_USER_A, note.id, true);
    expect(updated?.is_public).toBe(1);
    expect(updated?.public_slug).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });

  it("reuses the existing slug when toggled on again", () => {
    const note = create(TEST_USER_A);
    const firstSlug = setNotePublic(TEST_USER_A, note.id, true)?.public_slug;
    const secondSlug = setNotePublic(TEST_USER_A, note.id, true)?.public_slug;
    expect(secondSlug).toBe(firstSlug);
  });

  it("clears the slug and visibility when disabling sharing", () => {
    const note = create(TEST_USER_A);
    setNotePublic(TEST_USER_A, note.id, true);
    const updated = setNotePublic(TEST_USER_A, note.id, false);
    expect(updated?.is_public).toBe(0);
    expect(updated?.public_slug).toBeNull();
  });

  it("does not change another user's note", () => {
    const note = create(TEST_USER_A);
    expect(setNotePublic(TEST_USER_B, note.id, true)).toBeUndefined();
    expect(getNoteById(TEST_USER_A, note.id)?.is_public).toBe(0);
  });
});

describe("getNoteByPublicSlug", () => {
  it("returns a public note by slug", () => {
    const note = create(TEST_USER_A);
    const shared = setNotePublic(TEST_USER_A, note.id, true);
    const fetched = getNoteByPublicSlug(shared!.public_slug!);
    expect(fetched?.id).toBe(note.id);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getNoteByPublicSlug("does-not-exist")).toBeUndefined();
  });

  it("returns undefined when sharing has been disabled", () => {
    const note = create(TEST_USER_A);
    const shared = setNotePublic(TEST_USER_A, note.id, true);
    const slug = shared!.public_slug!;
    setNotePublic(TEST_USER_A, note.id, false);
    expect(getNoteByPublicSlug(slug)).toBeUndefined();
  });
});
