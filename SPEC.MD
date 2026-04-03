# Technical Specification -- Note Taking Web App

## 1. Overview

A web application where authenticated users can create, view, edit, delete, and publicly share rich-text notes. Notes are created with TipTap, stored as JSON in a SQLite database, and rendered in the browser with formatting.

### Core Features

- User authentication (sign up, login, logout) via better-auth
- Authenticated note management (CRUD)
- Rich text editor using TipTap with:
  - Bold, Italic
  - Heading levels (H1--H3) + normal text
  - Inline code + code blocks
  - Bullet lists
  - Horizontal rules
- Public sharing of notes via a public URL (toggle on/off)

### Tech Stack

| Technology   | Purpose                          |
| ------------ | -------------------------------- |
| Next.js      | App Router (frontend & backend)  |
| Bun          | Runtime (dev & production)       |
| TypeScript   | Language                         |
| TailwindCSS  | Styling                          |
| SQLite       | Database (via Bun built-in)      |
| better-auth  | Authentication                   |
| TipTap       | Rich text editor                 |

---

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for TipTap editor and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (e.g., `data/app.db`) accessed via Bun's built-in SQLite client
- **Auth:** better-auth integrated into Next.js (middleware + server helpers)

### 2.2 Application Layers

| Layer              | Responsibility                                      |
| ------------------ | --------------------------------------------------- |
| **Presentation**   | Next.js pages/components, TailwindCSS, TipTap       |
| **API**            | REST-like JSON endpoints for notes CRUD & sharing    |
| **Data Access**    | Raw SQL queries via Bun's SQLite client              |

---

## 3. Functional Requirements

### 3.1 Authentication

**Users can:**

- Register (email + password, minimum validation)
- Log in / log out

Authentication state is accessible on server (for SSR) and on client (for protected UI).

**Unauthenticated users:**

- Can access public shared note URLs (read-only)
- Cannot access dashboard or personal notes

### 3.2 Notes Management (Authenticated)

| Action              | Details                                                |
| ------------------- | ------------------------------------------------------ |
| **Create**          | Default title: "Untitled note", default empty TipTap document |
| **List**            | Show title, last updated at, shared status             |
| **View**            | Load editor with stored TipTap JSON document           |
| **Update**          | Change title and/or content (TipTap JSON), auto-update `updated_at` |
| **Delete**          | Hard delete                                            |

### 3.3 Note Sharing

Users can toggle note "public sharing":

- **When enabled:** Note gets a unique public slug (e.g., `abcdef1234`), accessible via `/p/{slug}` for anonymous users
- **When disabled:** Public URL returns 404 / "Note not found"

**Public page rendering:**

- Reads note from DB by `public_slug`
- Shows title and content in read-only mode
- No editing or owner information necessary

---

## 4. Non-Functional Requirements

| Category            | Requirement                                                    |
| ------------------- | -------------------------------------------------------------- |
| **Performance**     | Notes list & note view should load under ~300 ms               |
| **Security**        | All note operations scoped to authenticated user's `user_id`; public notes are read-only |
| **Reliability**     | Graceful handling of DB errors                                 |
| **Maintainability** | Type-safe APIs and DB types; modularized DB and auth helpers   |
| **UX**              | Simple, minimal UI with keyboard-friendly editor               |

---

## 5. Data Model & Database Schema (SQLite)

### 5.1 better-auth Tables

better-auth manages its own tables (`user`, `session`, `account`, `verification`) automatically. These tables are created and migrated using the better-auth CLI -- **do not manually define or migrate them**.

#### Setup

Configure better-auth with Bun's built-in SQLite:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";

export const auth = betterAuth({
  database: new Database("data/app.db"),
});
```

> **Note:** Use `bunx --bun` when running CLI commands to avoid type errors with the `bun:sqlite` module, e.g.:
> `bunx --bun auth@latest generate`

#### Schema Generation & Migration

Use the better-auth CLI to generate or migrate the auth schema:

```bash
# Generate schema SQL (review before applying)
bunx --bun auth@latest generate

# Apply migrations directly
bunx --bun auth@latest migrate
```

This creates the following core tables (managed by better-auth):

| Table            | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `user`           | User accounts (id, name, email, emailVerified, etc.) |
| `session`        | Active sessions (token, expiresAt, ipAddress, etc.)  |
| `account`        | Auth providers & credentials (providerId, password, etc.) |
| `verification`   | Email/token verification requests                    |

#### Performance: Joins (Experimental)

better-auth supports database joins for improved performance (2-3x improvement on endpoints like `/get-session`). Enable in auth config:

```typescript
export const auth = betterAuth({
  database: new Database("data/app.db"),
  experimental: { joins: true },
});
```

> You may need to run migrations after enabling joins.

### 5.2 Application Tables

#### `notes`

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user(id)
);
```

| Field          | Type      | Description                                |
| -------------- | --------- | ------------------------------------------ |
| `id`           | TEXT (PK) | Unique note identifier                     |
| `user_id`      | TEXT (FK) | Owner, references `user(id)`               |
| `title`        | TEXT      | Note title                                 |
| `content_json` | TEXT      | Stringified TipTap JSON document           |
| `is_public`    | INTEGER   | 0 = private, 1 = public                    |
| `public_slug`  | TEXT      | Unique slug for public access (nullable)   |
| `created_at`   | TEXT      | Creation timestamp                         |
| `updated_at`   | TEXT      | Last update timestamp                      |

### 5.3 Indexes

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_public_slug ON notes(public_slug);
CREATE INDEX idx_notes_is_public ON notes(is_public);
```

---

## 6. Backend: DB & API Layer

### 6.1 Database Access Module

**File:** `lib/db.ts`

- Initialize Bun SQLite client with DB file (`data/app.db`)
- Export helper functions:
  - `getDb()` -- returns singleton DB connection
  - `query<T>(sql, params?): T[]`
  - `get<T>(sql, params?): T | undefined`
  - `run(sql, params?)`

### 6.2 Note Repository Functions

**File:** `lib/notes.ts`

**TypeScript types:**

```typescript
export type Note = {
  id: string;
  userId: string;
  title: string;
  contentJson: string; // stringified TipTap doc
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: string;
  updatedAt: string;
};
```

**Repository functions:**

| Function                                  | Description                          |
| ----------------------------------------- | ------------------------------------ |
| `createNote(userId, data)`                | Create note with optional title/content |
| `getNoteById(userId, noteId)`             | Get single note (scoped to user)     |
| `getNotesByUser(userId)`                  | List all notes for a user            |
| `updateNote(userId, noteId, data)`        | Update title and/or content          |
| `deleteNote(userId, noteId)`              | Hard delete a note                   |
| `setNotePublic(userId, noteId, isPublic)` | Toggle public sharing                |
| `getNoteByPublicSlug(slug)`               | Get note by public slug (no auth)    |

Each function enforces `user_id = ?` in SQL where applicable to prevent cross-user access.

---

## 7. API Design (Next.js Route Handlers)

Base path: `/api/notes`

### 7.1 Authentication

All `/api/notes` handlers (except public read) must:

1. Check auth via better-auth server helper (`getSession()`)
2. Return `401` if not authenticated

### 7.2 Endpoints

#### `GET /api/notes`

List notes for current user.

**Response `200`:**

```json
[
  {
    "id": "note-id",
    "title": "My Note",
    "isPublic": true,
    "updatedAt": "2025-01-01T12:00:00Z"
  }
]
```

Omit `contentJson` from list response for performance.

---

#### `POST /api/notes`

Create a new note.

**Request body:**

```json
{
  "title": "Optional title",
  "contentJson": { "type": "doc", "content": [] }
}
```

- Default title = `"Untitled note"` if missing
- Default `contentJson` = empty TipTap document if missing

**Response `201`:** Created note object.

---

#### `GET /api/notes/:id`

Get single note owned by current user.

- **`200`** -- Full note including `contentJson`
- **`404`** -- Not found or not owned by user

---

#### `PUT /api/notes/:id`

Update note title/content.

**Request body:**

```json
{
  "title": "New title",
  "contentJson": { "type": "doc", "content": [] }
}
```

- **`200`** -- Updated note
- **`404`** -- Not found

---

#### `DELETE /api/notes/:id`

Delete note.

- **`204`** -- Success
- **`404`** -- Not found

---

#### `POST /api/notes/:id/share`

Toggle public sharing.

**Request body:**

```json
{
  "isPublic": true
}
```

**Behavior:**

- If `isPublic = true` and note has no `public_slug`, generate new slug via `nanoid()`
- If `isPublic = false`, set `is_public = 0` and `public_slug = NULL`

**Response `200`:**

```json
{
  "id": "note-id",
  "isPublic": true,
  "publicSlug": "abcdef1234"
}
```

### 7.3 Public Note Endpoint

#### `GET /api/public-notes/:slug`

Read-only access to public notes. No authentication required.

**Response `200`:**

```json
{
  "title": "Public note",
  "contentJson": { "type": "doc", "content": [] }
}
```

- **`404`** -- Slug not found or `is_public = 0`

> Alternative: Skip this API endpoint and resolve directly in the `/p/[slug]` route using server components.

---

## 8. Frontend -- Pages & Components

### 8.1 Routes

| Route           | Description                              | Auth Required |
| --------------- | ---------------------------------------- | ------------- |
| `/`             | Landing page with login/sign-up CTA      | No            |
| `/dashboard`    | List of user notes + "Create note" button | Yes           |
| `/notes/[id]`   | Note editor (TipTap, title, share, delete) | Yes          |
| `/p/[slug]`     | Public read-only note view               | No            |

### 8.2 Layout & Navigation

- **Global layout** (`app/layout.tsx`): Header with app name, login/logout/account & theme
- **Auth pages** (`app/(auth)/login`, `app/(auth)/register`): Custom UI for better-auth

### 8.3 Components

| Component                       | Responsibility                                       |
| ------------------------------- | ---------------------------------------------------- |
| `components/NoteList.tsx`       | Renders list of notes with links to `/notes/[id]`    |
| `components/NoteEditor.tsx`     | TipTap editor, controlled by parent via `onChange`    |
| `components/ShareToggle.tsx`    | Toggle `isPublic`, displays public URL when enabled   |
| `components/DeleteNoteButton.tsx` | Confirm and call DELETE API                         |
| `components/PublicNoteViewer.tsx` | Read-only TipTap content (`editable: false`)        |

---

## 9. TipTap Integration

### 9.1 Extensions

- `StarterKit` (paragraphs, headings, bold, italic, bullet lists, horizontal rule, etc.)
- `Code` (inline code)
- `CodeBlockLowlight` or `CodeBlock` (code snippets)

**Example editor config:**

```typescript
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Code,
    CodeBlock,
  ],
  content: initialContentJson, // TipTap JSON
  onUpdate: ({ editor }) => {
    const json = editor.getJSON();
    onChange(json);
  },
});
```

Content is stored in DB as `JSON.stringify(json)`; when loading, `JSON.parse` and pass as `content`.

### 9.2 Toolbar

| Button          | TipTap Chain                                      |
| --------------- | ------------------------------------------------- |
| Bold            | `editor.chain().focus().toggleBold().run()`        |
| Italic          | `editor.chain().focus().toggleItalic().run()`      |
| H1, H2, H3     | `editor.chain().focus().toggleHeading({ level }).run()` |
| Paragraph       | `editor.chain().focus().setParagraph().run()`      |
| Bullet list     | `editor.chain().focus().toggleBulletList().run()`  |
| Inline code     | `editor.chain().focus().toggleCode().run()`        |
| Code block      | `editor.chain().focus().toggleCodeBlock().run()`   |
| Horizontal rule | `editor.chain().focus().setHorizontalRule().run()` |

---

## 10. Styling (TailwindCSS)

- Configure Tailwind in `tailwind.config.ts`
- Minimal design: neutral background, card-like note container, utility classes
- Use `@tailwindcss/typography` prose classes for read-only content rendering

---

## 11. Security Considerations

| Area                  | Measure                                                        |
| --------------------- | -------------------------------------------------------------- |
| **Auth enforcement**  | All `/dashboard` and `/notes/[id]` routes check auth on server; API routes verify user and attach `userId` from session |
| **Authorization**     | Every note query in auth context filters by `user_id`          |
| **Public notes**      | Slug is sufficiently random (16+ chars) to prevent guessing    |
| **XSS**              | TipTap JSON (not raw HTML); only TipTap's renderer used for output |
| **Rate limiting**     | *(Optional)* Per-IP or per-user rate limiting on API routes    |

---

## 12. Development Workflow

1. Initialize Next.js app with Bun & TypeScript
2. Set up TailwindCSS
3. Integrate better-auth (configure with Bun SQLite, run `bunx --bun auth@latest migrate`)
4. Create application tables (`notes`) and indexes
5. Build DB helpers and note repository
6. Implement `/api/notes` and sharing APIs
7. Build dashboard and note editor pages
8. Integrate TipTap editor and toolbar
9. Implement public note pages `/p/[slug]`
10. Add polish (loading states, toast messages, error handling)
