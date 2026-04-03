# CLAUDE.md

We are building the app described in the @SPEC.MD. Read that file for the general architecture tasks, database structure, tech stack
or application architecture.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A note-taking web app where authenticated users can create, edit, delete, and publicly share rich-text notes. See `SPEC.MD` for the full technical specification.

## Tech Stack

- **Next.js 16** (App Router) — frontend & backend
- **Bun** — runtime (dev & production)
- **TypeScript** with strict mode
- **TailwindCSS v4** — styling (via PostCSS plugin)
- **SQLite** — database via Bun's built-in `bun:sqlite` (`data/app.db`)
- **better-auth** — authentication
- **TipTap** — rich text editor (StarterKit)
- **Zod** — validation

## Commands

```bash
bun run dev        # Start dev server (http://localhost:3000)
bun run build      # Production build
bun run start      # Start production server
bun run lint       # Run ESLint (flat config, eslint.config.mjs)
```

### better-auth CLI (must use `bunx --bun` to avoid bun:sqlite type errors)

```bash
bunx --bun auth@latest generate   # Generate auth schema SQL
bunx --bun auth@latest migrate    # Apply auth migrations
```

## Architecture

- **App Router**: Pages in `app/`, API route handlers in `app/api/.../route.ts`
- **Path alias**: `@/*` maps to project root (configured in `tsconfig.json`)
- **Database**: Single SQLite file at `data/app.db`, accessed via Bun's built-in SQLite client
- **Auth**: better-auth manages its own tables (`user`, `session`, `account`, `verification`) — do not manually define or migrate them
- **Application tables**: `notes` table with `user_id` foreign key to `user(id)` — all queries must scope by `user_id`
- **Key modules** (per spec): `lib/db.ts` (DB helpers), `lib/notes.ts` (note repository), `lib/auth.ts` (auth config)

## Environment Variables

Copy `.env.example` to `.env`:

- `BETTER_AUTH_SECRET` — must be 32+ characters
- `DB_PATH` — path to SQLite database file (default: `data/app.db`)
