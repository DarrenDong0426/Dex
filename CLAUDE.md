
# Dex — project context for Claude Code

Dex is a personal, single-user multi-game (+ anime) profile / showcase web app.
It aggregates my Project Sekai stats (cards, music, events, stamps, honors) into
a themed profile page, with Genshin and an Anime tracker planned. It's a LEARNING
project — I write the code; assistants guide, scaffold, and review. Keep changes
scoped and don't touch working code unless asked.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- GraphQL via GraphQL Yoga (chosen over tRPC for learning)
- Prisma v7 + Postgres (Supabase)
- NO `src/` — `app/` is at the root; `@/` alias -> repo root (`./*`)
- Prisma client generated at `app/generated/prisma`; `lib/prisma.ts` wraps it
  with a driver adapter (PrismaPg + DATABASE_URL)

## Layout / conventions

- GraphQL endpoint: `app/api/graphql/route.ts` (Yoga; exports GET/POST/OPTIONS).
  ALL typeDefs + resolvers live in this ONE file. Resolvers import the `prisma`
  singleton directly (not via GraphQL context).
- Seeds: `app/api/seed/<name>/route.ts` — GET -> fetch master JSON -> idempotent
  upsert / createMany(skipDuplicates).
- Imports (user CSV): `app/api/import/<name>/route.ts` — POST -> `request.formData()`
  -> papaparse (header:true, skipEmptyLines) -> deleteMany + createMany.
  Test with `curl -F "file=@/path.csv" http://localhost:3000/api/import/<name>`
  (the `file=@` is mandatory).
- Master data from the EN mirror:
  `https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/<file>.json`
- Dates exposed as String (no DateTime scalar); render via `new Date(...)`.

## RECURRING GOTCHAS (hit these repeatedly — check first)

- **NEVER pass `DIRECT_URL` (or any URL you haven't independently verified is a
  separate, disposable database) as `--shadow-database-url` to any `prisma`
  command.** In this project (Supabase), `DIRECT_URL` and `DATABASE_URL` are
  the SAME live database — only the port differs (6543 pooled vs 5432 direct).
  `prisma migrate diff --shadow-database-url X` (and similar) treats X as fully
  disposable scratch space and will wipe it. This is exactly how the entire DB
  got nuked on 2026-08-15 (`migrate diff` run against `DIRECT_URL`, believed to
  be a throwaway shadow db, was actually prod). `prisma migrate dev` is safe by
  comparison — it auto-creates its own temp shadow db rather than using a given
  URL directly. Before running ANY unfamiliar prisma CLI invocation against
  this project, check what every URL argument actually points to first.
- **No backup safety net**: free-tier Supabase, no PITR, no automated backups.
  A live-DB mistake here is not recoverable except via whatever's independently
  re-derivable (external master data via `/api/seed/*`, HoYoLAB re-sync,
  locally-held CSVs/`.GOOD` files). Treat every live-DB-touching command as if
  there's no undo, because there isn't one. Run `./scripts/backup-db.sh
  <label>` before any risky schema/migration work — plain `pg_dump`
  (postgresql@17 via brew) against `DIRECT_URL`, dumps to `backups/`
  (gitignored). Manual habit only, no scheduled/automated trigger set up yet.
  Note: the DB password in `.env` contains a literal `@` — the script parses
  the URL into PG* env vars rather than passing it whole, since pg_dump's own
  URI parser splits on the first `@` and breaks otherwise.
- **Restart the dev server** after: adding a new `route.ts`, any `prisma migrate`,
  or any resolver/schema change. Turbopack caches the old Prisma client and old
  resolvers aggressively — `prisma.X does not exist` or stale data usually = needs
  restart.
- **Module/global caches**: several client components hold a module-level cache
  (e.g. `HONOR_CACHE`, `MUSIC_CACHE`) and the server caches some lists on
  `globalThis` (e.g. `__musicListCache`). After changing data, HARD-refresh the
  browser (Cmd/Ctrl+Shift+R) to clear the client cache. `__musicListCache` is
  ONLY busted by specific edit mutations, NOT by re-seeding or re-importing —
  after any bulk data change (reseed, CSV reimport, DB restore), restart the
  dev server too, or musicList will keep serving whatever it cached first.
- **New reference table an existing populated table must FK into = TWO migrations**:
  (1) create the reference model with no relations, migrate, seed; (2) add the
  relation both sides, migrate. One migration -> Postgres 23503 FK violation and
  the whole tx (incl. the CREATE) rolls back. Recovery from a P3018 wedge:
  `prisma migrate resolve --rolled-back <name>`, delete the migration folder, redo
  as two.
- **Adding a `@@unique` to a table that still has dup rows fails** (23505 -> P3018):
  resolve --rolled-back, empty the table, migrate, re-import with de-dup.
- **Adding a REQUIRED column to a table with rows fails** with no default — give it
  a `@default`.
- **createMany is all-or-nothing**: one undefined required field fails the whole
  batch and names the FIELD not the row. Diagnose by filtering offenders and
  returning them via a short-circuit Response.json before insert. TS types are
  compile-time only — verify field names/casing against the real JSON.
- **macOS case-insensitive FS**: creating `Profileclient.tsx` vs `ProfileClient.tsx`
  makes duplicate case-variants -> "differs only in casing" + stale `.next` cache.
  Fix: rm both, recreate ONE exact-case file, `rm -rf .next`, restart dev + TS
  server. Imports must match filename char-for-char.

## Data model (Sekai — all seeded/imported)

Tables: Profile, Card+Character (+UserCard, UserCharacter), Music (+UserMusicResult),
Event (+UserEvent), Stamp (+UserStamp), Honor (+UserHonor, +HonorGroup),
BondHonor (+UserBondHonor), AreaItem (+UserAreaItem), UserChallengeStage.

- **Character naming trap**: `firstName` = the Japanese-first name = SURNAME
  ("Hoshino"); `givenName` = given ("Ichika"). EN display = givenName + " " + firstName
  (e.g. "Ichika Hoshino" — given name FIRST). For self-hosted icons
  /public/chara/<given></given>.png the given name is the FIRST word of the display
  string (was wrongly documented/coded as "LAST word" until 2026-08-15 — that
  bug silently 404'd every character's face icon except the two mononyms,
  MEIKO/KAITO, since a one-word name's first/last word are the same thing).
  Virtual Singers (ids 21-26) were stored swapped and fixed in-DB.
- **Prisma accessor gotcha**: models are singular (`prisma.honor`, `prisma.userHonor`)
  BUT `UserBondHonors` is PLURAL -> `prisma.userBondHonors`. A wrong accessor throws
  and blanks the whole GraphQL response.
- Image URLs: build from `assetbundleName` at render, don't store URLs. Cards use
  the JP bucket (`storage.sekai.best/sekai-jp-assets/...`); music jackets + stamps +
  honors use EN (`sekai-en-assets`). next.config remotePatterns needs
  `storage.sekai.best`.

## App structure

- `app/games.ts` — the entries array. Each entry has `kind: "game" | "anime"`,
  theme vars, and a `sections` list. Entries: sekai (game), genshin (game, not
  built), anime (anime, not built). "Creations" is the renamed "Projects" section.
- `app/ProfileClient.tsx` — the profile shell (banner, sidebar, folder-tabs,
  SummaryCard) + section components. BEING MODULARIZED into `app/profile/`:
  - `app/profile/types.ts` — shared types + constants
  - `app/profile/images.ts` — all Sekai asset URL builders + rank/pip helpers
  - `app/profile/StampsSection.tsx` — extracted (template for the rest)
  - still inline in ProfileClient: Cards, Music, Events, Honors, Summary — extract
    these one at a time, verbatim, verifying each compiles.
- `app/admin/` — no-code admin page (OTP-gated):
  - `page.tsx` (server gate), `auth.ts` (OTP + Resend + DB session),
    `actions.ts` (server actions + cookie), `AdminLogin.tsx`, `AdminDashboard.tsx`
    (entry->section shell), `editors/CharactersEditor.tsx` (first editor).
  - Auth: Resend emails a 6-digit code to `ADMIN_EMAIL` only; `AdminOtp` +
    `AdminSession` Prisma models; httpOnly cookie `dex_admin`.
  - Env: `RESEND_API_KEY`, `ADMIN_EMAIL`, `RESEND_FROM`.
  - Editors write via GraphQL mutations in route.ts (first: setCharacterEdit —
    upserts UserCharacter favoriteTier/characterRank; needs characterId @unique).

## DO NOT TOUCH without being asked

- The Summary KizunaGrid (grid-cols-2 sm:3 lg:5, bordered cells) — repeatedly
  broken by unrequested edits.
- Honor render logic — hard-won (SVG viewBox 0 0 380 80, per-type paths for
  character / event / World Link / memorial / bond). Don't "simplify" it.

## Working style

- I write the code; guide and scaffold, don't dump finished implementations to paste
  wholesale unless asked. Prefer finding WHY a bug exists (inspect real data / DOM)
  over patching symptoms. Keep edits scoped; if something works, leave it alone.
  Don't change unrequested things.
