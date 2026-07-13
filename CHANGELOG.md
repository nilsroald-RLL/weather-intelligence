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

### Added

- Next.js (App Router) application scaffold with TypeScript, Tailwind CSS, ESLint,
  and Prettier, plus stricter compiler settings
  (`noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`).
- Environment schema (Zod) validated at server startup via `src/instrumentation.ts`,
  covering every variable in `.env.example`.
- Supabase migration tooling (`supabase/config.toml`) and the first migration,
  creating the `locations` table.

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

[Unreleased]: https://github.com/nilsroald-RLL/weather-intelligence/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/nilsroald-RLL/weather-intelligence/releases/tag/v0.1.0
