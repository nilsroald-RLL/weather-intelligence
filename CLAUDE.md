# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.
Read this file before making changes. It captures the intent, the hard rules,
and the working method for this project.

## What this project is

A small, private, mobile-first web application that produces a customised weather
forecast for exactly two fixed locations in Norway. It combines forecasts from
Yr / MET Norway and Storm, compares earlier forecasts against actual observed
weather, and gradually learns which source performs best per location, weather
variable, season, and forecast horizon.

It is a personal and family tool. It is not, at least initially, a public
commercial service. Keep it focused on the two properties rather than building a
general weather platform.

The two locations are:

- **Leiligheten** (the apartment): Kongsveien 83C, Oslo
- **Hytta** (the cabin): Moltmyrvegen 39, Øyer

## The core question the app answers

Based on how Yr and Storm have historically performed at this exact location and
forecast horizon, what weather is most likely to occur?

## Hard rules (never break these)

These come directly from the specification and are non-negotiable:

1. Never overwrite a historical forecast snapshot with a newer forecast.
2. Never calculate long-range accuracy using a recent forecast. A genuine
   seven-day evaluation must use a snapshot created roughly seven days earlier.
3. Never treat missing data as zero. Missing precipitation is not the same as no
   precipitation.
4. Never invent or fabricate Storm access, API responses, or weather-station
   choices. If access cannot be completed, state the exact blocker and provide a
   mock adapter instead.
5. Never bypass authentication, access controls, rate limits, or technical
   protections. No covert scraping or circumvention.
6. Never claim a model is more accurate without out-of-sample evidence.
7. Never hide provider or observation-data problems. Fail visibly and record a
   data-quality event.
8. Prefer transparent calculations over unjustified complexity. Start with clear
   statistical methods. Introduce machine learning only when enough history
   exists and it beats simple baselines out of sample.

## Guiding principles

- The whole app must work with Yr only. Storm being unavailable must never break
  anything.
- Do not present false precision. Round sensibly in the UI and be explicit when
  confidence is low or data is insufficient.
- Keep raw provider data and normalised data separate. Validate every external
  response before normalising it.
- Keep provider-specific parsing out of UI components. It belongs in the provider
  adapters.
- All scheduled jobs must be idempotent and must run independently of anyone
  opening the app.
- Store timestamps in UTC, display them in Europe/Oslo.
- Secrets stay server-side. Never expose Frost credentials, provider secrets, the
  Supabase service-role key, or private endpoint tokens.

## Tech stack

- Next.js (App Router), TypeScript, React, Tailwind CSS
- shadcn/ui (or a similarly lightweight component set)
- Recharts (or another accessible chart library)
- Supabase (Postgres, auth, storage)
- Zod for external API validation, strict TypeScript
- Vitest or Jest for unit tests, Playwright for core end-to-end flows
- Scheduled jobs via Vercel Cron, Supabase scheduled functions, or GitHub Actions
  for an early prototype

Use this stack unless the repository or environment strongly suggests otherwise.

## Repository layout

See `docs/architecture.md` for the full structure. In short:

- `src/app` and `src/components` for the UI
- `src/lib/weather/**` for providers, observations, normalisation, evaluation,
  ensemble, confidence, stations, units, and time helpers
- `src/jobs/**` for ingestion, evaluation, and custom-forecast building
- `src/db` and `src/types` for data access and shared types

## Working method

Before writing large amounts of application code:

1. Inspect the current repository state and summarise it.
2. Identify missing prerequisites (credentials, decisions).
3. Follow the phased plan in `docs/implementation-plan.md` and the tasks in
   `docs/backlog.md`.
4. Build incrementally. Run tests after each major phase.
5. Document assumptions and unresolved issues as you go.

When external data access cannot be completed, deliver: the exact blocker, the
evidence gathered, a mock adapter, and the next concrete action required.

## The UI language

The initial UI is in Norwegian. Keep documentation and code comments in English.
Common labels: Nå, I dag, Time for time, 7 dager, Treffsikkerhet, Yr, Storm,
Snitt, Tilpasset, Sikkerhet, Sist oppdatert, Faktisk vær, Varslet, Avvik.

## Versioning and the release ritual

The project ships one versioned iteration at a time. See `docs/roadmap.md` for the
full version plan. Versioning is semantic-style: MINOR bumps are the normal unit of
progress (for example 0.5.0 to 0.6.0), PATCH bumps are small fixes, and 1.0.0 is the
accepted MVP.

At the end of every iteration, follow this ritual so the repository stays clean and
the next developer can pick up easily:

1. Work on a branch named for the version, for example
   `feature/v0.6-matching-and-horizons`.
2. Build in small, focused commits, with tests alongside the code.
3. Add a new version heading to `CHANGELOG.md` describing what changed.
4. Tick the completed items in `docs/backlog.md`.
5. Move the "Current version" and "Status" lines in `README.md` forward.
6. Write or update any matching methodology doc under `docs/`.
7. Open a pull request, review the diff, and merge to main.
8. Tag the release (`git tag v0.6.0` then `git push --tags`).

Do not skip the changelog, backlog, and README updates. They are part of finishing
an iteration, not optional extras.

## Where to look

- `docs/product-spec.md` is the full, authoritative specification.
- `docs/roadmap.md` is the versioned roadmap and release ritual.
- `docs/architecture.md` covers the architecture decisions and data model.
- `docs/implementation-plan.md` covers the phases and the first vertical slice.
- `docs/backlog.md` is the staged task list.
- `CHANGELOG.md` is the history of what changed in each version.
