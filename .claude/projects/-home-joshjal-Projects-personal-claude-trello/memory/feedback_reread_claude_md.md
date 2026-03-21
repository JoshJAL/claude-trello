---
name: Always re-read CLAUDE.md before starting work
description: User explicitly corrected me for working from a stale CLAUDE.md — must re-read the full file before any implementation
type: feedback
---

Always re-read CLAUDE.md in full before starting any implementation work. The spec changes frequently and working from a cached/stale version leads to entirely wrong implementations.

**Why:** I implemented Phase 2 using SQLite/better-sqlite3 when the spec had changed to Turso/libSQL + Drizzle ORM. The user had to stop me and undo work.

**How to apply:** At the start of every task, read the full CLAUDE.md before writing any code. If the file is large, read it in chunks but cover every line. Never assume the spec hasn't changed since the last conversation.
