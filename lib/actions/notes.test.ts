import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/notes", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  setNotePublic: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

class RedirectError extends Error {
  constructor(public path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path);
  }),
}));

import { auth } from "@/lib/auth";
import {
  createNote,
  deleteNote,
  setNotePublic,
  updateNote,
} from "@/lib/notes";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNoteAction,
  deleteNoteAction,
  toggleShareAction,
  updateNoteAction,
} from "./notes";

const getSession = vi.mocked(auth.api.getSession);
const mockedCreateNote = vi.mocked(createNote);
const mockedUpdateNote = vi.mocked(updateNote);
const mockedDeleteNote = vi.mocked(deleteNote);
const mockedSetNotePublic = vi.mocked(setNotePublic);
const mockedRedirect = vi.mocked(redirect);
const mockedRevalidatePath = vi.mocked(revalidatePath);

const sampleContent = JSON.stringify({ type: "doc", content: [] });

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

type SessionShape = Parameters<typeof getSession.mockResolvedValue>[0];

function authedSession(userId = "user-1"): SessionShape {
  return {
    user: { id: userId },
    session: { id: "session-id" },
  } as unknown as SessionShape;
}

function noSession(): SessionShape {
  return null as unknown as SessionShape;
}

function fakeNote(overrides: Partial<{ id: string; user_id: string; is_public: number; public_slug: string | null }> = {}) {
  return {
    id: "note-1",
    user_id: "user-1",
    title: "Note",
    content_json: sampleContent,
    is_public: 0,
    public_slug: null,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createNoteAction", () => {
  it("redirects to /authenticate when no session", async () => {
    getSession.mockResolvedValue(noSession());
    await expect(
      createNoteAction({}, makeFormData({ title: "x", contentJson: sampleContent }))
    ).rejects.toMatchObject({ path: "/authenticate" });
    expect(mockedCreateNote).not.toHaveBeenCalled();
  });

  it("returns validation errors for an empty title", async () => {
    getSession.mockResolvedValue(authedSession());
    const state = await createNoteAction(
      {},
      makeFormData({ title: "", contentJson: sampleContent })
    );
    expect(state.errors?.title).toBeTruthy();
    expect(mockedCreateNote).not.toHaveBeenCalled();
  });

  it("returns validation errors when contentJson is not valid JSON", async () => {
    getSession.mockResolvedValue(authedSession());
    const state = await createNoteAction(
      {},
      makeFormData({ title: "hi", contentJson: "not-json" })
    );
    expect(state.errors?.contentJson).toBe("Content must be valid JSON");
    expect(mockedCreateNote).not.toHaveBeenCalled();
  });

  it("creates the note and redirects to /notes/:id on success", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedCreateNote.mockReturnValue(fakeNote({ id: "abc" }));
    await expect(
      createNoteAction({}, makeFormData({ title: "Hello", contentJson: sampleContent }))
    ).rejects.toMatchObject({ path: "/notes/abc" });
    expect(mockedCreateNote).toHaveBeenCalledWith("user-1", "Hello", sampleContent);
  });

  it("returns a generic error if the repository fails to create", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedCreateNote.mockReturnValue(undefined);
    const state = await createNoteAction(
      {},
      makeFormData({ title: "Hello", contentJson: sampleContent })
    );
    expect(state.errors?.title).toMatch(/failed/i);
    expect(mockedRedirect).not.toHaveBeenCalled();
  });
});

describe("updateNoteAction", () => {
  it("redirects to /authenticate when no session", async () => {
    getSession.mockResolvedValue(noSession());
    await expect(
      updateNoteAction("note-1", {}, makeFormData({ title: "x" }))
    ).rejects.toMatchObject({ path: "/authenticate" });
  });

  it("validates the title length", async () => {
    getSession.mockResolvedValue(authedSession());
    const state = await updateNoteAction(
      "note-1",
      {},
      makeFormData({ title: "a".repeat(256) })
    );
    expect(state.errors?.title).toBeTruthy();
    expect(mockedUpdateNote).not.toHaveBeenCalled();
  });

  it("calls updateNote with parsed data and revalidates", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedUpdateNote.mockReturnValue(fakeNote());
    const state = await updateNoteAction(
      "note-1",
      {},
      makeFormData({ title: "new title", contentJson: sampleContent })
    );
    expect(mockedUpdateNote).toHaveBeenCalledWith("user-1", "note-1", {
      title: "new title",
      contentJson: sampleContent,
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/notes/note-1");
    expect(state.success).toBe(true);
  });

  it("returns 'Note not found' when repository returns undefined", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedUpdateNote.mockReturnValue(undefined);
    const state = await updateNoteAction(
      "missing",
      {},
      makeFormData({ title: "x" })
    );
    expect(state.errors?.title).toBe("Note not found.");
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("deleteNoteAction", () => {
  it("redirects to /authenticate when no session", async () => {
    getSession.mockResolvedValue(noSession());
    await expect(deleteNoteAction("note-1")).rejects.toMatchObject({
      path: "/authenticate",
    });
    expect(mockedDeleteNote).not.toHaveBeenCalled();
  });

  it("deletes and redirects to the dashboard", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedDeleteNote.mockReturnValue(true);
    await expect(deleteNoteAction("note-1")).rejects.toMatchObject({
      path: "/dashboard",
    });
    expect(mockedDeleteNote).toHaveBeenCalledWith("user-1", "note-1");
  });
});

describe("toggleShareAction", () => {
  it("redirects to /authenticate when no session", async () => {
    getSession.mockResolvedValue(noSession());
    await expect(toggleShareAction("note-1", true)).rejects.toMatchObject({
      path: "/authenticate",
    });
  });

  it("returns { isPublic, publicSlug } and revalidates on success", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedSetNotePublic.mockReturnValue(
      fakeNote({ is_public: 1, public_slug: "abcdefghij012345" })
    );
    const result = await toggleShareAction("note-1", true);
    expect(result).toEqual({ isPublic: true, publicSlug: "abcdefghij012345" });
    expect(mockedSetNotePublic).toHaveBeenCalledWith("user-1", "note-1", true);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/notes/note-1");
  });

  it("returns an error if the note is not found", async () => {
    getSession.mockResolvedValue(authedSession());
    mockedSetNotePublic.mockReturnValue(undefined);
    const result = await toggleShareAction("missing", true);
    expect(result).toEqual({ error: "Note not found." });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});
