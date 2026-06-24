---
name: Clerk Auth setup
description: Clerk auth is fully integrated — server middleware, React ClerkProvider, sign-in/sign-up pages, per-user progress in DB.
---

# Clerk Auth

**Status:** Fully set up (Replit-managed, `not_configured` → `managed`).

**Why:** User requested proper login/sign-up with database.

**How to apply:** Auth is cookie-based on web. Do NOT add Bearer tokens or `setAuthTokenGetter` in web code — only for Expo/mobile.

## Key decisions

- `publishableKeyFromHost` from `@clerk/react/internal` — never raw env var.
- `clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL` — unconditional, no NODE_ENV gate.
- Routes: `/sign-in/*?` and `/sign-up/*?` — the `/*?` is required verbatim for Clerk OAuth sub-paths.
- CSS: `@layer theme, base, clerk, components, utilities;` before `@import 'tailwindcss'` in index.css.
- Vite: `tailwindcss({ optimize: false })` — prevents Clerk theme breaking in prod builds (Tailwind v4).
- Landing page at `/` is public; authenticated users redirect to `/dashboard`.
- Progress routes (`GET/POST /progress`) are protected with `requireAuth` middleware.
- `userProgressTable` and `activityLogTable` now have `userId text` column (nullable, pushed via `push-force`).
- `getOrCreateProgress(userId)` filters by userId — each user gets their own progress row.
