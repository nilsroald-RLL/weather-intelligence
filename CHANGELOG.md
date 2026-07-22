# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses
semantic-style versioning as described in `docs/roadmap.md`.

Each iteration adds a new version heading. Group entries under Added, Changed,
Fixed, or Removed. Keep entries short and written for a human reading the history
later.

## [Unreleased]

Work in progress toward the next version. Move items up into a dated version heading
when the iteration ships.

## [0.2.0] - 2026-07-22

### Added

- Next.js (App Router) application scaffold with TypeScript, Tailwind CSS, ESLint,
  and Prettier, plus stricter compiler settings
  (`noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
- Environment schema (Zod) validated at server startup via `src/instrumentation.ts`,
  covering every variable in `.env.example`.
- Supabase migration tooling (`supabase/config.toml`) and the first migration,
  creating the `locations` table.
- shadcn/ui component system (base library, Nova preset), with Button, Card, and
  Input wired into the placeholder home page and the sign-in form.
- Seed migration for Leiligheten and Hytta with coordinates from OpenStreetMap
  Nominatim and elevation from the EU-DEM 25m dataset.
- Vitest with a smoke test for the environment schema, and Playwright with smoke
  tests for the home page and the authentication flow.
- The dev and start scripts bind to `127.0.0.1` instead of all interfaces, to
  avoid a Windows Firewall prompt on machines without admin rights.
- Email-and-password sign-in via Supabase Auth (`signInWithPassword`), gated by an
  `approved_emails` allow-list so only pre-approved addresses can ever sign in.
- `npm run auth:sync-users` to provision approved addresses as Supabase auth users,
  and `npm run auth:set-password` to set a user's password interactively, with
  input hidden and never written to disk or shell history.
- Row-level security and the matching Data API grants for `approved_emails`
  (service-role only) and `locations` (authenticated read, service-role write) —
  Supabase does not auto-expose newly created tables to the Data API roles, so the
  explicit `grant` statements are required alongside the RLS policies.
- A guarded `/admin` page with sign-out, and `src/proxy.ts` (Next.js 16's renamed
  middleware convention) enforcing the guard and refreshing the session.

## [0.1.0] - 2026-07-11

### Added

- Project repository and documentation foundation.
- `CLAUDE.md` with the hard rules, guiding principles, tech stack, and the working
  method and release ritual for AI assistants.
- `README.md` with purpose, setup, environment variables, job schedule, and known
  limitations.
- `docs/product-spec.md`, the full product and technical specification.
- `docs/architecture.md` with architecture decision records, repository layout, and
  the data model.
- `docs/implementation-plan.md` with the delivery phases and the first vertical
  slice.
- `docs/backlog.md`, the staged task list.
- `docs/roadmap.md` with the versioned roadmap, strategy, and release ritual.
- `.env.example` environment template and `.gitignore`.

[Unreleased]: https://github.com/nilsroald-RLL/weather-intelligence/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nilsroald-RLL/weather-intelligence/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nilsroald-RLL/weather-intelligence/releases/tag/v0.1.0
